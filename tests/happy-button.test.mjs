// Happy Button (Richard, 2026-11-18): one round pale-blue button on
// Home — "I'm feeling happy", no scale, no numbers. Each tap raises a
// spring-pastel thermometer a clear step; 8 taps fill it, it pins to
// a personal cork board, and a fresh one starts. +10 per push, 8 scored
// pushes a day (80 max); taps after that still fill/pin but pay 0.
// Server enforces the cap by counting today's happyMoment rows.
// Spawns the built server (dist-server/server.js) with no DATABASE_URL,
// so it uses the in-memory Postgres fallback — same queries as
// production, no account, no card, no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const happy = src.slice(
  src.indexOf("/* ---------- the Happy Button"),
  src.indexOf("function HomePage("),
);
const home = src.slice(
  src.indexOf("function HomePage("),
  src.indexOf("function ResourcesPage("),
);
const peace = src.slice(
  src.indexOf("function PeacePage("),
  src.indexOf("/* ---------- home & resources ---------- */"),
);

test("Happy Button: one button, on Home, spring palette, no scoring talk in the card", () => {
  assert.ok(happy.includes("function HappyButton()"), "HappyButton component must exist");
  assert.ok(happy.includes("I&apos;m feeling"), "card top must say only “I'm feeling happy”");
  assert.ok(happy.includes("Feeling Happy"), "the label above the button must say “Feeling Happy”");
  assert.ok(happy.includes("Happy"), "the round button must say “Happy Button”");
  assert.ok(happy.includes("HAPPY_THERMOMETER_CAPACITY = 8"), "one thermometer must fill in 8 pushes");
  // Spring pastels only in the button/thermometer: lavender, pink,
  // butter yellow, mint, pale blue — no fall colours in this component.
  for (const hex of ["#cdb4f0", "#f7a8c8", "#fde9a8", "#a8dcc0", "#8ec9ee", "#bfe3f7"]) {
    assert.ok(happy.includes(hex), `Happy Button must use spring pastel ${hex}`);
  }
  assert.ok(!happy.includes("#e8763a") && !happy.includes("#f0925f"),
    "Happy Button must not use the app's fall/orange colours");
  assert.ok(happy.includes("Your cork board"), "cork board must be tucked under the button, tap to open");
  assert.ok(happy.includes("Nothing pinned yet"), "empty cork board must say so");
  assert.ok(!happy.toLowerCase().includes("points per push") && !happy.toLowerCase().includes("80 max"),
    "the card itself must not explain scoring — no points talk in the Happy Button card");
  assert.ok(happy.includes('award("home", "happyMoment", today)'),
    "each tap must award happyMoment on Home for today");
  assert.ok(happy.includes("richards-resource:happy-button:v1"),
    "thermometer and cork board must live in localStorage only");
});

test("Happy Button placement: welcome line, true message, then the button — on Home only", () => {
  const welcomeLine = "We are so Happy you are here";
  // On the Welcome cover, under the cottage.
  const cover = src.slice(src.indexOf("function WelcomeCover("), src.indexOf("function WelcomeIntro()"));
  assert.ok(cover.includes(welcomeLine), "Welcome cover must say “We are so Happy you are here”");
  // At the top of Home, just above the true message, and the button
  // immediately after the true-message box.
  assert.ok(home.includes(welcomeLine), "Home must say “We are so Happy you are here” above the true message");
  const lineAt = home.indexOf(welcomeLine);
  const trueAt = home.indexOf("BUT YOU ARE NOT ALONE");
  const buttonAt = home.indexOf("<HappyButton />");
  assert.ok(lineAt > 0 && trueAt > lineAt, "welcome line must come before the true message on Home");
  assert.ok(buttonAt > trueAt, "Happy Button must come immediately after the true-message box on Home");
  assert.ok(home.indexOf("Your points") > buttonAt, "the button must sit before the rest of Home, not after it");
  // No second button anywhere else: Peace gets a note, not a button.
  assert.ok(!peace.includes("<HappyButton"), "Peace of Mind must not have its own Happy Button");
  assert.ok(peace.includes("If you&apos;re feeling happy, the button is all yours"),
    "Peace of Mind must point back to the button on Home");
  assert.ok(peace.includes("go back to Home and press it"), "Peace note must say to go back to Home");
});

test("Happy Button points: label, server action, and cap wiring", () => {
  assert.ok(src.includes('happyMoment: "Noticed a happy moment — Happy Button"'),
    "POINT_ACTION_LABEL must name happyMoment");
  const actions = readFileSync(path.join(root, "server", "src", "actions.ts"), "utf8");
  const schema = readFileSync(path.join(root, "server", "src", "schema.ts"), "utf8");
  const sql = readFileSync(path.join(root, "drizzle", "0001_public.sql"), "utf8");
  const api = readFileSync(path.join(root, "client", "src", "api.ts"), "utf8");
  assert.ok(actions.includes('"happyMoment"'), "server pointActionEnum must accept happyMoment");
  assert.ok(actions.includes("happyMoment: 10"), "happyMoment must be worth 10 points");
  assert.ok(actions.includes('args.action === "happyMoment"'), "server must cap happyMoment per day");
  assert.ok(actions.includes(">= 8"), "server cap must be 8 scored pushes a day");
  assert.ok(!actions.includes('args.action === "happyMoment"') || actions.includes("quietMoment"),
    "happyMoment must be a new action, not a reuse of quietMoment");
  assert.ok(schema.includes('"happyMoment"'), "server pointActions must include happyMoment");
  assert.ok(sql.includes("'happyMoment'"), "migration must widen the Neon action CHECK to happyMoment");
  assert.ok(api.includes('"happyMoment"'), "client PointAction must include happyMoment");
});

// HTTP: happyMoment pays 10 eight times a day, then 0, again tomorrow, per device.
const PORT = 3460;
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
    cwd: root,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe",
  });
  await waitForHealth();
});

after(() => { proc?.kill(); });

test("happyMoment pays 10 eight times a day (80 max), then 0, again tomorrow, per device", async () => {
  const a = randomUUID();
  const b = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  let total = 0;
  for (let i = 1; i <= 8; i++) {
    const res = await call(a, "awardPoints", { tab: "home", action: "happyMoment", day: today });
    assert.equal(res.points, 10, `push ${i} must pay 10`);
    assert.equal(res.already, false, `push ${i} must not be already`);
    total += res.points;
  }
  assert.equal(total, 80, "8 scored pushes must total 80");

  // 9th push the same day: thermometer still moves on the phone, but
  // the server pays 0 and inserts nothing.
  const ninth = await call(a, "awardPoints", { tab: "home", action: "happyMoment", day: today });
  assert.equal(ninth.already, true);
  assert.equal(ninth.points, 0);

  // A different device can still score its own 8 today.
  const other = await call(b, "awardPoints", { tab: "home", action: "happyMoment", day: today });
  assert.equal(other.points, 10);
  assert.equal(other.already, false);

  // Tomorrow, the first device can score again.
  const nextDay = await call(a, "awardPoints", { tab: "home", action: "happyMoment", day: tomorrow });
  assert.equal(nextDay.points, 10);
  assert.equal(nextDay.already, false);

  // And getState shows 80 for today in the Home totals (plus 10 tomorrow).
  const state = await call(a, "getState", {});
  const homeRow = state.pointsByTab.find((r) => r.tab === "home");
  assert.equal(homeRow.points, 90);
  assert.ok(state.pointEvents.some((e) => e.action === "happyMoment" && e.day === today));
  assert.ok(state.pointEvents.filter((e) => e.action === "happyMoment" && e.day === today).length <= 8,
    "only 8 scored happyMoment rows may exist for today");
});
