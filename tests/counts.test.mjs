// Private, anonymous download count (Richard, 2026-11-16):
// GET /counts returns only three aggregate numbers —
// { welcomeDevices, devicesSeen, totalPoints } — distinct anonymous
// device_ids that claimed the +10 welcome points, distinct anonymous
// device_ids with any points at all, and the sum of all points
// (totalPoints, Richard 2026-11-17: engagement, not benefit).
// No device ids, no rows, no personal data. Spawns the built server
// (dist-server/server.js)
// with no DATABASE_URL, so it uses the in-memory Postgres fallback
// — same queries as production, no account, no card, no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = 3459;
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

async function getCounts() {
  const r = await fetch(`${BASE}/counts`);
  const body = await r.json();
  assert.equal(r.status, 200, `/counts -> ${r.status}: ${JSON.stringify(body)}`);
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

test("/counts returns only three aggregate numbers, starting at zero", async () => {
  const counts = await getCounts();
  // Only the three aggregate keys — no device ids, no rows, nothing else.
  assert.deepEqual(Object.keys(counts).sort(), ["devicesSeen", "totalPoints", "welcomeDevices"]);
  assert.equal(counts.welcomeDevices, 0);
  assert.equal(counts.devicesSeen, 0);
  assert.equal(counts.totalPoints, 0);
  assert.ok(Number.isInteger(counts.welcomeDevices));
  assert.ok(Number.isInteger(counts.devicesSeen));
  assert.ok(Number.isInteger(counts.totalPoints));
});

test("/counts counts distinct anonymous devices, welcome <= seen", async () => {
  const a = randomUUID();
  const b = randomUUID();
  const c = randomUUID();

  // A claims welcome (+10) and some touches; claiming welcome twice
  // still counts as one device (server-enforced once per device).
  const w1 = await call(a, "awardPoints", { tab: "home", action: "welcome" });
  assert.equal(w1.points, 10);
  const w1again = await call(a, "awardPoints", { tab: "home", action: "welcome" });
  assert.equal(w1again.already, true);
  await call(a, "awardTouches", { tab: "alcohol", count: 5 });

  // B claims welcome too.
  const w2 = await call(b, "awardPoints", { tab: "home", action: "welcome" });
  assert.equal(w2.points, 10);

  // C never claims welcome — only touches — so C is seen but not welcomed.
  await call(c, "awardTouches", { tab: "home", count: 3 });

  const counts = await getCounts();
  assert.deepEqual(Object.keys(counts).sort(), ["devicesSeen", "totalPoints", "welcomeDevices"]);
  assert.equal(counts.welcomeDevices, 2);
  assert.equal(counts.devicesSeen, 3);
  // Total points: A 10 welcome + 5 touches, B 10 welcome, C 3 touches.
  assert.equal(counts.totalPoints, 28);
  assert.ok(counts.welcomeDevices <= counts.devicesSeen);
});
