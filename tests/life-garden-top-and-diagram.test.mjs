// My Life Garden Pathway — garden buttons at the top of Home,
// and the Map IS a full branching diagram (Richard, 2026-11-26).
// Richard could not find the garden button at the end of Home —
// he thought it would come right after agreeing to Terms, or
// tapping on the door — so it moved to the top, right after the
// cottage and the true message. And on the Map he saw "Just has
// cottage, gazebo infinity path" — the old map photo was not a
// diagram. The Map is now our real cottage, with the caption he
// liked, and a drawn diagram that shows every branch in the
// diagram itself: the gazebo branch, all eight dead ends each
// with a trophy on a wooden stool, and Longevity going on to
// infinity with trophies along it. Local only, nothing sent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const map = src.slice(src.indexOf("const LIFE_GARDEN_TROPHY_KEY"), src.indexOf("function HomePage("));
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
// The diagram SVG itself — not the stop buttons below it.
const diagramStart = map.indexOf('<svg viewBox="0 0 360 660"');
const diagram = diagramStart === -1 ? "" : map.slice(diagramStart, map.indexOf("</svg>", diagramStart));

test("garden and Inside view buttons are at the top of Home, once only", () => {
  const trueMessage = home.indexOf("This is your personal journey, your personal cottage");
  const gardenLabel = home.indexOf("Tap to open My Life Garden Pathway →");
  const insideLabel = home.indexOf("Tap to open Inside view →");
  const share = home.indexOf("<ShareButton />");
  assert.ok(gardenLabel > trueMessage, "the garden button must come right after the cottage and the true message");
  assert.ok(insideLabel > gardenLabel, "Inside view must sit right after the garden button");
  assert.ok(share > insideLabel, "both must sit before Share, at the top of Home");
  assert.equal((home.match(/Tap to open My Life Garden Pathway →/g) ?? []).length, 1, "no duplicate garden button at the bottom of Home");
  assert.equal((home.match(/Tap to open Inside view →/g) ?? []).length, 1, "no duplicate Inside view button at the bottom of Home");
});

test("the Map shows our real cottage, with the caption Richard liked", () => {
  assert.ok(map.includes("Your cottage — where every path begins, warm and cozy from the get-go."), "the Map must keep the cottage caption Richard liked, word for word");
  assert.ok(map.includes('src={welcomeCottage}'), "the Map cottage must be our real cottage image, not a generic cottage");
  assert.ok(!map.includes("myLifeGardenMap"), "the old generated map photo must be gone from the Map");
});

test("the diagram itself shows the gazebo branch, all eight dead ends, and infinity", () => {
  assert.ok(diagram.length > 0, "the Map must have a full branching diagram SVG");
  assert.ok(diagram.includes("Gazebo"), "the diagram must show the gazebo branch");
  assert.ok(diagram.includes("quiet time"), "the gazebo branch must be for quiet time");
  assert.ok(diagram.includes("🏆 🏆 🏆"), "the gazebo must show multiple trophies in the diagram");
  for (const deadEnd of ["Alcohol", "Smoking", "Gambling", "Drugs", "Codependency", "Food", "Screens", "Feeling", "Unwell?"]) {
    assert.ok(diagram.includes(deadEnd), `the diagram itself must show the ${deadEnd} dead end`);
  }
  assert.equal((diagram.match(/🏆 on a stool/g) ?? []).length, 8, "each of the eight dead ends must show a trophy on a wooden stool in the diagram");
  assert.ok(diagram.includes("Longevity → ∞"), "the diagram must show Longevity going on to infinity");
  assert.ok(diagram.includes("the only infinite path") || diagram.includes("Longevity"), "the diagram must mark Longevity as the infinite path");
  // Trophies along the Longevity path, not just at the end — at
  // least two trophy marks on the trunk below the dead ends.
  const longevityTrophies = (diagram.match(/🏆/g) ?? []).length;
  assert.ok(longevityTrophies >= 8 + 3 + 3, `the diagram must show trophies at the dead ends, in the gazebo, and along Longevity (found ${longevityTrophies} trophy marks)`);
});
