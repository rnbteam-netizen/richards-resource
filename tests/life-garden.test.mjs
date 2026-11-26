// My Life Garden Pathway (Richard, 2026-11-25/26) — first piece
// only, source-level tests. A Home button labelled exactly
// "My Life Garden Pathway", at the TOP of Home after the cottage
// and true message (moved there 2026-11-26, Richard could not
// find it at the end of Home), opens
// a garden view with the final one-gazebo image, Richard's exact
// brief explanation, and the 13 items as a checklist saved in
// localStorage only. No points, no badges, no trophy room, no
// Check my progress in this piece.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const garden = src.slice(src.indexOf("const LIFE_GARDEN_ITEMS"), src.indexOf("function HomePage("));
const gardenView = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));

const ITEMS = [
  "No drinking problem",
  "No smoking problem",
  "No gambling problem",
  "No drug problem",
  "I eat well",
  "I like my body just the way it is",
  "I take a quiet moment",
  "I'm interested in longevity",
  "I turn my screen off",
  "I have friends, furry and/or human",
  "I socialize",
  "I'm not lonely",
  "I don't lose myself trying to fix others",
];

test("garden image is a local asset, not a hotlink", () => {
  assert.ok(existsSync(path.join(root, "client", "src", "assets", "my-life-garden.webp")), "my-life-garden.webp must live in client/src/assets/");
  assert.ok(src.includes('import myLifeGarden from "./assets/my-life-garden.webp"'), "the garden image must be imported from local assets");
  assert.ok(!garden.includes("http"), "the garden view must not hotlink anything");
});

test("Home button is labelled exactly My Life Garden Pathway and sits at the TOP of Home, after the cottage and true message", () => {
  assert.ok(home.includes("My Life Garden Pathway"), "Home must carry the My Life Garden Pathway button");
  // Richard (2026-11-26) could not find it at the very end of
  // Home — he thought it would come right after agreeing to
  // Terms, or tapping on the door. So it sits right after the
  // cottage and the true message, before Share and the Happy
  // Button, with Inside view right after it — and only once.
  const trueMessage = home.indexOf("This is your personal journey, your personal cottage");
  const gardenLabel = home.indexOf("Tap to open My Life Garden Pathway →");
  const insideLabel = home.indexOf("Tap to open Inside view →");
  const share = home.indexOf("<ShareButton />");
  const why = home.indexOf("Why we made it");
  assert.ok(trueMessage !== -1 && gardenLabel > trueMessage, "the garden button must come after the true message");
  assert.ok(insideLabel > gardenLabel, "the Inside view button must come right after the garden button");
  assert.ok(share > insideLabel, "both buttons must come before the Share button, at the top of Home");
  assert.ok(why > gardenLabel, "the garden button must no longer sit after Why we made it, at the end of Home");
  assert.equal((home.match(/Tap to open My Life Garden Pathway →/g) ?? []).length, 1, "there must be exactly one garden button on Home, no duplicate at the bottom");
  assert.equal((home.match(/Tap to open Inside view →/g) ?? []).length, 1, "there must be exactly one Inside view button on Home, no duplicate at the bottom");
});

test("garden view has the exact explanation, the 13 items, and local-only saving", () => {
  assert.ok(garden.includes("Hello (name if we know it) Weeds grow naturally"), "Richard's exact brief explanation must be in the garden view");
  for (const item of ITEMS) assert.ok(garden.includes(`"${item}"`), `garden list must include "${item}"`);
  assert.equal(ITEMS.length, 13, "the list must have exactly 13 items");
  assert.ok(garden.includes("richards-resource:life-garden:v1"), "checklist state must be saved under a localStorage key");
  assert.ok(garden.includes("type=\"checkbox\""), "the items must be checkboxes");
  assert.ok(garden.includes("Weed clearing begins from the front steps of the cottage"), "the gentle note about clearing from the cottage steps must be there");
  assert.ok(garden.includes("No calorie counting, no weighing, no judging"), "the no-counting, no-weighing, no-judging note must be there");
  assert.ok(garden.includes("Back to Home"), "the garden view must have a back-to-Home button");
  assert.ok(garden.includes("Tap the photo to see it bigger"), "tapping the image must zoom the entire photo");
});

test("first piece builds nothing else: no badges, Check my progress, or points for weeding", () => {
  // The Map piece (2026-11-26) DOES add trophies — a trophy for
  // the Cozy Room on choosing a map option — so "trophy" is no
  // longer banned here. Badges, Check my progress, a weed pile
  // and points-awarding are still held for later pieces.
  // The header comments list the held items by name, so strip
  // comment lines before checking — the check guards the code.
  const code = gardenView.replace(/^\/\/.*$/gm, "");
  for (const banned of ["badge", "Check my progress", "weed pile"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `garden view must not mention "${banned}" yet`);
  }
  assert.ok(!gardenView.includes("award("), "the garden view must not award points");
});
