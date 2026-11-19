// Richard's Resource — standalone public server.
// Serves the built client from client/dist/ and exposes:
//   GET  /health          -> {"status":"ok"}
//   GET  /counts          -> {"welcomeDevices":N,"devicesSeen":M,"totalPoints":P}
//                            Aggregate counts only, for Richard — how
//                            many distinct anonymous devices claimed the
//                            +10 welcome points, how many distinct
//                            anonymous devices have any points at all,
//                            and the sum of all points in the points
//                            table (totalPoints, an engagement measure:
//                            it rises when people actually use the app).
//                            No device ids, no rows, no personal data.
//                            Anyone who guesses the URL sees just those
//                            three numbers. Not shown in the app UI.
//   POST /actions         -> {action, deviceId, args} dispatches one of
//                            the 7 actions in actions.ts, with Zod
//                            validation. The point values live on the
//                            server (see actions.ts), never in the client.
// Listens on process.env.PORT (Render injects it); defaults to 3000
// locally. Never hard-code a port.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { createDb, migrate } from "./db.js";
import { deviceIdSchema, handlers, requestSchemas, type ActionName } from "./actions.js";
import { createRateLimiter } from "./rateLimit.js";

const app = express();
app.disable("x-powered-by");
// Render terminates TLS and sets X-Forwarded-For; trust that one
// proxy hop so req.ip is the real visitor IP (the rate limiter in
// rateLimit.ts keys per-IP buckets off it — without this, every
// visitor would share the proxy's IP and one bucket).
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));

// Security headers (001 security fix, 2026-11-19). No new
// dependency — plain headers, set on every response including
// the static client. Kept deliberately permissive where the app
// needs it: style-src allows 'unsafe-inline' (React/Tailwind
// inline styles), img-src allows data: (bundled images), and
// nothing external is loaded at all — the app fetches only its
// own origin, the donation/help links are plain navigations, not
// embeds. HSTS is ignored by browsers over plain http, so it is
// harmless on a local dev server and live on Render's https.
app.use((_req: Request, res: Response, next: () => void) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
  next();
});

// Rate limiting, POST /actions only (001 security fix, 2026-11-19):
// 60/minute per anonymous device, 180/minute per IP — see
// rateLimit.ts for why those numbers. /health and /counts are
// cheap reads and are not limited; the static client is not
// limited either, so a limit can never block someone loading the
// app, only hammering the write API.
const actionsRateLimit = createRateLimiter();
app.use("/actions", actionsRateLimit);

const db = createDb();

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Private, anonymous download count (Richard, 2026-11-16): the app is
// web-only, no app store, no analytics, no accounts — nobody counts
// downloads for us. The closest honest proxy already in the database:
// distinct anonymous device_ids that claimed the +10 welcome points
// (action='welcome', server-enforced once per device in actions.ts).
// That counts distinct phones/browsers that opened the app, including
// Richard and testers. Two aggregate numbers only — no device ids, no
// rows, no personal data of any kind. Placed before the static-client
// catch-all below, so the SPA fallback does not swallow it.
app.get("/counts", async (_req: Request, res: Response) => {
  try {
    const welcome = await db.query(
      `SELECT COUNT(DISTINCT device_id) AS n FROM points WHERE action = 'welcome'`,
    );
    const seen = await db.query(
      `SELECT COUNT(DISTINCT device_id) AS n FROM points`,
    );
    // Total points (Richard, 2026-11-17): sum of the points column —
    // welcome +10, +1 per touch, +5 per field, +50 per quit date,
    // +100 per successful day / daily check-in, −100 per relapse.
    // Net sum, so a relapse lowers it. Counting really starts from
    // the Neon fix on 2026-11-17; anything before that is gone.
    const total = await db.query(
      `SELECT COALESCE(SUM(points), 0) AS n FROM points`,
    );
    res.json({
      welcomeDevices: Number(welcome.rows[0]?.n ?? 0),
      devicesSeen: Number(seen.rows[0]?.n ?? 0),
      totalPoints: Number(total.rows[0]?.n ?? 0),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[counts] failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Count unavailable" });
  }
});

const actionBody = z.object({
  action: z.string(),
  deviceId: deviceIdSchema,
  args: z.record(z.string(), z.unknown()).default({}),
});

app.post("/actions", async (req: Request, res: Response) => {
  const parsed = actionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const { action, deviceId, args } = parsed.data;
  const schema = (requestSchemas as Record<string, z.ZodType>)[action];
  const handler = (handlers as Record<string, (db: unknown, deviceId: string, args: never) => Promise<unknown>>)[action];
  if (!schema || !handler) {
    res.status(400).json({ error: `Unknown action: ${action}` });
    return;
  }
  const argsParsed = schema.safeParse(args);
  if (!argsParsed.success) {
    res.status(400).json({ error: "Invalid arguments", details: argsParsed.error.flatten() });
    return;
  }
  try {
    const result = await handler(db, deviceId, argsParsed.data as never);
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[actions] ${action} failed:`, err instanceof Error ? err.message : err);
    // Generic error only (001 security fix, 2026-11-19): the
    // detail stays in the server log, never in the response —
    // the old code returned err.message, which could leak
    // database internals to any caller.
    res.status(500).json({ error: "Action failed" });
  }
});

// Static client (built by `npm run build:client` into client/dist).
// In source layout the dist folder is ../client/dist relative to
// server/src; in the built layout it is ../client/dist relative to
// dist-server. Try both, plus the cwd.
import { existsSync } from "node:fs";
const here = dirname(fileURLToPath(import.meta.url));
const distCandidates = [
  join(process.cwd(), "client", "dist"),
  join(here, "..", "client", "dist"),
  join(here, "..", "..", "client", "dist"),
];
const distDir = distCandidates.find((d) => existsSync(join(d, "index.html")));
if (distDir) {
  app.use(express.static(distDir, { maxAge: "1h" }));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(join(distDir, "index.html"));
  });
} else {
  // eslint-disable-next-line no-console
  console.warn("[server] client/dist not found — run `npm run build:client` first. /health and /actions still work.");
}

const port = Number(process.env.PORT ?? 3000);
migrate(db).then(() => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Richard's Resource listening on port ${port}`);
  });
}).catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[server] database migration failed:", err);
  process.exit(1);
});

export type { ActionName };
