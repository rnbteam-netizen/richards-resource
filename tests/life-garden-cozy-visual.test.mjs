// My Life Garden Pathway — the Cozy Room, seen, not listed
// (Richard, 2026-11-26), seventh piece, source-level tests.
// Make it more intuitive, less reading: trophies earned and
// personal photos chosen should actually APPEAR in the room
// itself — trophies on a wooden shelf in the picture, photos in
// the frames on the walls, books as spines on the bookshelf at
// the foot of the picture. First view is still sparse: an empty
// trophy shelf, empty frames, an empty bookshelf. Tap a frame in
// the picture to pick a photo for it. Shorter wording elsewhere
// in the garden, with Richard's exact intro, the Map caption
// and the Dog/Cat lines kept word for word. Local only, nothing
// sent anywhere, no account, no new points. Held, NOT built
// here: points for weeds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const cozy = src.slice(src.indexOf("function CozyRoomVisual"), src.indexOf("function HomePage("));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));
const visual = src.slice(src.indexOf("function CozyRoomVisual"), src.indexOf("function CozyRoomPage("));

test("trophies actually appear on a shelf in the room picture", () => {
  assert.ok(visual.includes("CozyRoomVisual"), "there must be a visual Cozy Room that shows things in the room");
  assert.ok(room.includes("<CozyRoomVisual"), "the Cozy Room page must show the visual room, not just the bare photo");
  assert.ok(visual.includes("trophies"), "the visual room must take the earned trophies");
  assert.ok(visual.includes("🏆"), "earned trophies must appear as trophies in the room");
  assert.ok(visual.includes("on the shelf in your Cozy Room"), "trophies must sit on a shelf in the room");
  assert.ok(room.includes("on the shelf in the picture above"), "the Trophies section must point at the shelf in the picture, not list them below");
  // No text list of trophies any more — the picture is the list.
  const trophiesSection = room.slice(room.indexOf('Section title="Trophies in your Cozy Room"'), room.indexOf('Section title="Your bookshelf"'));
  assert.ok(!trophiesSection.includes("<ul"), "the Trophies section must not be a text list any more");
});

test("photos actually appear in the frames on the walls, books on the bookshelf", () => {
  assert.ok(visual.includes("on the wall"), "photos must sit in frames on the walls of the room");
  assert.ok(visual.includes("tap to add a photo"), "an empty frame in the picture must say to tap to add a photo");
  assert.ok(visual.includes('accept="image/*"'), "a frame in the picture must open the photo library");
  assert.ok(visual.includes("photo library"), "a frame in the picture must say photo library");
  assert.ok(visual.includes("gardenBookColour"), "books in the picture must use their own spine colours");
  assert.ok(visual.includes("on the bookshelf in your Cozy Room"), "books must stand on the bookshelf in the room");
  assert.ok(room.includes("Tap Add a book — a book spine joins the shelf"), "the bookshelf wording must be short: tap, add, a spine joins the shelf");
});

test("first view is still sparse: empty trophy shelf, empty frames, empty bookshelf", () => {
  assert.ok(visual.includes("empty wooden shelf"), "with no trophies the room must show an empty wooden shelf");
  assert.ok(visual.includes("empty bookshelf"), "with no books the room must show an empty bookshelf");
  assert.ok(visual.includes("Empty frame"), "with no photos the frames in the picture must still be empty frames");
  assert.ok(room.includes("first view: no trophies yet"), "the first view must still have no trophies yet");
  assert.ok(room.includes("room for 100+ trophies"), "the room must still have room for 100+ trophies");
});

test("less reading: short lines, Richard's exact words kept", () => {
  assert.ok(src.includes("Welcome friend. This is your garden of Life. We all choose our own path. You have chosen yours. We are here to help guide you to a happier place, a happier you. Some paths you may have already explored and others await. Enjoy the journey. Peace."), "Richard's exact intro verbiage must stay word for word");
  assert.ok(src.includes("Our cottage — where every path begins, warm and cozy from the get-go."), "the Map caption must stay word for word");
  assert.ok(src.includes("Loyal, joyful, and always glad you're here"), "the Dog line must stay word for word");
  assert.ok(src.includes("Quiet, independent, and knows when to curl up close"), "the Cat line must stay word for word");
  assert.ok(room.includes("Tap a frame, pick a photo from your own photo library"), "the frames wording must be one short line");
});

test("the visual room is local only, and builds nothing held for later", () => {
  assert.ok(cozy.includes("nothing is sent anywhere"), "the room must say plainly that nothing is sent anywhere");
  assert.ok(cozy.includes("stay on this phone only"), "the room must stay on this phone only");
  assert.ok(!cozy.includes("http"), "the visual room must not hotlink anything");
  const code = cozy.replace(/^\/\/.*$/gm, "");
  for (const banned of ["badge", "weed pile"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `the visual room must not build "${banned}" yet`);
  }
  assert.ok(!cozy.includes("award("), "the visual room must not award points");
});
