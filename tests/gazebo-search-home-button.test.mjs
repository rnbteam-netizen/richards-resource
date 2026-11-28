// The Gazebo — search + Home button (Richard, 2026-11-28):
//   "When I search gazebo, I don't get it. Maybe gazebo
//   should also be a button on the home screen. Is this too
//   much for MPT or are we having fun?"
// — we're having fun, not too much. Before this, search had
// no dedicated gazebo entry — only the Site Map snippet
// mentioning "the gazebo" — so "gazebo" ranked the Site Map
// first and the gazebo itself was easy to miss. Now there is
// a dedicated entry that opens the Map on the gazebo, and a
// Gazebo button on Home, right after the garden and the
// Cozy Room. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchApp, SEARCH_INDEX } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const app = src.slice(src.indexOf("export function App()"));
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
const searchBox = src.slice(src.indexOf("function SearchBox("), src.indexOf("/* ---------- My Muse"));

test("the search index has a dedicated gazebo entry", () => {
  const entry = SEARCH_INDEX.find((e) => e.id === "gazebo");
  assert.ok(entry, "the search index must have a gazebo entry");
  assert.equal(entry.title, "The Gazebo — quiet time", "the search result must be titled The Gazebo — quiet time");
  assert.ok(entry.openGazebo, "the gazebo entry must open the gazebo, not a tab");
  assert.ok(entry.keywords.includes("gazebo"), "the keywords must include gazebo");
  assert.ok(entry.keywords.includes("quiet"), "the keywords must include quiet");
  assert.ok(entry.keywords.includes("chill"), "the keywords must include chill");
  assert.ok(entry.keywords.includes("break"), "the keywords must include break");
  assert.ok(entry.keywords.includes("mindful"), "the keywords must include mindful");
  assert.ok(entry.keywords.includes("peaceful"), "the keywords must include peaceful");
  assert.ok(entry.snippet.includes("Give myself a break — Chill in Gazebo for a bit"), "the snippet must carry Richard's break wording");
  assert.ok(entry.snippet.includes("Pinch with two fingers to zoom in"), "the snippet must mention pinch-to-zoom");
});

test("searching gazebo returns the gazebo entry first", () => {
  assert.equal(searchApp("gazebo")[0].id, "gazebo", "searching “gazebo” must rank the gazebo first");
  assert.ok(searchApp("gazebo").some((r) => r.id === "gazebo"), "searching “gazebo” must return a gazebo result");
  assert.ok(searchApp("chill").some((r) => r.id === "gazebo"), "searching “chill” must find the gazebo");
  assert.ok(searchApp("quiet time").some((r) => r.id === "gazebo"), "searching “quiet time” must find the gazebo");
  assert.equal(searchApp("gazebo")[0].openGazebo, true, "the gazebo result must carry the openGazebo flag");
});

test("the search box routes a gazebo result to openGazebo", () => {
  assert.ok(searchBox.includes("onOpenGazebo"), "the search box must take a gazebo opener");
  assert.ok(searchBox.includes("if (r.openGazebo && onOpenGazebo)"), "a gazebo search result must open the gazebo, not a tab");
  assert.ok(searchBox.includes('"Gazebo →"'), "a gazebo search result must be labelled as the gazebo");
  assert.ok(app.includes("<SearchBox onGo={goToTab} onOpenSiteMap={openSiteMap} onOpenCozyRoom={openCozyRoom} onOpenGazebo={openGazebo} />"), "the App must wire the search box to openGazebo");
});

test("Home has a Gazebo button, after the garden and the Cozy Room", () => {
  assert.ok(home.includes("The Gazebo — quiet time"), "Home must have a Gazebo button");
  assert.ok(home.includes("Tap to open The Gazebo →"), "the Home Gazebo button must say how to open it");
  assert.ok(home.includes("A quiet place, off to the side of the path"), "the Home Gazebo button must describe the quiet place");
  assert.ok(home.includes("Give myself a break — Chill in Gazebo for a bit"), "the Home Gazebo button must carry Richard's break wording");
  // Order on Home: garden, then Cozy Room, then the Gazebo.
  const gardenAt = home.indexOf("My Life Garden Pathway");
  const cozyAt = home.indexOf("Inside view — my Cozy Room");
  const gazeboAt = home.indexOf("The Gazebo — quiet time");
  assert.ok(gardenAt > -1 && cozyAt > gardenAt && gazeboAt > cozyAt, "the Gazebo button must sit after the garden and the Cozy Room on Home");
  // The button opens the Map on the gazebo, pic first — the
  // same route as the Home Cozy Room's mindful-break button.
  assert.ok(home.includes('setGardenInitialView("map"); setGardenGazeboRequest((n) => n + 1); setGardenOpen(true);'), "the Home Gazebo button must open the Map with the gazebo stop open");
});

test("the gazebo is still not a top tab", () => {
  const tabs = src.slice(src.indexOf("const TABS"), src.indexOf("function SearchBox("));
  assert.ok(!tabs.includes('"gazebo"'), "the gazebo must not become a new top tab");
});
