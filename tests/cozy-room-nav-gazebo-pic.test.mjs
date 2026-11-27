// Cozy Room nav point + gazebo pic first (Richard, 2026-11-27):
//   "add a Cozy Room nav point. That makes more sense" — he had
//   to do a bit of scrolling and buttons to find the Cozy Room,
//   and it is one of our best features.
//   "it would be awesome to first see the beautiful gazebo Pic
//   when I tap gazebo and I then scroll down for features."
// Both are App-level / Map-panel changes, local only, nothing
// deployed, nothing pushed. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchApp, SEARCH_INDEX } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const app = src.slice(src.indexOf("export function App()"));
const nav = src.slice(src.indexOf('<nav aria-label="Sections"'), src.indexOf("</nav>", src.indexOf('<nav aria-label="Sections"')) + 7);
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));

test("Cozy Room nav point sits at the top, next after Site Map, always visible", () => {
  assert.ok(nav.includes("Cozy Room"), "there must be a Cozy Room button in the top tab nav");
  assert.ok(nav.includes('ariaLabel="Cozy Room — see inside my Cozy Room"'), "the Cozy Room button must say plainly that it opens the inside view");
  const cozyAt = nav.indexOf('ariaLabel="Cozy Room — see inside my Cozy Room"');
  assert.ok(cozyAt > 0, "the Cozy Room button must be in the nav");
  const homeAt = nav.indexOf('TabIcon id="home"');
  const siteMapAt = nav.indexOf('ariaLabel="Site Map — open the trail map"');
  const restAt = nav.indexOf('TABS.filter((t) => t.id !== "home")');
  assert.ok(homeAt !== -1 && homeAt < siteMapAt, "Home must come first");
  assert.ok(siteMapAt !== -1 && siteMapAt < cozyAt, "Site Map must come before Cozy Room");
  assert.ok(restAt !== -1 && cozyAt < restAt, "Cozy Room must come before the rest of the tabs");
  assert.ok(nav.includes("onClick={openCozyRoom}"), "tapping Cozy Room must call openCozyRoom");
  assert.ok(nav.includes("🛋️"), "the Cozy Room button must carry a mark so it reads as a room at a glance");
  // It is a real top button in its own right, not a conditional
  // tucked inside the tab loop.
  assert.ok(!nav.includes('t.id === "home"'), "the Cozy Room button must not be a conditional inside the tab loop");
});

test("Cozy Room nav opens the real Cozy Room, immediately, at the top — no second room", () => {
  assert.equal((src.match(/function CozyRoomPage\(/g) ?? []).length, 1, "there must be exactly one CozyRoomPage — no second, different room");
  assert.ok(app.includes("const [cozyRoomOpen, setCozyRoomOpen] = useState(false)"), "the Cozy Room must be App-level view state, not a tab");
  assert.ok(app.includes("<CozyRoomPage"), "the nav Cozy Room must reuse CozyRoomPage");
  assert.ok(app.includes("onGoHome={closeCozyRoom}"), "the standalone Cozy Room must close back through closeCozyRoom");
  const openAt = app.indexOf("const openCozyRoom");
  assert.ok(openAt !== -1, "there must be an openCozyRoom opener");
  assert.ok(app.slice(openAt, openAt + 400).includes("scrollTo(0, 0)"), "opening the Cozy Room must scroll to the top, so it pops up at its heading");
  assert.ok(room.includes("Inside view — my Cozy Room"), "the Cozy Room must still be headed Inside view — my Cozy Room");
});

test("Cozy Room nav works from any tab, and going to a tab closes it, with a clear way back", () => {
  const goAt = app.indexOf("const goToTab = (t: TabId) => {");
  assert.ok(app.slice(goAt, goAt + 300).includes("setCozyRoomOpen(false)"), "goToTab must close the Cozy Room");
  assert.ok(nav.includes("setCozyRoomOpen(false)"), "tapping a tab button must close the Cozy Room");
  assert.ok(app.includes("const [cozyRoomReturnTab, setCozyRoomReturnTab] = useState<TabId>(\"home\")"), "the App must remember the tab the Cozy Room was opened from");
  assert.ok(app.includes("setCozyRoomReturnTab(tab)"), "opening the Cozy Room must record the tab you came from");
  assert.ok(app.includes("setTab(cozyRoomReturnTab)"), "closing the Cozy Room must go back to the tab you came from");
  assert.ok(app.includes("`← Back to ${LAST_PLACE_LABELS[cozyRoomReturnTab]}`"), "the back button must name the tab it goes back to");
  assert.ok(app.includes("backLabel={cozyRoomReturnTab"), "the standalone Cozy Room must be given that back label");
  // "See the Map" from the standalone Cozy Room opens the trail map.
  assert.ok(app.includes("onGoMap={() => { setCozyRoomOpen(false); openSiteMap(); }}"), "See the Map from the Cozy Room must open the Site Map");
  // Opening the Site Map closes the Cozy Room, and vice versa — only one overlay at a time.
  const siteMapAt = app.indexOf("const openSiteMap");
  const openAt = app.indexOf("const openCozyRoom");
  assert.ok(app.slice(siteMapAt, siteMapAt + 400).includes("setCozyRoomOpen(false)"), "opening the Site Map must close the Cozy Room");
  assert.ok(app.slice(openAt, openAt + 400).includes("setSiteMapOpen(false)"), "opening the Cozy Room must close the Site Map");
});

test("search finds the Cozy Room: cozy room, trophy, cottage inside", () => {
  const entry = SEARCH_INDEX.find((e) => e.id === "cozy-room");
  assert.ok(entry, "the search index must have a cozy-room entry");
  assert.equal(entry.title, "My Cozy Room", "the search result must be titled My Cozy Room");
  assert.ok(entry.openCozyRoom, "the cozy-room entry must be flagged to open the Cozy Room, not a tab");
  for (const q of ["cozy room", "cozy", "trophy", "trophies"]) {
    const results = searchApp(q);
    assert.ok(results.some((r) => r.id === "cozy-room"), `searching "${q}" must find the Cozy Room`);
    assert.ok(results.find((r) => r.id === "cozy-room")?.openCozyRoom, `the "${q}" Cozy Room result must open the Cozy Room`);
  }
  assert.ok(src.includes("onOpenCozyRoom={openCozyRoom}"), "the search box must be wired to open the Cozy Room");
  assert.ok(src.includes("if (r.openCozyRoom && onOpenCozyRoom)"), "a Cozy Room search result must open the Cozy Room, not a tab");
  assert.ok(src.includes('"Cozy Room →"'), "a Cozy Room search result must be labelled as the Cozy Room");
});

test("tapping Gazebo shows the beautiful gazebo pic first, then the features below it", () => {
  // The open Gazebo stop must show the garden picture — the one
  // with the octagonal gazebo off to the side — big, before the
  // Visit link and the quiet-moment features, so the first thing
  // you see is the gazebo, and you scroll down for the features.
  // No new image: the bundled garden picture is reused; the
  // snapshot cannot carry binary.
  // Update (Richard, 2026-11-27): his screenshot showed the
  // heading text above the picture, so the pic was second, not
  // first. The picture now renders BEFORE the stop button /
  // heading, at the very top of the open Gazebo stop — not
  // inside the panel below the heading.
  const stops = map.slice(map.indexOf("GARDEN_MAP_STOPS.map"), map.indexOf("</ul>", map.indexOf("GARDEN_MAP_STOPS.map")));
  assert.ok(stops.includes("stop.id === \"gazebo\""), "the Gazebo stop must have its own picture block");
  const picAt = stops.indexOf("The gazebo in My Life Garden Pathway");
  assert.ok(picAt !== -1, "the Gazebo stop must show the gazebo picture, with its own alt text");
  assert.ok(stops.slice(0, picAt).includes("src={myLifeGarden}"), "the gazebo picture must be the bundled garden picture");
  const headingAt = stops.indexOf("{stop.label}");
  assert.ok(headingAt !== -1 && picAt < headingAt, "the gazebo picture must come before the stop heading, so it is truly first, not second");
  const visitAt = stops.indexOf("Visit {tabLabel} →");
  assert.ok(visitAt !== -1, "the Gazebo stop must still offer its Visit link to Peace of Mind");
  assert.ok(picAt < visitAt, "the gazebo picture must come before the Visit link, so it is seen first");
  assert.ok(stops.includes("The gazebo — a quiet place, off to the side of the path."), "the gazebo picture must carry its caption");
  // The quiet-moment feature is still below, after the picture.
  const featureAt = stops.indexOf("What is already true for you?");
  assert.ok(featureAt !== -1 && picAt < featureAt, "the features must come after the gazebo picture, to scroll down to");
  // Only the Gazebo stop gets the picture — the other stops are unchanged.
  assert.ok(!stops.includes("stop.id === \"alcohol\""), "the picture block must be Gazebo-only, not on every stop");
  // And it must not be duplicated inside the panel below the heading.
  assert.equal((stops.match(/The gazebo in My Life Garden Pathway/g) ?? []).length, 1, "the gazebo picture must appear once, above the heading, not twice");
});
