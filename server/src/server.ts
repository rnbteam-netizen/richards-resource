// Richard's Resource — standalone public server.
// Serves the built client from client/dist/ and exposes:
//   GET  /health          -> {"status":"ok"}
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
