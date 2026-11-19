// Rate limiting for POST /actions (001 security fix, 2026-11-19).
//
// What it protects against: a script inventing unlimited anonymous
// device UUIDs and hammering /actions to ring up mass points and
// fake welcome devices — points have no monetary value, but the
// fake numbers would corrupt the /counts metrics Richard's tracking
// spreadsheet depends on, bloat the Neon database with junk rows,
// and, at flood volume, a DDoS-style assault on the castle that
// could slow or crash the site for real visitors. It does NOT
// protect against a distributed attack from many IPs — that is
// Cloudflare/Render's layer, not this server's — and it does not
// authenticate anyone: there is no login in this app, by design.
//
// Limits (sliding 60-second windows, in memory):
//   per device: 60 requests/minute
//   per IP:    180 requests/minute
// Why those numbers: a real visitor's client flushes touches at
// most once every 4 seconds (15/minute) and otherwise calls
// /actions a few times a minute — getState on load, one award per
// tap, the Happy Button's 8 taps in a burst. 60/device is roughly
// 4x a busy human; 180/IP covers a household or a clinic Wi-Fi
// with several phones behind one address. A script doing
// hundreds of calls a second hits the wall in under a second.
// A slow drip (under the limits) is still possible, but at
// 180/minute from one IP it can no longer fake thousands of
// downloads in minutes, and the once-a-day unique indexes in
// drizzle/0001_public.sql stop it re-awarding the same device.
//
// In-memory, per process: counters reset on restart/redeploy, and
// if Render ever ran more than one instance each would enforce its
// own limits. That is acceptable for the Starter single instance.
// When the limit is hit the server answers 429 with a generic
// {"error":"Too many requests"} and a Retry-After header; it never
// returns a partial result. Legitimate visitors should never see
// it — if one ever does, the limits above are the first thing to
// revisit, not the app.
import type { NextFunction, Request, Response } from "express";

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_PER_DEVICE = 60;
export const RATE_LIMIT_PER_IP = 180;

type Bucket = number[];

function prune(bucket: Bucket, now: number): Bucket {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  while (bucket.length > 0) {
    const first = bucket[0];
    if (first === undefined || first > cutoff) break;
    bucket.shift();
  }
  return bucket;
}

export function createRateLimiter() {
  const byDevice = new Map<string, Bucket>();
  const byIp = new Map<string, Bucket>();

  function hit(map: Map<string, Bucket>, key: string, now: number, limit: number): boolean {
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    prune(bucket, now);
    if (bucket.length >= limit) return true;
    bucket.push(now);
    // Keep the maps bounded: drop keys that have gone quiet.
    if (map.size > 5000) {
      for (const [k, b] of map) {
        if (b.length === 0) map.delete(k);
        if (map.size <= 5000) break;
      }
    }
    return false;
  }

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const deviceId =
      req.body && typeof req.body === "object" && typeof (req.body as Record<string, unknown>).deviceId === "string"
        ? ((req.body as Record<string, unknown>).deviceId as string)
        : "unknown-device";
    // req.ip is the real client IP only because server.ts sets
    // trust proxy for Render's load balancer (which sets
    // X-Forwarded-For). Without that it would be the proxy's IP
    // and every visitor would share one bucket.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown-ip";
    if (hit(byDevice, deviceId, now, RATE_LIMIT_PER_DEVICE) || hit(byIp, ip, now, RATE_LIMIT_PER_IP)) {
      res.setHeader("Retry-After", "60");
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
