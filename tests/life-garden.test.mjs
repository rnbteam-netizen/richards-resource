// My Life Garden Pathway (Richard, 2026-11-25/26) — first piece
// only, source-level tests. A Home button labelled exactly
// "My Life Garden Pathway", after the existing Home content, opens
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

test("Home button is labelled exactly My Life Garden Pathway and sits after Why we made it", () => {
  assert.ok(home.includes("My Life Garden Pathway"), "Home must carry the My Life Garden Pathway button");
  const why = home.indexOf("Why we made it");
  const button = home.lastIndexOf("My Life Garden Pathway");
  assert.ok(why !== -1 && button !== -1 && button > why, "the garden button must come after the existing Home content");
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
