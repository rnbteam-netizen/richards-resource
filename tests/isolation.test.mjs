// Per-user isolation over HTTP: two different anonymous device ids
// must never see each other's profiles, logs, or points.
// Spawns the built server (dist-server/server.js) with no DATABASE_URL,
// so it uses the in-memory Postgres fallback — same Drizzle queries as
// production, no account, no card, no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = 3456;
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
  const body = await r.json();
  assert.equal(r.status, 200, `${action} -> ${r.status}: ${JSON.stringify(body)}`);
  return body;
}

before(async () => {
  proc = spawn(process.execPath, ["dist-server/server.js"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });
  await waitForHealth();
});

after(() => { proc?.kill(); });

test("two device ids cannot see each other's data", async () => {
  const a = randomUUID();
  const b = randomUUID();

  // A: welcome (+10), a quit profile, a log, some touches.
  const welcome = await call(a, "awardPoints", { tab: "home", action: "welcome" });
  assert.equal(welcome.points, 10);
  assert.equal(welcome.already, false);
  // Welcome is once per device — a second award for A returns already=true.
  const welcomeAgain = await call(a, "awardPoints", { tab: "home", action: "welcome" });
  assert.equal(welcomeAgain.already, true);
  assert.equal(welcomeAgain.points, 0);

  await call(a, "saveProfile", { category: "alcohol", quitDate: "2026-11-10", planText: "A's plan" });
  const log = await call(a, "addLog", { category: "alcohol", kind: "urge", note: "A's log", rodeItOut: true });
  await call(a, "awardTouches", { tab: "alcohol", count: 5 });

  const stateA = await call(a, "getState", {});
  assert.equal(stateA.welcomeAwarded, true);
  assert.equal(stateA.profiles.length, 1);
  assert.equal(stateA.profiles[0].planText, "A's plan");
  assert.equal(stateA.logs.length, 1);
  assert.equal(stateA.logs[0].note, "A's log");
  const totalA = stateA.pointsByTab.reduce((s, t) => s + t.points, 0);
  assert.equal(totalA, 15); // 10 welcome + 5 touches

  // B: a brand-new device sees NOTHING of A's data — and gets its own welcome.
  const stateB = await call(b, "getState", {});
  assert.equal(stateB.welcomeAwarded, false);
  assert.deepEqual(stateB.profiles, []);
  assert.deepEqual(stateB.logs, []);
  assert.deepEqual(stateB.pointsByTab, []);
  const welcomeB = await call(b, "awardPoints", { tab: "home", action: "welcome" });
  assert.equal(welcomeB.points, 10);
  assert.equal(welcomeB.already, false);

  // B cannot delete A's log (scoped delete): A's log is still there.
  await call(b, "deleteLog", { id: log.id });
  const stateA2 = await call(a, "getState", {});
  assert.equal(stateA2.logs.length, 1);

  // A can delete its own log.
  await call(a, "deleteLog", { id: log.id });
  const stateA3 = await call(a, "getState", {});
  assert.equal(stateA3.logs.length, 0);
});

test("quit-date and day-success dedupe is per device, per day", async () => {
  const a = randomUUID();
  const b = randomUUID();
  const day = "2026-11-10";
  const q1 = await call(a, "awardPoints", { tab: "alcohol", action: "quitDate", day });
  assert.equal(q1.points, 50);
  const q2 = await call(a, "awardPoints", { tab: "alcohol", action: "quitDate", day });
  assert.equal(q2.already, true);
  // Same date, different device: B still gets its +50.
  const q3 = await call(b, "awardPoints", { tab: "alcohol", action: "quitDate", day });
  assert.equal(q3.points, 50);
});
