// My Life Garden Pathway — Cozy Room tap-to-enlarge
// (Richard, 2026-11-26, with a screenshot): "Really nice team.
// Well done. The tap to enlarge on the cozy room pic didn't
// enlarge.. fyi" The room picture itself was a plain div with no
// tap handler — only the separate button below it opened the
// enlarged view. And the enlarged view's inner div stopped the
// tap, so tapping the enlarged photo did nothing either, despite
// "Tap anywhere to close". Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const visual = src.slice(src.indexOf("function CozyRoomVisual"), src.indexOf("function CozyRoomPage("));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function GardenMapPage("));

test("tapping the Cozy Room picture itself opens the enlarged view", () => {
  // The visual room must take an enlarge handler and wire it to
  // the picture itself — not only to the button below it.
  assert.ok(visual.includes("onEnlarge"), "CozyRoomVisual must take an enlarge handler");
  assert.ok(visual.includes('aria-label": "My Cozy Room — tap to see it bigger"') || visual.includes('"My Cozy Room — tap to see it bigger"'), "the room picture itself must say tap to see it bigger");
  assert.ok(visual.includes("onClick: () => onEnlarge()") || visual.includes("onClick={() => onEnlarge()}"), "tapping the room picture must call the enlarge handler");
  assert.ok(room.includes("onEnlarge={() => setZoomed(true)}"), "the Cozy Room page must pass the enlarge handler to the room picture");
  assert.ok(room.includes("Tap the photo to see it bigger."), "the button below the photo must still work as a second way in");
});

test("a frame tap still picks a photo and ✕ still removes it — neither enlarges", () => {
  // Frame taps must not bubble up to the enlarge handler.
  assert.ok(visual.includes("onClick={(e) => e.stopPropagation()}"), "a tap on a frame must stop before it reaches the enlarge handler");
  assert.ok(visual.includes('accept="image/*"'), "a frame must still open the photo library");
  assert.ok(visual.includes("onClearFrame(slot)"), "the frame ✕ must still remove the photo");
  assert.ok(visual.includes("e.stopPropagation(); onClearFrame(slot)"), "tapping ✕ must stop before it reaches the enlarge handler");
});

test("tapping the enlarged Cozy Room closes it", () => {
  // The enlarged view must not stop the tap: the old inner div
  // had onClick stopPropagation, so tapping the enlarged photo
  // did nothing despite "Tap anywhere to close".
  const dialog = room.slice(room.indexOf('aria-label="My Cozy Room, enlarged"'));
  assert.ok(!dialog.includes("stopPropagation"), "the enlarged view must not stop a tap from closing it");
  assert.ok(dialog.includes("Tap anywhere to close"), "the enlarged view must still say tap anywhere to close");
  // Enlarged view is non-interactive, so a tap on a frame there
  // closes it instead of opening the photo library.
  assert.ok(dialog.includes("interactive={false}"), "the enlarged room must be shown non-interactive");
});

test("the garden first picture still enlarges — same bug, checked, not broken", () => {
  // The garden first pic is a real button around the image, and
  // its enlarged dialog closes on tap. That one worked; guard it.
  assert.ok(garden.includes('aria-label="My Life Garden Pathway — tap to see the whole photo bigger"'), "the garden first pic must stay a tappable button");
  assert.ok(garden.includes("onClick={() => setZoomed(true)}"), "tapping the garden first pic must enlarge it");
  assert.ok(garden.includes('aria-label="My Life Garden Pathway, enlarged"'), "the garden enlarged view must still exist");
});

test("the Map cottage picture promises no enlarge — no false tap target added", () => {
  const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomVisual"));
  assert.ok(!map.includes("Tap the photo to see it bigger"), "the Map cottage must not promise an enlarge it does not have");
  assert.ok(map.includes("Our cottage — where every path begins, warm and cozy from the get-go."), "the Map caption must stay word for word");
});
