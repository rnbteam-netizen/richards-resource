// Daily check-in (Richard, 2026-11-11): +100 total, once per day,
// for "Today I... Exercised, Ate Well, Slept Well, Feel Better" —
// not 100 per item. Spawns the built server (dist-server/server.js)
// with no DATABASE_URL, so it uses the in-memory Postgres fallback —
// same queries as production, no account, no card, no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = 3457;
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

test("daily check-in pays 100 once per day, again tomorrow, per device", async () => {
  const a = randomUUID();
  const b = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const first = await call(a, "awardPoints", { tab: "home", action: "dailyCheckin", day: today });
  assert.equal(first.points, 100);
  assert.equal(first.already, false);

  // Same day, same device: no second 100.
  const again = await call(a, "awardPoints", { tab: "home", action: "dailyCheckin", day: today });
  assert.equal(again.already, true);
  assert.equal(again.points, 0);

  // A different device can still claim its own 100 today.
  const other = await call(b, "awardPoints", { tab: "home", action: "dailyCheckin", day: today });
  assert.equal(other.points, 100);
  assert.equal(other.already, false);

  // Tomorrow, the first device can claim again.
  const nextDay = await call(a, "awardPoints", { tab: "home", action: "dailyCheckin", day: tomorrow });
  assert.equal(nextDay.points, 100);
  assert.equal(nextDay.already, false);

  // And getState shows the award in the Home totals.
  const state = await call(a, "getState", {});
  const home = state.pointsByTab.find((r) => r.tab === "home");
  assert.equal(home.points, 200);
  assert.ok(state.pointEvents.some((e) => e.action === "dailyCheckin" && e.day === today));
});
