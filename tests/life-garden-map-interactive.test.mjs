// My Life Garden Pathway — the Map diagram itself is interactive
// (Richard, 2026-11-26): "I thought the map was interactive but
// didn't seem to be." It wasn't — the diagram SVG was aria-hidden
// with no click handlers at all; only the list below it was
// tappable. Now every branch in the diagram is a big tappable
// button that opens its stop (with its option, e.g. "No drinking
// problem", and its trophy), and the stop scrolls into view.
// The list below uses the same opener. Local only, nothing sent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("/* ---------- My Life Garden Pathway — books & photos"));
const diagramStart = map.indexOf('<svg viewBox="0 0 360 660"');
const diagram = diagramStart === -1 ? "" : map.slice(diagramStart, map.indexOf("</svg>", diagramStart));

test("the diagram is not hidden from assistive tech, and says tap a branch", () => {
  assert.ok(!diagram.includes("aria-hidden"), "the diagram must not be aria-hidden — it is interactive now");
  assert.ok(map.includes("Tap a branch on the map — it opens."), "the Map must say plainly to tap a branch");
});

test("every diagram branch is a tappable button that opens its stop", () => {
  for (const id of ["gazebo", "alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing", "longevity"]) {
    assert.ok(diagram.includes(`onClick={() => openStop("${id}")}`), `the diagram must have a tappable branch for "${id}"`);
    assert.ok(diagram.includes(`aria-label="Tap to open`), `each diagram branch must say it is tappable`);
  }
  assert.equal((diagram.match(/role="button"/g) ?? []).length, 10, "there must be ten tappable branches in the diagram (gazebo, eight dead ends, longevity)");
  assert.ok(map.includes("const openStop = (id: string)"), "there must be one shared opener for diagram and list");
  assert.ok(map.includes("scrollIntoView"), "opening a stop from the diagram must scroll it into view");
  assert.ok(map.includes("garden-map-stop-${stop.id}"), "each stop must have an id the diagram can scroll to");
});

test("opening a stop still earns a trophy with Richard's exact wording", () => {
  assert.ok(map.includes("Congratulations, you have your first trophy for your Cozy Room."), "the first-trophy wording must be Richard's exact words");
  assert.ok(map.includes("Congratulations, you have another trophy for your Cozy Room"), "the another-trophy wording must be Richard's exact words");
  assert.ok(src.includes('"No drinking problem"'), "the Alcohol stop must offer 'No drinking problem'");
});
