// Peace of Mind tab (Richard, 2026-11-12): a generic spirituality /
// peace-of-mind tab after Longevity and before Help & Resources —
// mindfulness central (notice your breath, your body, one sound, no
// judgement), alongside meditation, prayer, gratitude, and quiet time.
// No doctrine, no one religion named as the way, Serenity Prayer as an
// example only. Self-claimed points: +10 for "I took a quiet moment",
// once per visit in the app and once per day on the server (second
// claim the same day pays 0), like the Screens screen-off award.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const page = src.slice(
  src.indexOf("function PeacePage()"),
  src.indexOf("/* ---------- home & resources ---------- */"),
);

test("Peace of Mind tab sits after Longevity, before Help & Resources", () => {
  const longevity = src.indexOf('{ id: "longevity"');
  const peace = src.indexOf('{ id: "peace"');
  const resources = src.indexOf('{ id: "resources"');
  assert.ok(longevity > 0 && peace > longevity && resources > peace,
    "TABS order should be longevity, peace, resources");
  assert.ok(src.includes('peace:        { activeBg: "#d8b4d4"'),
    "Peace needs its own distinct pastel");
  assert.ok(src.includes('peace: "peace"'), "TAB_TO_POINT_TAB must map peace");
  assert.ok(src.includes('peace: "Peace of Mind"'), "POINT_TAB_LABEL must name peace");
  assert.ok(src.includes('case "peace":'), "TabIcon must have a case for peace");
  assert.ok(src.includes('<TabIcon id="peace" size={24}'), "Home Peace card must show the tab icon");
  assert.ok(src.includes('{tab === "peace" && <PeacePage />}'),
    "the app must render PeacePage for the peace tab");
});

test("Peace page: hook, one breathing exercise, mindfulness central, generic", () => {
  assert.ok(src.includes("function PeaceHook()"), "Peace needs its skippable hook");
  assert.ok(src.includes("function PeacePage()"), "PeacePage must exist");
  const breathing = page.match(/<CalmingBreathing \/>/g) ?? [];
  assert.equal(breathing.length, 1, `expected 1 CalmingBreathing on Peace, got ${breathing.length}`);
  // Mindfulness central, in plain language.
  assert.ok(page.includes("A mindfulness moment — notice, don't judge"),
    "Peace must have a mindfulness moment section");
  assert.ok(page.includes("Notice your breath"), "mindfulness must start with the breath");
  assert.ok(page.includes("Notice your body"), "mindfulness must include the body");
  assert.ok(page.includes("Notice one sound"), "mindfulness must include one sound");
  assert.ok(page.includes("no judgement") || page.includes("without judging"),
    "mindfulness must say no judgement");
  assert.ok(page.includes("Meditation"), "Peace must offer meditation");
  assert.ok(page.includes("Prayer — in your own words"), "Peace must offer prayer in your own words");
  assert.ok(page.includes("Gratitude"), "Peace must offer gratitude");
  assert.ok(page.includes("for any faith or none"), "Peace must be for any faith or none");
  assert.ok(page.includes("no doctrine"), "Peace must say no doctrine");
  // Serenity Prayer as an example only, clearly optional.
  assert.ok(page.includes("Serenity Prayer"), "Peace must include the Serenity Prayer");
  assert.ok(page.includes("as an example only"), "Serenity Prayer must be framed as an example only");
  assert.ok(page.includes("God, grant me the serenity"), "Serenity Prayer text must be present");
  // Nothing saved or sent on this tab.
  assert.ok(page.includes("Nothing on this tab is saved or sent"),
    "Peace must say nothing is saved or sent");
  assert.ok(!page.includes('awardFields("peace"'), "Peace must not award field points");
});

test("Peace self-claim: button, +10, once per visit, server once per day", () => {
  assert.ok(page.includes("I took a quiet moment — meditation / prayer · +10 points"),
    "Peace must have the quiet-moment claim button");
  assert.ok(page.includes('award("peace", "quietMoment", localDay())'),
    "claim must award quietMoment on the peace tab for today");
  assert.ok(page.includes("We can't check, and we won't try"),
    "claim must say plainly the app can't check and won't try");
  assert.ok(page.includes("once per visit"), "claim must say once per visit");
  assert.ok(src.includes('quietMoment: "Took a quiet moment — meditation / prayer"'),
    "POINT_ACTION_LABEL must name quietMoment");
  const actions = readFileSync(path.join(root, "server", "src", "actions.ts"), "utf8");
  const schema = readFileSync(path.join(root, "server", "src", "schema.ts"), "utf8");
  const sql = readFileSync(path.join(root, "drizzle", "0001_public.sql"), "utf8");
  assert.ok(actions.includes('"peace"'), "server pointTabEnum must accept peace");
  assert.ok(actions.includes('"quietMoment"'), "server pointActionEnum must accept quietMoment");
  assert.ok(actions.includes("quietMoment: 10"), "quietMoment must be worth 10 points");
  assert.ok(actions.includes("args.action === \"quietMoment\""), "server must dedupe quietMoment");
  assert.ok(schema.includes('"peace"'), "server pointTabs must include peace");
  assert.ok(schema.includes('"quietMoment"'), "server pointActions must include quietMoment");
  assert.ok(sql.includes("'longevity','peace'"), "fresh Neon schema tab CHECK must include peace");
  assert.ok(sql.includes("'dailyCheckin','quietMoment'"), "fresh Neon schema action CHECK must include quietMoment");
  assert.ok(sql.includes("points_tab_check"), "migration must widen the existing Neon tab CHECK idempotently");
});

// HTTP: quietMoment pays 10 once per day, again tomorrow, per device.
const PORT = 3458;
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

test("quietMoment pays 10 once per day, again tomorrow, per device", async () => {
  const a = randomUUID();
  const b = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const first = await call(a, "awardPoints", { tab: "peace", action: "quietMoment", day: today });
  assert.equal(first.points, 10);
  assert.equal(first.already, false);

  // Same day, same device: second claim pays 0.
  const again = await call(a, "awardPoints", { tab: "peace", action: "quietMoment", day: today });
  assert.equal(again.already, true);
  assert.equal(again.points, 0);

  // A different device can still claim its own 10 today.
  const other = await call(b, "awardPoints", { tab: "peace", action: "quietMoment", day: today });
  assert.equal(other.points, 10);
  assert.equal(other.already, false);

  // Tomorrow, the first device can claim again.
  const nextDay = await call(a, "awardPoints", { tab: "peace", action: "quietMoment", day: tomorrow });
  assert.equal(nextDay.points, 10);
  assert.equal(nextDay.already, false);

  // And getState shows the award in the Peace totals.
  const state = await call(a, "getState", {});
  const peace = state.pointsByTab.find((r) => r.tab === "peace");
  assert.equal(peace.points, 20);
  assert.ok(state.pointEvents.some((e) => e.action === "quietMoment" && e.day === today));
});
