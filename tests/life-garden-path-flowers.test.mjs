// My Life Garden Pathway — path expansion / quit day & weeds
// turning to flowers (Richard, 2026-11-26), fifth piece,
// source-level tests. A single path can expand: a quit day —
// set on the relevant tab, or picked here in the garden —
// stretches a path out with steps and milestones, longer for
// someone struggling, not a dead end right away. A quit day in
// the past still counts (already in recovery, staying stopped).
// Weed patches beside the path turn to flowers as they are
// cleared, starting at the cottage front steps and working
// outward; even after every box is ticked, weeds stay right
// before the cottage until you keep using the app, and they
// grow back if you stay away — maintenance, not punishment.
// All local only, nothing sent anywhere, no account, no new
// points. Held, NOT built here: badges, points for weeds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const garden = src.slice(src.indexOf("const LIFE_GARDEN_ITEMS"), src.indexOf("function HomePage("));
const gardenView = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));
const pathFlowers = src.slice(src.indexOf("/* ---------- My Life Garden Pathway — path expansion & weeds to flowers"), src.indexOf("function LifeGardenPage("));
const steps = src.slice(src.indexOf("function GardenPathSteps"), src.indexOf("function GardenPathStrip"));
const strip = src.slice(src.indexOf("function GardenPathStrip"), src.indexOf("function LifeGardenPage("));

test("quit day: set on the tab or picked in the garden, saved local only", () => {
  assert.ok(pathFlowers.includes("richards-resource:life-garden:quit-days:v1"), "quit days must be saved under their own localStorage key");
  assert.ok(gardenView.includes("Pick a quit day for"), "the map must let you pick a quit day for a path");
  assert.ok(gardenView.includes("Save my quit day"), "there must be a Save my quit day button");
  assert.ok(gardenView.includes("Clear"), "a garden quit day must be clearable");
  assert.ok(gardenView.includes("tabProfile?.quitDate"), "a quit day already set on the tab must count in the garden");
  assert.ok(gardenView.includes("Your quit day on the"), "a quit day already set on the tab must be shown in the garden");
  assert.ok(gardenView.includes("either one counts"), "the garden must say a quit day set on the tab or picked here both count");
});

test("a quit day in the past still counts — already in recovery, staying stopped", () => {
  assert.ok(gardenView.includes("A quit day in the past still counts"), "the garden must say a past quit day still counts");
  assert.ok(gardenView.includes("already in recovery, staying stopped"), "a past quit day must be framed as already in recovery, staying stopped");
  assert.ok(pathFlowers.includes("daysUntilGardenDate"), "a signed days-until helper must tell a past quit day from a future one");
  assert.ok(steps.includes("Your quit day was"), "a past quit day must be shown as walked days on the path");
  assert.ok(steps.includes("The path ahead is long"), "a future quit day must show the long path ahead");
});

test("a single path expands: short without a quit day, milestone stones with one", () => {
  for (const [days, label] of [[0, "Quit day — you chose this path"], [1, "One day"], [7, "One week"], [30, "One month"], [90, "Three months"], [365, "One year"]]) {
    assert.ok(pathFlowers.includes(`days: ${days}`), `there must be a milestone at ${days} days`);
    assert.ok(pathFlowers.includes(`"${label}"`), `there must be a milestone labelled "${label}"`);
  }
  assert.ok(steps.includes("three stepping stones"), "with no quit day the path must be short — three stepping stones");
  assert.ok(gardenView.includes("stretched out with steps to walk"), "with a quit day the path must stretch out with steps");
  assert.ok(steps.includes("not a dead end right away"), "an expanded path must not be a dead end right away");
  assert.ok(steps.includes("steps reached"), "the path must show how many steps have been reached");
  assert.ok(gardenView.includes("No judging here, and no punishment for a slip"), "the path must say plainly there is no judging and no punishment for a slip");
});

test("weeds turn to flowers on cleared paths, from the cottage steps outward", () => {
  assert.ok(strip.includes("Your pathway, from the cottage steps"), "the garden list must show the pathway, from the cottage steps");
  assert.ok(strip.includes("Patches of weeds beside the path turn to flowers"), "patches must turn to flowers as they are cleared");
  assert.ok(strip.includes("starting at the cottage front steps and working outward"), "clearing must start at the cottage front steps and work outward");
  assert.ok(strip.includes("patches in flower"), "the pathway must count how many patches are in flower");
  assert.ok(gardenView.includes("in flower"), "a cleared patch must show as in flower");
  assert.ok(gardenView.includes("weeds still beside this path"), "an uncleared patch must still show weeds");
  assert.ok(gardenView.includes(" in flower 🌸"), "the map must show each stop's patches in flower");
});

test("even after every box, weeds stay right before the cottage — and grow back", () => {
  assert.ok(strip.includes("Right before the cottage"), "there must be a patch right before the cottage");
  assert.ok(strip.includes("Even with every box ticked, a few weeds stay right before the cottage"), "even with every box ticked, weeds must stay right before the cottage");
  assert.ok(strip.includes("They clear when you keep using the app"), "the cottage patch must clear only when you keep using the app");
  assert.ok(pathFlowers.includes("GARDEN_COTTAGE_VISITS_TO_BLOOM = 3"), "the cottage patch must need a few visits — three");
  assert.ok(pathFlowers.includes("GARDEN_COTTAGE_BLOOM_DAYS = 7"), "the cottage patch must need a recent visit — within seven days");
  assert.ok(strip.includes("Weeds grow back if you stay away for a while"), "weeds must grow back if you stay away");
  assert.ok(strip.includes("maintenance, not punishment"), "regrowth must be framed as maintenance, not punishment");
  assert.ok(strip.includes("Come back, and the flowers return"), "coming back must bring the flowers back");
});

test("path expansion and flowers are local only, and build nothing held for later", () => {
  assert.ok(gardenView.includes("nothing is sent anywhere"), "the pathway must say plainly that nothing is sent anywhere");
  assert.ok(pathFlowers.includes("richards-resource:life-garden:visits:v1"), "visits must be saved under their own localStorage key");
  const code = garden.replace(/^\/\/.*$/gm, "");
  for (const banned of ["badge", "weed pile"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `the garden must not build "${banned}" yet`);
  }
  assert.ok(!gardenView.includes("award("), "the garden must not award points");
});
