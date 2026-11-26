// My Life Garden Pathway — flower pots on the cottage's big
// wrap-around porch (Richard, 2026-11-26), sixth piece,
// source-level tests. As one progresses, nice flower pots with
// flowers appear on the big wrap-around porch: not there at
// first view, one pot at a time, each time a milestone is hit,
// and no two pots are identical — each pot has its own colour,
// shape and flowers. A milestone here is patches of weeds
// turned to flowers beside the path. The pots are a small drawn
// row in the cottage's warm style, shown in the garden list and
// on the Map near the cottage — the cottage image itself is not
// changed. Tied to the patches already cleared and the trophies
// already earned, no new points. All local only, nothing sent
// anywhere, no account. Held, NOT built here: points for weeds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const garden = src.slice(src.indexOf("const LIFE_GARDEN_ITEMS"), src.indexOf("function HomePage("));
const gardenView = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));
const mapView = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
const pot = src.slice(src.indexOf("const GARDEN_PORCH_POT_MILESTONES"), src.indexOf("function LifeGardenPage("));

test("no flower pots on the big wrap-around porch at first view — the first pot appears at the first milestone", () => {
  assert.ok(pot.includes("Flower pots on the big wrap-around porch"), "there must be flower pots on the big wrap-around porch");
  assert.ok(pot.includes("No flower pots on the big wrap-around porch yet"), "at first view there must be no flower pots on the big wrap-around porch yet");
  assert.ok(pot.includes("clear a patch of weeds and the first pot will appear"), "the first pot must appear when a patch of weeds is cleared");
  assert.ok(pot.includes("GARDEN_PORCH_POT_MILESTONES = [1, 3, 5, 7, 9, 13]"), "pots must be earned at milestones of 1, 3, 5, 7, 9 and 13 patches in flower");
  assert.ok(pot.includes("gardenPorchPotsEarned"), "the pots earned must be counted from the milestones hit");
});

test("one pot at a time, each time a milestone is hit", () => {
  assert.ok(pot.includes("one pot at a time"), "pots must be earned one at a time");
  assert.ok(pot.includes("each time a milestone is hit"), "a pot must be earned each time a milestone is hit");
  assert.ok(pot.includes("The next pot comes at"), "the view must say when the next pot comes");
  assert.ok(pot.includes("gardenPorchNextMilestone"), "the next milestone must be worked out from the patches in flower");
  assert.ok(pot.includes("You have earned"), "the view must say how many pots have been earned so far");
  assert.ok(pot.includes("All six flower pots are on the big wrap-around porch"), "all six pots must be there once every milestone is hit");
});

test("no two pots are identical — each has its own colour, shape and flowers", () => {
  assert.ok(pot.includes("no two pots are alike"), "the view must say no two pots are alike");
  for (const name of ["Little terracotta pot", "Blue pot", "Tall green pot", "Cream pot", "Red pot", "Golden prize pot"]) {
    assert.ok(pot.includes(`"${name}"`), `there must be a distinct pot called "${name}"`);
  }
  assert.equal((pot.match(/potFill: "#[0-9a-f]{6}"/g) ?? []).length, 6, "there must be six pots with six different pot colours");
  assert.ok(pot.includes("potHeight: 44"), "the pots must differ in height as well as colour");
  assert.ok(pot.includes("flowers: [{ dx: 0, dy: -52"), "the first pot must have one flower");
  assert.ok(pot.includes("dx: 16, dy: -54"), "the prize pot must have several flowers");
});

test("the pots are shown in the garden list and on the Map, near the cottage", () => {
  assert.ok(gardenView.includes("<GardenPorchPot"), "the garden list must show the flower pots");
  assert.ok(mapView.includes("<GardenPorchPot"), "the Map must show the flower pots near the cottage");
  const mapDiagram = mapView.indexOf("Cottage at the top");
  const mapPot = mapView.indexOf("<GardenPorchPot");
  assert.ok(mapDiagram !== -1 && mapPot !== -1 && mapPot > mapDiagram, "on the Map the pots must come after the cottage diagram, near the cottage");
  const strip = gardenView.indexOf("<GardenPathStrip");
  const listPot = gardenView.indexOf("<GardenPorchPot");
  assert.ok(strip !== -1 && listPot !== -1 && listPot > strip, "in the garden list the pots must come after the pathway, as the path turns to flowers");
  assert.ok(!pot.includes("my-life-garden.webp"), "the pots must be a drawn element, not a change to the cottage image itself");
});

test("the flower pots are local only, and build nothing held for later", () => {
  assert.ok(pot.includes("nothing is sent anywhere"), "the pots must say plainly that nothing is sent anywhere");
  assert.ok(pot.includes("flowerCount"), "the pots must be tied to the patches already cleared");
  const code = garden.replace(/^\/\/.*$/gm, "");
  for (const banned of ["weed pile"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `the garden must not build "${banned}" yet`);
  }
  assert.ok(!gardenView.includes("award("), "the garden must not award points");
});
