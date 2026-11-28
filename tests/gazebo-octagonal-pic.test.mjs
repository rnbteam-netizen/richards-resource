// Gazebo pic replaced with the octagonal gazebo pic (Richard, 2026-11-27):
//   "Yes M. That's the one. Perfect. Please use that one. Replace."
//   The trail pic (my-life-garden.webp, weedy path, gazebo small
//   in the distance) is replaced in the Gazebo panel ONLY by the
//   octagonal gazebo pic (my-life-garden-gazebo.webp): octagonal
//   wooden gazebo, pyramid roof, bench with pillows / cushions
//   on the left, rocking chair on the right, candles in the
//   middle. NOT the square gazebo, NOT the pink-blossom
//   map-gazebo, NOT the trail pic. The trail pic stays, flipped,
//   for the garden first pic and its zoom. Source-level tests,
//   plus a check the new binary asset exists on disk locally
//   (it must be uploaded to GitHub via the web UI route first —
//   the snapshot cannot carry binary — before the code push).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));

test("gazebo panel uses the octagonal gazebo pic, first, before the heading, unflipped", () => {
  assert.ok(src.includes('import myLifeGardenGazebo from "./assets/my-life-garden-gazebo.webp"'), "the octagonal gazebo image must be imported from local assets");
  assert.ok(existsSync(path.join(root, "client", "src", "assets", "my-life-garden-gazebo.webp")), "the octagonal gazebo image file must exist in client/src/assets");
  const stops = map.slice(map.indexOf("GARDEN_MAP_STOPS.map"), map.indexOf("</ul>", map.indexOf("GARDEN_MAP_STOPS.map")));
  const picAt = stops.indexOf("The gazebo in My Life Garden Pathway");
  assert.ok(picAt !== -1, "the Gazebo stop must show the gazebo picture");
  assert.ok(stops.slice(0, picAt).includes("src={myLifeGardenGazebo}"), "the gazebo picture must be the octagonal gazebo pic");
  assert.ok(!stops.slice(0, picAt).includes("src={myLifeGarden}"), "the gazebo picture must not be the trail pic");
  assert.ok(stops.includes("The gazebo in My Life Garden Pathway — the beautiful octagonal wooden gazebo, with a bench with pillows and cushions, a rocking chair, and candles"), "the gazebo alt text must describe the octagonal gazebo, pillows, rocking chair and candles");
  assert.ok(stops.includes("The gazebo — a quiet place, off to the side of the path."), "gazebo pic caption unchanged");
  const headingAt = stops.indexOf("{stop.label}");
  assert.ok(headingAt !== -1 && picAt < headingAt, "the gazebo picture must come before the heading, so it is truly first");
  assert.equal((stops.match(/The gazebo in My Life Garden Pathway/g) ?? []).length, 1, "the gazebo picture must appear once, not duplicated");
  assert.ok(!/src=\{myLifeGardenGazebo\}[^>]*scaleX\(-1\)/.test(src), "the octagonal gazebo pic must not be flipped");
});

test("trail pic is NOT overwritten: garden first pic and zoom still use it, flipped", () => {
  assert.ok(src.includes('import myLifeGarden from "./assets/my-life-garden.webp"'), "the trail pic must still be imported for the garden first pic");
  assert.ok(existsSync(path.join(root, "client", "src", "assets", "my-life-garden.webp")), "the trail pic file must still exist");
  const flipped = src.match(/src=\{myLifeGarden\}[^>]*style=\{\{ transform: "scaleX\(-1\)" \}\}/g) ?? [];
  assert.equal(flipped.length, 1, "the garden first pic must still be the flipped trail pic");
  // Its zoom is the same flipped pic, now inside the pinch-zoom
  // transform (2026-11-28) — translate and scale first, then
  // scaleX(-1) — so the enlarged cottage still leads from the
  // cottage out to the field.
  assert.ok(src.includes("scale(${cottageZoom.scale}) scaleX(-1)"), "the garden zoom must still be the flipped trail pic, inside its pinch-zoom transform");
});
