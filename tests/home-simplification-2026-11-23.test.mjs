// Home simplification (Richard, 2026-11-23): Home had grown
// into an Ikea box — too much to read on first look. Six changes,
// in order: (1) true-message box rephrased, privacy said once;
// (2) "We are so Happy you are here" to the very top of Home;
// (3) My Muse simplified to one question, Yes / Maybe later,
// no starter, no instructions; (4) My RR deleted from Home
// (return itself untouched — pinned in tests/search-my-rr.test.mjs);
// (5) Happy Button moved one step down, after Share; (6) How
// points work becomes a closed-by-default pop-up. Plus, added
// during the build: a small "Why we made it" box at the END of
// Home, with Richard's picked wording, verbatim — "To prove AI
// is here to help, Richard's Resource and Muse created this free
// app to help everyone." That wording re-introduces "AI" in
// public copy; it is flagged to Richard, not rewritten. ("RR"
// was spelled out at his update, so that flag is settled.)
//
// Not changed here: the Codependency $50 money-kept line, Terms,
// the PrivacyStrip, search, the automatic return, the Happy
// Button itself, or any points value.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchApp } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
const card = src.slice(src.indexOf("function MyMuseCard("), src.indexOf("function HomePage("));

test("True message: new wording, privacy said once, in the box after the cottage", () => {
  const TRUE = "This is your personal journey, your personal cottage, but you are not alone. This app is your resource guide for help at your fingertips. We even have a button for when you&apos;re feeling happy.";
  assert.ok(home.includes(TRUE), "Home must carry the new true message in full, verbatim");
  const PRIVACY = "We don&apos;t ask for it, we don&apos;t collect it. We have no personal information to share with anyone.";
  assert.ok(home.includes(PRIVACY), "Home must carry the privacy line, once only, in the same box");
  assert.equal(home.match(/We don&apos;t ask for it/g)?.length, 1, "the privacy line must appear exactly once on Home");
  assert.ok(home.indexOf(TRUE) > home.indexOf("<WelcomeIntro />"), "the true-message box must come after the cottage on Home");
  assert.ok(!home.includes("BUT YOU ARE NOT ALONE"), "the old true-message wording must be gone from Home");
  // The PrivacyStrip elsewhere ("We don't share your data...") is untouched.
  assert.ok(src.includes("We don't share your data. This is your personal journey."), "the privacy line elsewhere must be unchanged");
});

test("Welcome line: at the very top of Home, before the cottage — and still on the WelcomeCover", () => {
  const line = "We are so Happy you are here";
  const cover = src.slice(src.indexOf("function WelcomeCover("), src.indexOf("function WelcomeIntro()"));
  assert.ok(cover.includes(line), "the WelcomeCover must keep the welcome line, unchanged");
  const lineAt = home.indexOf(line);
  assert.ok(lineAt > 0, "Home must still say the welcome line");
  assert.ok(lineAt < home.indexOf("<WelcomeIntro />"), "the welcome line must come before the cottage — the very top of Home");
  assert.ok(lineAt < home.indexOf("your personal cottage"), "the welcome line must come before the true message");
});

test("My Muse: one simple question, Yes links it, Maybe later dismisses it, no starter shown", () => {
  assert.ok(card.includes("Would you like to chat with Muse?"), "the card must ask Would you like to chat with Muse?");
  assert.ok(card.includes("Yes, chat with Muse"), "Yes must link to Muse");
  assert.ok(card.includes("Maybe later"), "Maybe later must be offered");
  assert.ok(card.includes('window.open(MY_MUSE_URL, "_blank", "noopener,noreferrer")'), "Yes must open muse.ai in a new tab");
  assert.ok(card.includes('award("home", "myMuse")'), "Yes must still award the once-ever +100 myMuse points");
  assert.ok(!card.includes("starter") && !card.includes("Copy my starter"), "no starter message or copy button may be shown");
  assert.ok(!card.includes("home screen"), "no home-screen / download instructions may be shown");
  assert.ok(card.includes("guide, not a doctor") && card.includes("988") && card.includes("911"),
    "the one short safety line must stay: guide not doctor, 988, 911");
  assert.ok(card.includes("Return to My RR"), "the Return to My RR link must stay in the card");
  assert.ok(searchApp("ai").some((r) => r.id === "my-muse"), "searching 'ai' must still find My Muse");
});

test("My RR: no card on Home at all", () => {
  assert.ok(!src.includes("function MyRRCard("), "there must be no MyRRCard component");
  assert.ok(!home.includes("MyRRCard") && !home.includes("Continue where I left off"),
    "Home must show no My RR card and no Continue button");
});

test("Happy Button: after the Share button, internals untouched", () => {
  const shareAt = home.indexOf("<ShareButton />");
  const buttonAt = home.indexOf("<HappyButton />");
  const trueAt = home.indexOf("your personal cottage");
  assert.ok(trueAt > 0 && shareAt > trueAt && buttonAt > shareAt,
    "Home order must be true message → Share → Happy Button");
  assert.ok(home.indexOf("<MyMuseCard") > buttonAt, "My Muse must sit after the Happy Button");
  assert.ok(src.includes('happyMoment: "Noticed a happy moment — Happy Button"'), "the happyMoment award must be unchanged");
  assert.ok(src.includes("Feeling Happy"), "the button wording must be unchanged");
});

test("How points work: a button, closed by default, opening a pop-up with the same list", () => {
  assert.ok(src.includes("How points work {pointsOpen ?"), "Home must show a How points work button that toggles");
  assert.ok(src.includes("aria-expanded={pointsOpen}"), "the button must say whether the pop-up is open");
  assert.ok(src.includes("{pointsOpen && ("), "the points list must only render when the pop-up is open — closed by default");
  assert.ok(src.includes("setPointsOpen"), "tapping the button must flip the pop-up open and closed");
  // Same list, same points, word for word.
  for (const line of [
    "<strong>+10</strong> — welcome points",
    "<strong>+50</strong> — for picking a quit date",
    "<strong>+100</strong> — for every day after your quit date",
    "<strong>+100</strong> — once, ever, for getting your own Personal Muse Assistant",
    "<strong>−100</strong> — if you slip",
  ]) {
    assert.ok(home.includes(line), `the pop-up must keep the list line: ${line}`);
  }
});

test("Why we made it: one small box at the END of Home, with Richard's picked wording, verbatim", () => {
  const boxAt = home.indexOf("Why we made it");
  assert.ok(boxAt > 0, "Home must have a small Why we made it box");
  const crisisAt = home.indexOf("<CrisisStrip />");
  assert.ok(boxAt > crisisAt, "the box must sit at the end of Home, after the crisis strip");
  assert.ok(
    home.includes("To prove AI is here to help, Richard&apos;s Resource and Muse created this free app to help everyone."),
    "the box must carry Richard's picked wording, verbatim",
  );
  assert.ok(!home.includes("Wording coming soon"), "the placeholder must be gone now that Richard has picked the wording");
  assert.ok(!home.includes("RR and Muse created this free app"),
    "the box must spell it out as Richard's Resource, not RR, at Richard's update");
  // Flag, not a failure: this wording uses "AI" in public copy,
  // which Richard earlier kept out of the public app ("AI" →
  // "Personal Muse Assistant", 2026-11-21). His wording is kept
  // exactly as he gave it — the flag goes to him in the handoff.
});
