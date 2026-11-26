// My Life Garden Pathway — the Map (Richard, 2026-11-26), second
// piece, source-level tests. A Map view, warm and cozy from the
// get-go, with navigation links matching all the buttons/tabs: one
// pathway from the cottage front steps, branching to the gazebo for
// quiet time, dead-end branches for drinking, smoking, gambling,
// drugs and the rest, and the longevity path going on to infinity.
// Tapping a map link shows the option for that issue (for example
// "No drinking problem"); choosing it earns a trophy for the Cozy
// Room, local only. An "Inside view" option button on Home opens
// the Cozy Room first inside view. Held, NOT built here: avatar /
// guide choice, badges, points for weeds. Favourite books and
// your own photos for the frames are built in the Cozy Room
// (fourth piece, 2026-11-26), so they are no longer held.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const map = src.slice(src.indexOf("const LIFE_GARDEN_TROPHY_KEY"), src.indexOf("function HomePage("));
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

test("map and cozy-room images are local assets, not hotlinks", () => {
  assert.ok(existsSync(path.join(root, "client", "src", "assets", "my-life-garden-map.webp")), "my-life-garden-map.webp must live in client/src/assets/");
  assert.ok(existsSync(path.join(root, "client", "src", "assets", "my-life-garden-cozy-room.webp")), "my-life-garden-cozy-room.webp must live in client/src/assets/");
  assert.ok(src.includes('import myLifeGardenMap from "./assets/my-life-garden-map.webp"'), "the map image must be imported from local assets");
  assert.ok(src.includes('import myLifeGardenCozyRoom from "./assets/my-life-garden-cozy-room.webp"'), "the cozy-room image must be imported from local assets");
  assert.ok(!map.includes("http"), "the map view must not hotlink anything");
});

test("map matches all the buttons/tabs, with the gazebo, dead ends, infinity and the Cozy Room", () => {
  for (const tab of ["alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing", "longevity", "peace"]) {
    assert.ok(map.includes(`tab: "${tab}"`), `map must have a stop for the ${tab} tab`);
  }
  assert.ok(map.includes("The gazebo — quiet time"), "map must have the gazebo branch for quiet time");
  assert.ok(map.includes("Dead end"), "map must label the dead-end branches");
  assert.ok(map.includes("to infinity"), "map must show the longevity path going on to infinity");
  assert.ok(map.includes("My Cozy Room"), "map must include the Cozy Room");
  assert.ok(map.includes("One pathway from the front steps of the cottage"), "map must start from the front steps of the cottage");
  assert.ok(map.includes("branching — dividing from the path"), "map must say branching means dividing from the path");
  assert.ok(map.includes("Visit "), "each map stop must offer a visit link to its tab");
});

test("every map link shows its option, and all 13 items are map options", () => {
  for (const item of ITEMS) assert.ok(map.includes(`"${item}"`), `map must offer "${item}" as an option`);
  assert.equal(ITEMS.length, 13, "the map must cover exactly the 13 garden items");
  assert.ok(map.includes("Map — My Life Garden Pathway"), "the map view must be headed Map — My Life Garden Pathway");
  assert.ok(map.includes("See the Map"), "the garden list must offer a See the Map button");
});

test("choosing an option earns a trophy for the Cozy Room, local only", () => {
  assert.ok(map.includes("Congratulations, you have your first trophy for your Cozy Room"), "choosing an option must congratulate them on their first trophy for the Cozy Room");
  assert.ok(map.includes("Congratulations, you have another trophy for your Cozy Room"), "a later trophy must be congratulated as another trophy for the Cozy Room");
  assert.ok(map.includes("richards-resource:life-garden:trophies:v1"), "trophies must be saved under a localStorage key");
  assert.ok(map.includes("nothing is scored yet"), "the map must say plainly that nothing is scored yet");
  assert.ok(map.includes("No calorie counting, no weighing, no judging"), "the map must keep the gentle no-counting note");
  assert.ok(!map.includes("award("), "the map must not award points");
});

test("Inside view button is an addition to the Home screen, after the garden button", () => {
  assert.ok(home.includes("Inside view — my Cozy Room"), "Home must carry an Inside view button");
  const garden = home.lastIndexOf("My Life Garden Pathway");
  const inside = home.indexOf("Inside view — my Cozy Room");
  assert.ok(garden !== -1 && inside !== -1 && inside > garden, "the Inside view button must come after the garden button on Home");
});

test("Cozy Room first view: no trophies yet, empty frames, one candle, beige rugs", () => {
  assert.ok(map.includes("no trophies yet"), "the Cozy Room first view must have no trophies yet");
  assert.ok(map.includes("empty picture frames on the walls"), "the Cozy Room first view must have a few empty picture frames on the walls");
  assert.ok(map.includes("one candle on the mantle"), "the Cozy Room must have one candle on the mantle");
  assert.ok(map.includes("beige rugs"), "the Cozy Room must have beige rugs");
  assert.ok(map.includes("books on the shorter shelf"), "the Cozy Room must have books on the shorter shelf");
  assert.ok(map.includes("two or three empty frames"), "the taller shelf must be sparse with two or three empty frames");
  assert.ok(map.includes("room for 100+ trophies"), "the Cozy Room must have room for 100+ trophies");
  assert.ok(map.includes("Tap the photo to see it bigger"), "tapping the Cozy Room photo must zoom the entire photo");
});

test("map piece builds nothing held for later: no badges", () => {
  // The books-and-photos piece (2026-11-26) DOES add favourite
  // books and your own photos for the frames, so those are no
  // longer banned here. Badges are still held for later.
  // The header comments list the held items by name, so strip
  // comment lines before checking — the check guards the code.
  const code = map.replace(/^\/\/.*$/gm, "");
  for (const banned of ["badge"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `map must not build "${banned}" yet`);
  }
});
