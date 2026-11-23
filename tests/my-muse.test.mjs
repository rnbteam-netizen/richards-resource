// My Muse (Richard, 2026-11-21, simplified 2026-11-23): your
// personal self-help assistant, built into a personal self-help
// app — Muse only, no other Personal Muse Assistants. A small
// "My Muse" card on Home, after the Happy Button, labelled
// "Your personal self-help assistant". It asks one simple
// question — "Would you like to chat with Muse?" — with
// "Yes, chat with Muse" and "Maybe later". Tapping Yes opens
// Muse (https://muse.ai/) in a new tab and awards +100 points,
// once ever per device, for having the good sense to get your
// own Personal Muse Assistant. Maybe later dismisses the card
// for this visit, no points, no link. Return to My RR is
// mission critical: the card shows it as a plain link, so the
// visitor can toggle back even if Muse never offers it.
// No starter message, no copy-starter button, no home-screen
// or download instructions — guiding the visitor with Muse
// instructions is too much, and it must not look like a trick
// to get an AI. It is Self Help, not Muse-help.
//
// Honesty, pinned here: the app cannot put words into Muse.
// muse.ai has no public prompt deep-link and no public API, so
// there is no starter to inject. Spawns the built server
// (dist-server/server.js) with no DATABASE_URL, so it uses the
// in-memory Postgres fallback — same queries as production, no
// account, no card, no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { MY_MUSE_URL, RETURN_TO_MY_RR_URL } from "../client/src/my-muse.ts";
import { searchApp } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const museSrc = readFileSync(path.join(root, "client", "src", "my-muse.ts"), "utf8");
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
const card = src.slice(src.indexOf("function MyMuseCard("), src.indexOf("function HomePage("));

test("My Muse: one simple question, Yes links it, Maybe later dismisses it — no starter, no instructions", () => {
  assert.equal(MY_MUSE_URL, "https://muse.ai/", "My Muse must open muse.ai");
  assert.equal(RETURN_TO_MY_RR_URL, "https://richardsresource.com", "Return to My RR must be exactly https://richardsresource.com");
  assert.ok(card.includes("Would you like to chat with Muse?"), "the card must ask, simply, Would you like to chat with Muse?");
  assert.ok(card.includes("Yes, chat with Muse"), "the card must offer Yes, chat with Muse");
  assert.ok(card.includes("Maybe later"), "the card must offer Maybe later instead of a hard No");
  assert.ok(card.includes('setDismissed(true)'), "Maybe later must dismiss the card for this visit");
  assert.ok(!card.includes("Copy my starter message") && !card.includes("MY_MUSE_STARTER"),
    "the card must show no starter message and no copy-starter button");
  assert.ok(!card.includes("Add My Muse to my home screen") && !card.includes("home screen"),
    "the card must carry no home-screen / download instructions");
  assert.ok(!card.includes("starter"), "the card must not mention a starter at all");
  assert.ok(!museSrc.includes("MY_MUSE_STARTER") && !museSrc.includes("copyMyMuseStarter"),
    "the starter and its copy helper must be gone from the module too");
  // Honesty about what the app cannot do.
  assert.ok(museSrc.includes("no public prompt deep-link"), "the module must say plainly there is no public prompt deep-link into Muse");
  assert.ok(museSrc.includes("cannot put words into Muse") || museSrc.includes("CANNOT put words into Muse"),
    "the module must say plainly the app cannot put words into Muse");
  // Safety line, short: guide not doctor, 988 / 911, free, no account.
  assert.ok(card.includes("guide, not a doctor"), "the card must say Muse is a guide, not a doctor");
  assert.ok(card.includes("988") && card.includes("911"), "the card must keep 988 and 911 in view for crisis");
  assert.ok(card.includes("Free, no account"), "the card must say free, no account");
});

test("My Muse card: Home only, after the Happy Button, Muse only, with the return link", () => {
  assert.ok(src.includes("function MyMuseCard("), "a MyMuseCard component must exist");
  assert.ok(src.includes("My Muse"), "the card must say My Muse");
  assert.ok(src.includes("Your personal self-help assistant"), "the card must say, plainly, Your personal self-help assistant");
  assert.ok(home.includes("<MyMuseCard"), "My Muse must be on Home");
  assert.equal(src.match(/<MyMuseCard /g)?.length, 1, "there must be exactly one My Muse card");
  const myMuseAt = home.indexOf("<MyMuseCard");
  const happyAt = home.indexOf("<HappyButton />");
  const whatsNewAt = home.indexOf("<WhatsNewBanner />");
  assert.ok(myMuseAt > happyAt, "My Muse must sit after the Happy Button on Home");
  assert.ok(whatsNewAt > myMuseAt, "My Muse must sit before the rest of Home");
  assert.ok(src.includes('window.open(MY_MUSE_URL, "_blank", "noopener,noreferrer")'),
    "tapping Yes must open muse.ai in a new tab");
  assert.ok(src.includes("Return to My RR"), "the card must show Return to My RR");
  assert.ok(src.includes('href={RETURN_TO_MY_RR_URL}'), "Return to My RR must be a plain tappable link in the card");
  assert.ok(src.includes("Muse only"), "the card must say Muse only — no other Personal Muse Assistants");
  // Adding, not subtracting: the warm greeting is untouched.
  assert.ok(home.includes("We are so Happy you are here"), "the welcome line must still be on Home");
  const trueAt = home.indexOf("your personal cottage");
  const shareAt = home.indexOf("<ShareButton />");
  assert.ok(trueAt > 0 && shareAt > trueAt && happyAt > shareAt && myMuseAt > happyAt,
    "Home order must be true message → Share → Happy Button → My Muse");
  // Search must find My Muse.
  const search = readFileSync(path.join(root, "client", "src", "search.ts"), "utf8");
  assert.ok(search.includes('"my-muse"'), "search must index My Muse so it can be found");
  assert.ok(searchApp("ai").some((r) => r.id === "my-muse"), "searching 'ai' must still find My Muse");
});

test("My Muse wording: 'AI' is never shown in the card, 'Personal Muse Assistant' is (Richard, 2026-11-21)", () => {
  // "AI" is a deterrent for visitors — Richard's research / friends and
  // family. Visible copy in the card must say "Personal Muse Assistant" instead.
  // The only "ai" left in the card must be the muse.ai URL.
  // (The "Why we made it" box, added 2026-11-23 at Richard's
  // explicit wording, is the one exception — it says "AI is here
  // to help" in his words, and is pinned separately in
  // tests/home-simplification-2026-11-23.test.mjs.)
  assert.ok(card.includes("Personal Muse Assistant"), "the My Muse card must say Personal Muse Assistant");
  assert.ok(!/\bAIs?\b/.test(card.replaceAll("muse.ai", "")), "the My Muse card must show no standalone AI / AIs");
  const pointsLine = src.slice(src.indexOf("+100</strong> — once, ever"), src.indexOf("+100</strong> — once, ever") + 300);
  assert.ok(pointsLine.includes("Personal Muse Assistant"), "the points list must say Personal Muse Assistant");
  assert.ok(!/\bAIs?\b/.test(pointsLine), "the points list must show no standalone AI");
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
