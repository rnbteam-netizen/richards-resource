// Server actions for the public Richard's Resource app.
// Ported verbatim in behaviour from the Muse-hosted app
// (server/src/actions.ts, 2026-11-10), with two changes only:
//  1. No Hatch SDK: plain functions taking a Postgres pool and a
//     deviceId, validated by the HTTP layer in server.ts.
//  2. Every query/upsert/dedupe is scoped by deviceId — an anonymous
//     UUID from the visitor's own browser. No visitor can see or
//     overwrite another visitor's data.
//
// Queries are parameterized raw SQL against the pool (real Neon
// Postgres in production, pg-mem in-memory Postgres locally — the
// exact same SQL and parameters in both). The table definitions live
// in schema.ts (drizzle-orm/pg-core) and drizzle/0001_public.sql.
// Drizzle's query builder was NOT used for execution: its
// node-postgres driver issues prepared queries with rowMode "array",
// which pg-mem (the local, no-account verification database) does
// not support — raw SQL keeps one verified code path for both.
import { z } from "zod";

export type PoolLike = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};
export type Db = PoolLike;

export const categoryEnum = z.enum(["alcohol", "smoking", "gambling", "drugs", "codependency"]);
export const pointTabEnum = z.enum(["home", "alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing"]);
export const pointActionEnum = z.enum(["welcome", "touch", "field", "quitDate", "daySuccess", "relapse", "pause", "plan", "log", "screening", "slotLesson", "phoneFree", "checkin", "screenOff"]);
export const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const deviceIdSchema = z.string().uuid();

// Point values live on the server so the award is decided here, not by
// the client. Richard's system (2026-11-10): no maximum total, one
// running score across every tab — +10 for downloading the app
// (welcome), +1 per finger touch (batched via awardTouches), +5 per
// data field (batched via awardFields), +50 for picking a quit date,
// +100 for each successful day after it, and −100 for a relapse. Plus
// +10 on the Screens tab when the user says, on their own word,
// "I turned my screen off" — self-assessment, better than nothing;
// the server can't and doesn't try to verify a screen turning off.
// The older action values stay only so historical rows keep their meaning.
export const POINT_VALUES: Record<z.infer<typeof pointActionEnum>, number> = {
  welcome: 10,
  touch: 1,
  field: 5,
  quitDate: 50,
  daySuccess: 100,
  relapse: -100,
  pause: 10,
  plan: 15,
  log: 10,
  screening: 20,
  slotLesson: 10,
  phoneFree: 5,
  checkin: 15,
  screenOff: 10,
};

const profileShape = z.object({
  category: categoryEnum,
  quitDate: z.string().nullable(),
  dailyCost: z.number().nullable(),
  dailyAmount: z.string().nullable(),
  planText: z.string().nullable(),
  supportName: z.string().nullable(),
  supportPhone: z.string().nullable(),
});

const logShape = z.object({
  id: z.number(),
  category: categoryEnum,
  kind: z.enum(["urge", "boundary", "note"]),
  trigger: z.string().nullable(),
  intensity: z.number().nullable(),
  note: z.string().nullable(),
  rodeItOut: z.boolean().nullable(),
  createdAt: z.string(),
});

const pointEventShape = z.object({
  id: z.number(),
  tab: pointTabEnum,
  action: pointActionEnum,
  points: z.number(),
  day: z.string().nullable(),
  createdAt: z.string(),
});

const dayMarkShape = z.object({
  tab: pointTabEnum,
  action: z.enum(["daySuccess", "relapse"]),
  day: z.string(),
});

export const stateResponse = z.object({
  profiles: z.array(profileShape),
  logs: z.array(logShape),
  pointsByTab: z.array(z.object({ tab: pointTabEnum, points: z.number() })),
  pointEvents: z.array(pointEventShape),
  welcomeAwarded: z.boolean(),
  dayMarks: z.array(dayMarkShape),
});

export const awardResponse = z.object({ ok: z.literal(true), points: z.number(), already: z.boolean() });

// Request schemas — validated in server.ts before any handler runs.
export const requestSchemas = {
  getState: z.object({}),
  awardPoints: z.object({
    tab: pointTabEnum,
    action: pointActionEnum,
    day: dayString.nullable().optional(),
  }),
  awardTouches: z.object({ tab: pointTabEnum, count: z.number().int().min(1).max(200) }),
  awardFields: z.object({ tab: pointTabEnum, count: z.number().int().min(1).max(20) }),
  saveProfile: z.object({
    category: categoryEnum,
    quitDate: z.string().nullable().optional(),
    dailyCost: z.number().min(0).max(100000).nullable().optional(),
    dailyAmount: z.string().max(120).nullable().optional(),
    planText: z.string().max(2000).nullable().optional(),
    supportName: z.string().max(120).nullable().optional(),
    supportPhone: z.string().max(40).nullable().optional(),
  }),
  addLog: z.object({
    category: categoryEnum,
    kind: z.enum(["urge", "boundary", "note"]).default("urge"),
    trigger: z.string().max(120).nullable().optional(),
    intensity: z.number().int().min(1).max(10).nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
    rodeItOut: z.boolean().nullable().optional(),
  }),
  deleteLog: z.object({ id: z.number().int().positive() }),
} as const;

export type ActionName = keyof typeof requestSchemas;

const toIso = (d: unknown): string => {
  if (d instanceof Date) return d.toISOString();
  return new Date(String(d)).toISOString();
};

export async function getState(db: Db, deviceId: string): Promise<z.infer<typeof stateResponse>> {
  const prof = await db.query(
    `SELECT category, quit_date, daily_cost, daily_amount, plan_text, support_name, support_phone
     FROM profiles WHERE device_id = $1`, [deviceId]);
  const logs = await db.query(
    `SELECT id, category, kind, trigger, intensity, note, rode_it_out, created_at
     FROM logs WHERE device_id = $1 ORDER BY id DESC LIMIT 100`, [deviceId]);
  const allPoints = await db.query(
    `SELECT action FROM points WHERE device_id = $1`, [deviceId]);
  const totalsRows = await db.query(
    `SELECT tab, SUM(points)::int AS total FROM points WHERE device_id = $1 GROUP BY tab`, [deviceId]);
  const totalsByTab = new Map<string, number>();
  for (const r of totalsRows.rows) totalsByTab.set(String(r.tab), Number(r.total));
  const welcomeAwarded = allPoints.rows.some((r) => r.action === "welcome");
  const recent = await db.query(
    `SELECT id, tab, action, points, day, created_at FROM points
     WHERE device_id = $1 ORDER BY id DESC LIMIT 30`, [deviceId]);
  const marks = await db.query(
    `SELECT tab, action, day FROM points
     WHERE device_id = $1 AND action IN ('daySuccess','relapse') AND day IS NOT NULL
     ORDER BY id DESC LIMIT 800`, [deviceId]);
  return {
    profiles: prof.rows.map((r) => ({
      category: r.category as z.infer<typeof categoryEnum>,
      quitDate: (r.quit_date as string | null) ?? null,
      dailyCost: (r.daily_cost as number | null) ?? null,
      dailyAmount: (r.daily_amount as string | null) ?? null,
      planText: (r.plan_text as string | null) ?? null,
      supportName: (r.support_name as string | null) ?? null,
      supportPhone: (r.support_phone as string | null) ?? null,
    })),
    logs: logs.rows.map((r) => ({
      id: Number(r.id),
      category: r.category as z.infer<typeof categoryEnum>,
      kind: r.kind as "urge" | "boundary" | "note",
      trigger: (r.trigger as string | null) ?? null,
      intensity: (r.intensity as number | null) ?? null,
      note: (r.note as string | null) ?? null,
      rodeItOut: (r.rode_it_out as boolean | null) ?? null,
      createdAt: toIso(r.created_at),
    })),
    pointsByTab: [...totalsByTab.entries()].map(([tab, pts]) => ({
      tab: tab as z.infer<typeof pointTabEnum>,
      points: pts,
    })),
    pointEvents: recent.rows.map((r) => ({
      id: Number(r.id),
      tab: r.tab as z.infer<typeof pointTabEnum>,
      action: r.action as z.infer<typeof pointActionEnum>,
      points: Number(r.points),
      day: (r.day as string | null) ?? null,
      createdAt: toIso(r.created_at),
    })),
    welcomeAwarded,
    dayMarks: marks.rows.map((r) => ({
      tab: r.tab as z.infer<typeof pointTabEnum>,
      action: r.action as "daySuccess" | "relapse",
      day: String(r.day),
    })),
  };
}

async function exists(db: Db, sql: string, params: unknown[]): Promise<boolean> {
  const r = await db.query(sql, params);
  return r.rows.length > 0;
}

export async function awardPoints(
  db: Db, deviceId: string, args: z.infer<typeof requestSchemas.awardPoints>,
): Promise<z.infer<typeof awardResponse>> {
  const value = POINT_VALUES[args.action];
  const day = args.day ?? null;
  if (args.action === "welcome") {
    if (await exists(db, `SELECT 1 FROM points WHERE device_id = $1 AND action = 'welcome' LIMIT 1`, [deviceId])) {
      return { ok: true as const, points: 0, already: true };
    }
  }
  if (args.action === "quitDate") {
    if (!day) throw new Error("awardPoints: quitDate requires the quit date as `day`");
    if (await exists(db, `SELECT 1 FROM points WHERE device_id = $1 AND tab = $2 AND action = 'quitDate' AND day = $3 LIMIT 1`, [deviceId, args.tab, day])) {
      return { ok: true as const, points: 0, already: true };
    }
  }
  if (args.action === "daySuccess" || args.action === "relapse") {
    if (!day) throw new Error("awardPoints: daySuccess/relapse require the local day as `day`");
    if (await exists(db, `SELECT 1 FROM points WHERE device_id = $1 AND tab = $2 AND action = $3 AND day = $4 LIMIT 1`, [deviceId, args.tab, args.action, day])) {
      return { ok: true as const, points: 0, already: true };
    }
    if (args.action === "daySuccess") {
      if (await exists(db, `SELECT 1 FROM points WHERE device_id = $1 AND tab = $2 AND action = 'relapse' AND day = $3 LIMIT 1`, [deviceId, args.tab, day])) {
        return { ok: true as const, points: 0, already: true };
      }
    }
  }
  await db.query(
    `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, $3, $4, $5)`,
    [deviceId, args.tab, args.action, value, day]);
  return { ok: true as const, points: value, already: false };
}

export async function awardTouches(
  db: Db, deviceId: string, args: z.infer<typeof requestSchemas.awardTouches>,
): Promise<z.infer<typeof awardResponse>> {
  await db.query(
    `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, 'touch', $3, NULL)`,
    [deviceId, args.tab, args.count]);
  return { ok: true as const, points: args.count, already: false };
}

export async function awardFields(
  db: Db, deviceId: string, args: z.infer<typeof requestSchemas.awardFields>,
): Promise<z.infer<typeof awardResponse>> {
  const points = args.count * POINT_VALUES.field;
  await db.query(
    `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, 'field', $3, NULL)`,
    [deviceId, args.tab, points]);
  return { ok: true as const, points, already: false };
}

export async function saveProfile(
  db: Db, deviceId: string, args: z.infer<typeof requestSchemas.saveProfile>,
): Promise<{ ok: true }> {
  await db.query(
    `INSERT INTO profiles (device_id, category, quit_date, daily_cost, daily_amount, plan_text, support_name, support_phone, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (device_id, category) DO UPDATE SET
       quit_date = EXCLUDED.quit_date, daily_cost = EXCLUDED.daily_cost,
       daily_amount = EXCLUDED.daily_amount, plan_text = EXCLUDED.plan_text,
       support_name = EXCLUDED.support_name, support_phone = EXCLUDED.support_phone,
       updated_at = now()`,
    [deviceId, args.category, args.quitDate ?? null, args.dailyCost ?? null,
     args.dailyAmount ?? null, args.planText ?? null, args.supportName ?? null, args.supportPhone ?? null]);
  return { ok: true as const };
}

export async function addLog(
  db: Db, deviceId: string, args: z.infer<typeof requestSchemas.addLog>,
): Promise<{ id: number }> {
  const result = await db.query(
    `INSERT INTO logs (device_id, category, kind, trigger, intensity, note, rode_it_out)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [deviceId, args.category, args.kind, args.trigger ?? null, args.intensity ?? null,
     args.note ?? null, args.rodeItOut ?? null]);
  const inserted = result.rows[0];
  if (!inserted) throw new Error("addLog: insert returned no rows");
  return { id: Number(inserted.id) };
}

export async function deleteLog(
  db: Db, deviceId: string, args: z.infer<typeof requestSchemas.deleteLog>,
): Promise<{ ok: true }> {
  // Scoped by deviceId: a visitor can only delete their own log entries.
  await db.query(`DELETE FROM logs WHERE device_id = $1 AND id = $2`, [deviceId, args.id]);
  return { ok: true as const };
}

export const handlers = { getState, awardPoints, awardTouches, awardFields, saveProfile, addLog, deleteLog } as const;
