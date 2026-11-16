// Richard's Resource — standalone public server.
// Serves the built client from client/dist/ and exposes:
//   GET  /health          -> {"status":"ok"}
//   GET  /counts          -> {"welcomeDevices":N,"devicesSeen":M}
//                            Aggregate counts only, for Richard — how
//                            many distinct anonymous devices claimed the
//                            +10 welcome points, and how many distinct
//                            anonymous devices have any points at all.
//                            No device ids, no rows, no personal data.
//                            Anyone who guesses the URL sees just those
//                            two numbers. Not shown in the app UI.
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

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

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
    res.json({
      welcomeDevices: Number(welcome.rows[0]?.n ?? 0),
      devicesSeen: Number(seen.rows[0]?.n ?? 0),
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
    res.status(500).json({ error: err instanceof Error ? err.message : "Action failed" });
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
