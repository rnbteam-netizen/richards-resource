// My Life Garden Pathway — favourite books & your own photos
// for the frames (Richard, 2026-11-26), fourth piece,
// source-level tests. Ask for favourite books, and books they
// would like to read, and add reasonable facsimiles to the
// bookshelf in the Cozy Room — a book spine with the title, in
// its own colours, never an exact cover copy. Add one at a time,
// remove if they want. Tap an empty picture frame, pick a photo
// from their own photo library, and it takes that frame's place.
// First view still has a few empty frames; they fill as they
// choose. Both stay on this phone only, nothing is sent anywhere,
// no account. Path expansion / quit day and weeds turning to
// flowers are built in the garden and the Map (fifth piece,
// 2026-11-26). Held, NOT built here: badges, points for weeds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const cozy = src.slice(src.indexOf("const LIFE_GARDEN_BOOKS_KEY"), src.indexOf("function HomePage("));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));

test("favourite books: ask, add one at a time, a spine facsimile, remove", () => {
  assert.ok(cozy.includes("richards-resource:life-garden:books:v1"), "books must be saved under their own localStorage key");
  assert.ok(cozy.includes("Your bookshelf"), "the Cozy Room must have a Your bookshelf section");
  assert.ok(cozy.includes("A favourite book"), "the book box must offer a favourite book");
  assert.ok(cozy.includes("A book I would like to read"), "the book box must offer a book they would like to read");
  assert.ok(cozy.includes("Add a book"), "there must be an Add a book button");
  assert.ok(cozy.includes("book spine"), "a book must join as a book spine with the title");
  assert.ok(cozy.includes("Nothing is an exact cover copy"), "the bookshelf must say plainly that nothing is an exact cover copy");
  assert.ok(cozy.includes("Remove"), "each book must be removable");
  assert.ok(cozy.includes("min-h-14"), "the book box must use big, easy taps");
  assert.ok(room.includes("Your bookshelf"), "the bookshelf must live in the Cozy Room, after the trophies");
  assert.ok(room.indexOf('Section title="Trophies in your Cozy Room"') < room.indexOf('Section title="Your bookshelf"'), "the bookshelf must come after the trophies in the Cozy Room");
});

test("picture frames: a few empty frames first, tap to pick from your own photo library", () => {
  assert.ok(cozy.includes("richards-resource:life-garden:frames:v1"), "photos must be saved under their own localStorage key");
  assert.ok(cozy.includes("Your picture frames"), "the Cozy Room must have a Your picture frames section");
  assert.ok(cozy.includes("GARDEN_FRAME_COUNT = 4"), "there must be a few empty frames — four");
  assert.ok(cozy.includes("Empty frame"), "an empty frame must say it is empty");
  assert.ok(cozy.includes("tap a frame"), "the frames must say to tap a frame");
  assert.ok(cozy.includes("photo library"), "the frames must say to pick from your own photo library");
  assert.ok(cozy.includes('accept="image/*"'), "the frame picker must accept photos only");
  assert.ok(cozy.includes("Remove photo"), "a filled frame must be removable");
  assert.ok(cozy.includes("nothing is sent anywhere"), "the frames must say plainly that nothing is sent anywhere");
});

test("photos are shrunk before they are kept, so a big photo cannot fill the phone", () => {
  assert.ok(cozy.includes("downscaleGardenPhoto"), "a photo must be shrunk before it is kept");
  assert.ok(cozy.includes("600"), "a kept photo must be shrunk to a small size");
  assert.ok(cozy.includes("image/jpeg"), "a kept photo must be stored as a small JPEG");
  assert.ok(cozy.includes("too big to keep"), "a photo too big to keep must say so gently, not fail silently");
});

test("books and photos are local only, and build nothing held for later", () => {
  assert.ok(cozy.includes("stay on this phone only"), "books and photos must stay on this phone only");
  assert.ok(!cozy.includes("http"), "the books and frames must not hotlink anything");
  const code = cozy.replace(/^\/\/.*$/gm, "");
  for (const banned of ["badge", "weed pile"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `books and frames must not build "${banned}" yet`);
  }
  assert.ok(!code.includes("award("), "books and frames must not award points");
});
