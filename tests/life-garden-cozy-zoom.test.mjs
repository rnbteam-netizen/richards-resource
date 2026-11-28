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
  assert.ok(garden.includes("setCottageZoom(GAZEBO_ZOOM_RESET); setCottageZoomed(true)"), "tapping the garden first pic must enlarge it, starting at 1x");
  assert.ok(garden.includes('aria-label="My Life Garden Pathway — the cottage in the field, enlarged"'), "the garden enlarged view must still exist");
});

test("the enlarged gazebo really pinch-zooms — two fingers, 1x to 4x, drag to pan, double-tap to reset (Richard, 2026-11-28)", () => {
  // Richard: "Sorry doesn't actually get bigger it just
  // removes-ghost outs background. Can it just be like a photo,
  // I can zoom into with diagonal finger touching on my phone
  // screen?" The old enlarged view only darkened the
  // background. The helpers are pure, so their scale and pan
  // maths are asserted here; the dialog wiring is asserted
  // below. Source-level tests, like the rest of this file.
  const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomVisual"));
  assert.ok(src.includes("const GAZEBO_ZOOM_MAX = 4"), "pinch zoom must go up to 4x");
  assert.ok(src.includes("const GAZEBO_ZOOM_MIN = 1"), "pinch zoom must bottom out at 1x, never smaller");
  assert.ok(src.includes("Math.min(GAZEBO_ZOOM_MAX, Math.max(GAZEBO_ZOOM_MIN, startScale * (distance / startDistance)))"), "spreading two fingers apart must grow the picture in proportion to how far apart they move, clamped to 1x–4x");
  assert.ok(src.includes("const max = 220 * (scale - 1)"), "panning must be clamped so the picture can slide to a corner but never clean off screen, and cannot pan at all at 1x");
  const dialog = map.slice(map.indexOf('aria-label="The gazebo, enlarged"'));
  assert.ok(dialog.includes("onTouchStart={gazeboZoomTouchStart}"), "the enlarged gazebo must listen for fingers touching down");
  assert.ok(dialog.includes("onTouchMove={gazeboZoomTouchMove}"), "the enlarged gazebo must listen for fingers moving — the pinch itself");
  assert.ok(dialog.includes("onTouchEnd={gazeboZoomTouchEnd}"), "the enlarged gazebo must listen for fingers lifting — so a pinch ending never closes it");
  assert.ok(dialog.includes("touchAction: \"none\""), "the phone's own pinch-zoom must be switched off inside the enlarged view, or it fights ours");
  assert.ok(dialog.includes("translate(${gazeboZoom.x}px, ${gazeboZoom.y}px) scale(${gazeboZoom.scale})"), "the enlarged picture must actually grow and slide with the fingers, not just sit still on a dark background");
  assert.ok(dialog.includes("Pinch with two fingers to zoom in, drag to look around, double-tap to reset."), "the enlarged view must tell the visitor how to zoom, in plain words");
  assert.ok(map.includes("prev.scale > 1 ? GAZEBO_ZOOM_RESET : { scale: 2, x: 0, y: 0 }"), "a double-tap must reset a zoomed picture to 1x, or zoom a 1x picture in to 2x");
  assert.ok(map.includes("setGazeboZoom(GAZEBO_ZOOM_RESET); setGazeboZoomed(true)"), "opening the enlarged gazebo must start at 1x, never at the last visit's zoom");
  assert.ok(dialog.includes("Tap anywhere to close"), "a single tap must still close the enlarged gazebo");
  assert.ok(dialog.includes('aria-label="Close the enlarged gazebo photo"'), "the enlarged gazebo must still have its close button");
  assert.ok(map.includes("The gazebo — a quiet place, off to the side of the path."), "the gazebo caption must stay word for word");
});

test("the Map cottage now pulls up the cottage, big and pinchable (Richard, 2026-11-28)", () => {
  const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomVisual"));
  // Updated 2026-11-28: "Do we want the cottage button (start
  // here) to actually pull up the cottage?" Yes — tapping the
  // cottage at the top of the diagram, or the cottage photo
  // below it, pulls the cottage up big, pinchable like the
  // gazebo, so you start where every path begins.
  assert.ok(map.includes('aria-label="Tap to open the cottage — where every path begins"'), "the cottage button at the top of the Map diagram must open the cottage");
  assert.ok(map.includes('aria-label="The cottage — tap to see it bigger"'), "the cottage photo below the diagram must open the cottage too");
  assert.ok(map.includes('aria-label="The cottage, enlarged"'), "the enlarged cottage view must exist on the Map");
  assert.ok(map.includes("setMapCottageZoom(GAZEBO_ZOOM_RESET)"), "opening the cottage must reset its zoom to 1x");
  assert.ok(map.includes("setMapCottageZoomed(true)"), "opening the cottage must open the enlarged view");
  assert.ok(map.includes("Tap the cottage to pull it up big"), "the Map must say plainly the cottage pulls up big");
  assert.ok(map.includes("Your cottage — where every path begins, warm and cozy from the get-go."), "the Map caption must stay word for word");
  assert.ok(map.includes('aria-label="The gazebo — tap to see it bigger"'), "the gazebo enlarge must still be there too");
});
