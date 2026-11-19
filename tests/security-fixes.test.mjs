// 001 security fixes (Richard, 2026-11-19 — "stop assaults on
// the castle"): rate limiting on POST /actions, atomic once-a-day
// awards via unique indexes, generic 500 errors, security headers.
// Spawns the built server (dist-server/server.js) with no
// DATABASE_URL, so it uses the in-memory Postgres fallback — the
// same SQL as production, no account, no card, no network.
// The flood test below is the point of the exercise: a script
// inventing device UUIDs and hammering /actions must hit a wall
// fast, while a real visitor tapping at human speed never does.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { newDb } from "pg-mem";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(path.join(root, "drizzle", "0001_public.sql"), "utf8");
const serverSrc = readFileSync(path.join(root, "server", "src", "server.ts"), "utf8");
const actionsSrc = readFileSync(path.join(root, "server", "src", "actions.ts"), "utf8");

test("security: migration carries the two partial unique indexes, and no second CHECK block", () => {
  assert.ok(sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS points_once_per_day_uidx"),
    "migration must add the once-a-day unique index");
  assert.ok(sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS points_welcome_uidx"),
    "migration must add the welcome unique index");
  assert.ok(sql.includes("WHERE day IS NOT NULL AND action IN ('quitDate','dailyCheckin','quietMoment','daySuccess','relapse')"),
    "once-a-day index must be partial to the once-a-day actions — happyMoment repeats 8/day and must not be caught");
  assert.ok(sql.includes("WHERE action = 'welcome'"),
    "welcome index must be partial to welcome — its day is NULL");
  // The 2026-11-18 lesson, still pinned: exactly one widening
  // block per CHECK, never a second, narrower one.
  assert.equal((sql.match(/ADD CONSTRAINT points_action_check/g) ?? []).length, 1,
    "adding the indexes must not add a second action CHECK block");
  assert.equal((sql.match(/ADD CONSTRAINT points_tab_check/g) ?? []).length, 1,
    "adding the indexes must not add a second tab CHECK block");
  assert.ok(serverSrc.includes('res.status(500).json({ error: "Action failed" })'),
    "/actions 500 must return only the generic text");
  assert.ok(!serverSrc.includes("json({ error: err"),
    "server.ts must never put err into a response body — the detail stays in the server log only");
  assert.ok(actionsSrc.includes('code === "23505"'),
    "awardPoints must catch the unique-violation code and report the loser as already-paid");
});

test("security: unique indexes enforce once-a-day in a fresh database, and leave happyMoment/touch alone", async () => {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const db = new Pool();
  await db.query(sql);
  const insert = async (device, tab, action, day) => {
    try {
      await db.query(
        `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, $3, 10, $4)`,
        [device, tab, action, day],
      );
      return "ok";
    } catch (err) {
      return err.code;
    }
  };
  assert.equal(await insert("d1", "home", "dailyCheckin", "2026-11-19"), "ok");
  assert.equal(await insert("d1", "home", "dailyCheckin", "2026-11-19"), "23505",
    "a second dailyCheckin for the same device and day must be rejected by the index");
  assert.equal(await insert("d1", "home", "dailyCheckin", "2026-11-20"), "ok",
    "the next day must still pay");
  assert.equal(await insert("d1", "home", "welcome", null), "ok");
  assert.equal(await insert("d1", "home", "welcome", null), "23505",
    "a second welcome for the same device must be rejected by the index");
  for (let i = 0; i < 3; i++) {
    assert.equal(await insert("d1", "home", "happyMoment", "2026-11-19"), "ok",
      "happyMoment must still repeat — the index must not catch it");
  }
  assert.equal(await insert("d1", "home", "touch", null), "ok");
  assert.equal(await insert("d1", "home", "touch", null), "ok",
    "touch rows with day NULL must still repeat");
  await db.end();
});

test("security: migration self-cleans duplicates before creating the indexes — no manual Neon check needed", async () => {
  // Boss 0075, 2026-11-19: "put the fix in" — the migration must
  // de-duplicate live Neon itself, so nobody has to run a manual
  // Neon check before pushing. Simulate a live database that
  // already holds duplicates: migrate fresh, drop the indexes,
  // insert the duplicates, then run only the self-cleaning
  // fragment (DELETEs + CREATE UNIQUE INDEX), extracted verbatim
  // from the SQL file so the test exercises the real statements.
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const db = new Pool();
  await db.query(sql);
  await db.query("DROP INDEX points_once_per_day_uidx");
  await db.query("DROP INDEX points_welcome_uidx");
  const insert = async (device, tab, action, day, points = 10) => {
    const r = await db.query(
      `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [device, tab, action, points, day],
    );
    return Number(r.rows[0].id);
  };
  const firstCheckin = await insert("d1", "home", "dailyCheckin", "2026-11-19", 100);
  await insert("d1", "home", "dailyCheckin", "2026-11-19", 100);
  await insert("d1", "home", "dailyCheckin", "2026-11-19", 100);
  const firstWelcome = await insert("d1", "home", "welcome", null, 10);
  await insert("d1", "home", "welcome", null, 10);
  const firstQuit = await insert("d1", "alcohol", "quitDate", "2026-11-18", 50);
  await insert("d1", "alcohol", "quitDate", "2026-11-18", 50);
  await insert("d1", "smoking", "quitDate", "2026-11-18", 50);
  await insert("d1", "home", "happyMoment", "2026-11-19", 10);
  await insert("d1", "home", "happyMoment", "2026-11-19", 10);
  await insert("d1", "home", "touch", null, 1);
  await insert("d1", "home", "touch", null, 1);
  await insert("d2", "home", "dailyCheckin", "2026-11-19", 100);

  const marker = "-- Self-cleaning duplicates — start";
  const at = sql.indexOf(marker);
  assert.ok(at >= 0, "the migration must carry the self-cleaning marker so the fragment can be extracted verbatim");
  const fragment = sql.slice(at);
  assert.ok(fragment.includes("DELETE FROM points"), "the fragment must contain the cleanup DELETEs");
  assert.ok(fragment.includes("CREATE UNIQUE INDEX IF NOT EXISTS points_once_per_day_uidx"),
    "the fragment must create the once-a-day index after cleaning");
  assert.ok(fragment.includes("CREATE UNIQUE INDEX IF NOT EXISTS points_welcome_uidx"),
    "the fragment must create the welcome index after cleaning");
  await db.query(fragment);

  const count = async (action, extra = "") =>
    Number((await db.query(`SELECT COUNT(*) AS c FROM points WHERE action = $1 ${extra}`, [action])).rows[0].c);
  assert.equal(await count("dailyCheckin"), 2,
    "after cleanup there must be one dailyCheckin per device — d1's two extras removed, d2's kept");
  assert.equal(await count("welcome"), 1, "after cleanup there must be exactly one welcome row");
  assert.equal(await count("quitDate"), 2,
    "after cleanup there must be one quitDate per tab — alcohol's duplicate removed, smoking's kept");
  assert.equal(await count("happyMoment"), 2,
    "happyMoment rows must NOT be cleaned up — they legitimately repeat");
  assert.equal(await count("touch"), 2,
    "touch rows must NOT be cleaned up — they legitimately repeat");
  const kept = await db.query("SELECT id, action FROM points WHERE action IN ('dailyCheckin','welcome','quitDate') ORDER BY id");
  assert.ok(kept.rows.some((r) => Number(r.id) === firstCheckin && r.action === "dailyCheckin"),
    "the cleanup must keep the earliest dailyCheckin row (lowest id)");
  assert.ok(kept.rows.some((r) => Number(r.id) === firstWelcome && r.action === "welcome"),
    "the cleanup must keep the earliest welcome row (lowest id)");
  assert.ok(kept.rows.some((r) => Number(r.id) === firstQuit && r.action === "quitDate"),
    "the cleanup must keep the earliest quitDate row (lowest id)");
  // The indexes must now exist and enforce: a fresh duplicate is rejected.
  const dup = await db.query(
    `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, $3, 10, $4)`,
    ["d1", "home", "dailyCheckin", "2026-11-19"],
  ).then(() => "ok", (err) => err.code);
  assert.equal(dup, "23505", "after the self-cleaning migrate, a duplicate dailyCheckin must be rejected by the index");
  // And the cleanup is idempotent: running the fragment again removes nothing.
  const before = Number((await db.query("SELECT COUNT(*) AS c FROM points")).rows[0].c);
  await db.query(fragment);
  const afterCount = Number((await db.query("SELECT COUNT(*) AS c FROM points")).rows[0].c);
  assert.equal(afterCount, before, "re-running the self-cleaning fragment on clean data must delete nothing");
  await db.end();
});

const PORT = 3461;
const BASE = `http://127.0.0.1:${PORT}`;
let proc;

async function waitForHealth() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not become healthy");
}

async function call(deviceId, action, args = {}) {
  const r = await fetch(`${BASE}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, deviceId, args }),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body, headers: r.headers };
}

before(async () => {
  proc = spawn(process.execPath, ["dist-server/server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });
  await waitForHealth();
});

after(() => { proc?.kill(); });

test("security: rate limit blocks a flood from one device, and a fresh device still works", async () => {
  const device = randomUUID();
  let blocked = 0;
  let okCount = 0;
  // 61 calls in a burst: the per-device limit is 60/minute, so
  // the 61st must be refused. A human never does this — touches
  // flush at most once every 4 seconds.
  for (let i = 0; i < 61; i++) {
    const res = await call(device, "getState", {});
    if (res.status === 429) {
      blocked++;
      assert.equal(res.body.error, "Too many requests");
      assert.ok(res.headers.get("retry-after"), "a 429 must say when to retry");
    } else {
      assert.equal(res.status, 200, `call ${i + 1} -> ${res.status}: ${JSON.stringify(res.body)}`);
      okCount++;
    }
  }
  assert.equal(okCount, 60, "exactly the first 60 calls must succeed");
  assert.equal(blocked, 1, "the 61st call must be rate-limited");
  // The same device is still blocked immediately after.
  const again = await call(device, "getState", {});
  assert.equal(again.status, 429, "the flooded device must stay blocked inside the window");
  // A different device on the same IP still works — the per-IP
  // limit (180/minute) is well above what this test has used.
  const fresh = await call(randomUUID(), "getState", {});
  assert.equal(fresh.status, 200, "a fresh device must not be punished for another device's flood");
});

test("security: ten simultaneous dailyCheckins pay once, and five simultaneous welcomes pay once", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const device = randomUUID();
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      call(device, "awardPoints", { tab: "home", action: "dailyCheckin", day: today })),
  );
  for (const res of results) assert.equal(res.status, 200, `dailyCheckin -> ${res.status}`);
  const paid = results.filter((r) => r.body.points === 100);
  const already = results.filter((r) => r.body.points === 0 && r.body.already === true);
  assert.equal(paid.length, 1, "exactly one of the ten simultaneous dailyCheckins must pay 100");
  assert.equal(already.length, 9, "the other nine must be reported already-paid, not errors");
  assert.equal(results.reduce((sum, r) => sum + r.body.points, 0), 100,
    "ten simultaneous calls must total 100, never 200 or 1,000");

  const welcomer = randomUUID();
  const welcomes = await Promise.all(
    Array.from({ length: 5 }, () =>
      call(welcomer, "awardPoints", { tab: "home", action: "welcome" })),
  );
  assert.equal(welcomes.filter((r) => r.body.points === 10).length, 1,
    "exactly one of five simultaneous welcomes must pay 10");
  assert.equal(welcomes.filter((r) => r.body.points === 0 && r.body.already === true).length, 4,
    "the other four welcomes must be already-paid");
});

test("security: a server error returns only the generic text, never internals", async () => {
  // quitDate without its day throws inside the handler — the
  // old code returned that message; the fix must not.
  const res = await call(randomUUID(), "awardPoints", { tab: "alcohol", action: "quitDate" });
  assert.equal(res.status, 500, `quitDate without a day -> ${res.status}`);
  assert.deepEqual(res.body, { error: "Action failed" },
    "a 500 must carry only the generic text");
  assert.ok(!JSON.stringify(res.body).includes("quitDate"),
    "a 500 must not leak the handler's own error wording");
});

test("security: security headers are set on the API and on the app", async () => {
  const api = await fetch(`${BASE}/health`);
  assert.equal(api.headers.get("x-frame-options"), "DENY");
  assert.equal(api.headers.get("x-content-type-options"), "nosniff");
  assert.ok((api.headers.get("strict-transport-security") ?? "").startsWith("max-age=31536000"),
    "HSTS must be set");
  assert.equal(api.headers.get("referrer-policy"), "no-referrer");
  const csp = api.headers.get("content-security-policy") ?? "";
  assert.ok(csp.includes("default-src 'self'"), "CSP must default to self only");
  assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must forbid framing");
  assert.ok(csp.includes("object-src 'none'"), "CSP must forbid plugins/objects");
  assert.ok(!csp.includes("unsafe-inline") || csp.includes("style-src 'self' 'unsafe-inline'"),
    "the only 'unsafe-inline' allowed is for styles, never for scripts");
  assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"),
    "scripts must never be allowed inline");
  const page = await fetch(`${BASE}/`);
  assert.equal(page.headers.get("x-frame-options"), "DENY",
    "the static app must carry the same headers");
});
