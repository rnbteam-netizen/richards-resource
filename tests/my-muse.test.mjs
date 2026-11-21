// My Muse (Richard, 2026-11-21): your personal self-help
// assistant, built into a personal self-help app — Muse only,
// no other Personal Muse Assistants. A "My Muse" card on Home, after My RR, labelled
// "Your personal self-help assistant". Tapping it opens Muse
// (https://muse.ai/) in a new tab and awards +100 points, once
// ever per device, for having the good sense to get your own Personal Muse Assistant.
// Return to My RR is mission critical: the starter carries the
// link AND the card shows it as a plain link, so the visitor can
// toggle back even if Muse never offers it. The starter is short
// and humble — no bragging list, one simple thing at a time —
// and closes with "If you would like help with anything else,
// please don't hesitate to ask. I'm your Muse."
//
// Honesty, pinned here: the app cannot put words into Muse.
// muse.ai has no public prompt deep-link and no public API, so
// the starter is shown in the card to copy and paste as the
// first message — it is not injected. Adding Muse to the home
// screen is the phone/browser's step, not the app's; the card
// says so plainly. Spawns the built server (dist-server/server.js)
// with no DATABASE_URL, so it uses the in-memory Postgres
// fallback — same queries as production, no account, no card,
// no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { MY_MUSE_URL, RETURN_TO_MY_RR_URL, MY_MUSE_STARTER, MY_MUSE_CLOSING_LINE } from "../client/src/my-muse.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const museSrc = readFileSync(path.join(root, "client", "src", "my-muse.ts"), "utf8");
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));

test("My Muse starter: humble, one thing at a time, guide not doctor, return link, and the closing line", () => {
  assert.equal(MY_MUSE_URL, "https://muse.ai/", "My Muse must open muse.ai");
  assert.equal(RETURN_TO_MY_RR_URL, "https://richardsresource.com", "Return to My RR must be exactly https://richardsresource.com");
  assert.ok(MY_MUSE_STARTER.includes("Return to My RR"), "the starter must offer Return to My RR");
  assert.ok(MY_MUSE_STARTER.includes("https://richardsresource.com"), "the starter must carry the exact return link");
  assert.ok(MY_MUSE_STARTER.includes("Add My Muse to my home screen"), "the starter must offer one clear step: Add My Muse to my home screen");
  assert.ok(MY_MUSE_STARTER.includes("guide, not a doctor"),
    "the starter must say Muse is a guide, not a doctor");
  assert.ok(MY_MUSE_STARTER.toLowerCase().includes("don't give medical advice"), "the starter must say no medical advice");
  assert.ok(MY_MUSE_STARTER.includes("988"), "the starter must keep 988 in view for crisis");
  assert.ok(MY_MUSE_STARTER.includes("911"), "the starter must keep 911 in view for crisis");
  assert.ok(MY_MUSE_STARTER.includes("one simple thing at a time"), "the starter must ask one simple thing at a time");
  assert.ok(MY_MUSE_STARTER.includes("don't list everything you can do"), "the starter must tell Muse not to brag about what it can do");
  assert.ok(MY_MUSE_STARTER.includes("don't try to be my parent"), "the starter must guard against imprinting — no parent, no replacement for people");
  assert.ok(MY_MUSE_STARTER.includes(MY_MUSE_CLOSING_LINE), "the starter must end by asking Muse to close with the exact closing line");
  assert.equal(
    MY_MUSE_CLOSING_LINE,
    "If you would like help with anything else, please don't hesitate to ask. I'm your Muse.",
    "the closing line must be exactly Richard's wording",
  );
  // No bragging, no other Personal Muse Assistants: the starter must not list
  // capabilities and must not name Gemini or any other Personal Muse Assistant.
  assert.ok(!/gemini/i.test(MY_MUSE_STARTER), "the starter must not name Gemini or any other Personal Muse Assistant");
  assert.ok(!MY_MUSE_STARTER.includes("I can book") && !MY_MUSE_STARTER.includes("I can send") && !MY_MUSE_STARTER.includes("I can do everything"),
    "the starter must not carry a bragging list of capabilities");
  // Honesty about what the app cannot do: it cannot inject a
  // prompt into Muse, and adding to the home screen is the
  // phone's step, not the app's.
  assert.ok(museSrc.includes("no public prompt deep-link"), "the module must say plainly there is no public prompt deep-link into Muse");
  assert.ok(museSrc.includes("cannot put words into Muse") || museSrc.includes("CANNOT put words into Muse"),
    "the module must say plainly the app cannot put words into Muse");
  assert.ok(src.includes("Adding Muse to your home screen is your phone"),
    "the card must say plainly that adding to the home screen is the phone's step, not the app's");
});

test("My Muse card: Home only, after My RR, Muse only, with the return link and the starter", () => {
  assert.ok(src.includes("function MyMuseCard("), "a MyMuseCard component must exist");
  assert.ok(src.includes("My Muse"), "the card must say My Muse");
  assert.ok(src.includes("Your personal self-help assistant"), "the card must say, plainly, Your personal self-help assistant");
  assert.ok(src.includes("Talk to My Muse"), "the card must offer one big Talk to My Muse button");
  assert.ok(home.includes("<MyMuseCard"), "My Muse must be on Home");
  assert.equal(src.match(/<MyMuseCard /g)?.length, 1, "there must be exactly one My Muse card");
  const myRrAt = home.indexOf("<MyRRCard");
  const myMuseAt = home.indexOf("<MyMuseCard");
  const whatsNewAt = home.indexOf("<WhatsNewBanner />");
  assert.ok(myRrAt > 0 && myMuseAt > myRrAt, "My Muse must sit after My RR on Home");
  assert.ok(whatsNewAt > myMuseAt, "My Muse must sit before the rest of Home");
  assert.ok(src.includes('window.open(MY_MUSE_URL, "_blank", "noopener,noreferrer")'),
    "tapping must open muse.ai in a new tab");
  assert.ok(src.includes("Return to My RR"), "the card must show Return to My RR");
  assert.ok(src.includes('href={RETURN_TO_MY_RR_URL}'), "Return to My RR must be a plain tappable link in the card");
  assert.ok(src.includes("Copy my starter message"), "the card must offer to copy the starter message");
  assert.ok(src.includes("Add My Muse to my home screen"), "the card must name the Add My Muse to my home screen step");
  assert.ok(src.includes("Muse only"), "the card must say Muse only — no other Personal Muse Assistants");
  assert.ok(src.includes("guide, not a doctor"), "the card must say Muse is a guide, not a doctor");
  assert.ok(src.includes("call or text 988"), "the card must keep 988 in view");
  // Adding, not subtracting: the warm greeting is untouched.
  assert.ok(home.includes("We are so Happy you are here"), "the welcome line must still be on Home");
  const trueAt = home.indexOf("BUT YOU ARE NOT ALONE");
  const happyAt = home.indexOf("<HappyButton />");
  const shareAt = home.indexOf("<ShareButton />");
  assert.ok(trueAt > 0 && happyAt > trueAt && shareAt > happyAt && myRrAt > shareAt && myMuseAt > myRrAt,
    "Home order must still be true message → Happy Button → Share → My RR → My Muse");
  // Search must find My Muse.
  const search = readFileSync(path.join(root, "client", "src", "search.ts"), "utf8");
  assert.ok(search.includes('"my-muse"'), "search must index My Muse so it can be found");
});

test("My Muse wording: 'AI' is never shown, 'Personal Muse Assistant' is (Richard, 2026-11-21)", () => {
  // "AI" is a deterrent for visitors — Richard's research / friends and
  // family. Visible copy must say "Personal Muse Assistant" instead.
  // The only "ai" left anywhere must be the muse.ai URL and the "ai"
  // search keyword (kept so searching "AI" still finds My Muse).
  const card = src.slice(src.indexOf("function MyMuseCard("), src.indexOf("function MyMuseCard(") + 6000);
  assert.ok(card.includes("Personal Muse Assistant"), "the My Muse card must say Personal Muse Assistant");
  assert.ok(!/\bAIs?\b/.test(card.replaceAll("muse.ai", "")), "the My Muse card must show no standalone AI / AIs");
  const pointsLine = src.slice(src.indexOf("+100</strong> — once, ever"), src.indexOf("+100</strong> — once, ever") + 300);
  assert.ok(pointsLine.includes("Personal Muse Assistant"), "the points list must say Personal Muse Assistant");
  assert.ok(!/\bAIs?\b/.test(pointsLine), "the points list must show no standalone AI");
  const starter = MY_MUSE_STARTER;
  assert.ok(!/\bAIs?\b/.test(starter), "the starter must show no standalone AI either");
});

test("My Muse points: +100 once ever, label and server wiring", () => {
  assert.ok(src.includes('myMuse: "Got your own Muse — your personal self-help assistant"'),
    "POINT_ACTION_LABEL must name myMuse");
  assert.ok(src.includes("once, ever, for getting your own Personal Muse Assistant"), "the points list must explain +100 once, ever, for getting your own Personal Muse Assistant");
  assert.ok(src.includes('award("home", "myMuse")'), "tapping Talk to My Muse must award myMuse on Home");
  const actions = readFileSync(path.join(root, "server", "src", "actions.ts"), "utf8");
  const schema = readFileSync(path.join(root, "server", "src", "schema.ts"), "utf8");
  const sql = readFileSync(path.join(root, "drizzle", "0001_public.sql"), "utf8");
  const api = readFileSync(path.join(root, "client", "src", "api.ts"), "utf8");
  assert.ok(actions.includes('"myMuse"'), "server pointActionEnum must accept myMuse");
  assert.ok(actions.includes("myMuse: 100"), "myMuse must be worth 100 points");
  assert.ok(actions.includes('args.action === "myMuse"'), "server must enforce myMuse once ever");
  assert.ok(actions.includes("points_my_muse_uidx"), "server must name the myMuse atomic backstop index");
  assert.ok(schema.includes('"myMuse"'), "server pointActions must include myMuse");
  assert.ok(schema.includes("points_my_muse_uidx"), "schema must carry the myMuse unique index");
  assert.ok(sql.includes("'myMuse'"), "migration must widen the Neon action CHECK to myMuse");
  assert.ok(sql.includes("points_my_muse_uidx"), "migration must create the myMuse unique index");
  assert.ok(api.includes('"myMuse"'), "client PointAction must include myMuse");
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

test("myMuse pays 100 once ever per device, then 0 — even on another day — and a relapse cannot take it back", async () => {
  const a = randomUUID();
  const b = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const first = await call(a, "awardPoints", { tab: "home", action: "myMuse" });
  assert.equal(first.points, 100, "first My Muse tap must pay 100");
  assert.equal(first.already, false, "first My Muse tap must not be already");

  const second = await call(a, "awardPoints", { tab: "home", action: "myMuse" });
  assert.equal(second.points, 0, "second My Muse tap must pay 0");
  assert.equal(second.already, true, "second My Muse tap must be already");

  // Another day does not reset it — it is once ever, not once a day.
  const nextDay = await call(a, "awardPoints", { tab: "home", action: "myMuse", day: tomorrow });
  assert.equal(nextDay.points, 0, "My Muse must not pay again tomorrow");
  assert.equal(nextDay.already, true);

  // A different device can still claim its own 100.
  const other = await call(b, "awardPoints", { tab: "home", action: "myMuse" });
  assert.equal(other.points, 100);
  assert.equal(other.already, false);

  // A −100 relapse on the same device does not claw back the
  // myMuse award and does not re-open it: it stays already-paid.
  await call(a, "awardPoints", { tab: "home", action: "relapse", day: today });
  const afterRelapse = await call(a, "awardPoints", { tab: "home", action: "myMuse" });
  assert.equal(afterRelapse.points, 0, "a relapse must not re-open the myMuse award");
  assert.equal(afterRelapse.already, true);

  // getState shows exactly one myMuse event for the first device.
  const state = await call(a, "getState", {});
  const mine = state.pointEvents.filter((e) => e.action === "myMuse");
  assert.equal(mine.length, 1, "exactly one myMuse row may exist for the device");
  assert.equal(mine[0].points, 100);
  const homeRow = state.pointsByTab.find((r) => r.tab === "home");
  // 100 myMuse − 100 relapse = 0 on Home for this device.
  assert.equal(homeRow.points, 0);
});
