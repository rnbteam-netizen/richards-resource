// Gazebo pic truly first + weedy trail pic reversed (Richard, 2026-11-27):
//   1. "Yes to both please" — pic first, truly first: his screenshot
//      showed "The gazebo — quiet time" / "BRANCH — QUIET TIME"
//      text above the picture, so the pic was second, not first.
//      Now the picture renders BEFORE the stop button / heading,
//      at the very top of the open Gazebo stop.
//   2. "This weedy trail pic should be seen reversed. Leading
//      from cottage to the field" — the garden / gazebo pic
//      (my-life-garden.webp, weedy trail with stepping stones)
//      is flipped horizontally, cottage first, path leading out
//      to the field, not field heading towards the cottage.
//      Same bundled image, CSS flip only, no new binary:
//      the snapshot cannot carry binary.
// Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function GardenMapPage("));

test("gazebo pic is truly first: before the Gazebo heading, Visit link and features", () => {
  const stops = map.slice(map.indexOf("GARDEN_MAP_STOPS.map"), map.indexOf("</ul>", map.indexOf("GARDEN_MAP_STOPS.map")));
  const picAt = stops.indexOf("The gazebo in My Life Garden Pathway");
  assert.ok(picAt !== -1, "the open Gazebo stop must show the gazebo picture");
  // The picture block is gated on the open Gazebo stop, before the button.
  const gateAt = stops.indexOf('open && stop.id === "gazebo"');
  assert.ok(gateAt !== -1 && gateAt < picAt, "the gazebo picture must only show when the Gazebo stop is open");
  const headingAt = stops.indexOf("{stop.label}");
  assert.ok(headingAt !== -1 && picAt < headingAt, "the gazebo picture must come before the 'The gazebo — quiet time' heading");
  assert.ok(picAt < stops.indexOf("Visit {tabLabel} →"), "the gazebo picture must come before the Visit Peace of Mind link");
  assert.ok(picAt < stops.indexOf("What is already true for you?"), "the gazebo picture must come before the features, to scroll down to");
  assert.ok(stops.includes("The gazebo — a quiet place, off to the side of the path."), "caption unchanged");
  assert.equal((stops.match(/The gazebo in My Life Garden Pathway/g) ?? []).length, 1, "the gazebo picture must appear once, not duplicated in the panel");
  // The panel below the heading must no longer carry its own copy of the picture.
  const panel = map.slice(map.indexOf("{open && ("), map.indexOf("{isQuitStop && ("));
  assert.ok(!panel.includes("The gazebo in My Life Garden Pathway"), "the panel below the heading must not contain a second copy of the gazebo picture");
});

test("weedy trail pic is reversed everywhere it appears: cottage to the field", () => {
  // Every use of the bundled trail picture is flipped
  // horizontally (scaleX(-1)), so the path leads from the
  // cottage out to the field: garden first pic, its enlarged
  // zoom, and the Gazebo panel pic.
  const flipped = src.match(/src=\{myLifeGarden\}[^>]*style=\{\{ transform: "scaleX\(-1\)" \}\}/g) ?? [];
  assert.equal(flipped.length, 3, "all three uses of the trail picture must be flipped horizontally");
  assert.ok(garden.includes('style={{ transform: "scaleX(-1)" }}'), "the garden first pic must be flipped");
  assert.ok(map.includes('style={{ transform: "scaleX(-1)" }}'), "the Gazebo pic must be flipped");
  // Caption / alt text unchanged by the flip.
  assert.ok(src.includes("My Life Garden Pathway — a long pathway of small flat wooden stepping stones, with weeds bordering both sides, leading up to the cottage, with the octagonal gazebo off to the side"), "garden pic alt text unchanged");
  assert.ok(src.includes("The gazebo in My Life Garden Pathway — the beautiful octagonal gazebo off to the side of the pathway, with the cottage beyond"), "gazebo pic alt text unchanged");
  assert.ok(src.includes("The gazebo — a quiet place, off to the side of the path."), "gazebo pic caption unchanged");
  // The Cozy Room picture is a different picture and must NOT be flipped.
  assert.ok(!src.includes("src={myLifeGardenCozyRoom}") || !/src=\{myLifeGardenCozyRoom\}[^>]*scaleX\(-1\)/.test(src), "the Cozy Room picture must not be flipped");
});
