// My Life Garden Pathway — the two things Richard found on a
// quick peek (2026-11-26, 16:19 PST), after the Site Map button
// and the Cozy Room enlarge were already live:
//   "Took a quick peek. No trail map. Cozy Room does not expand
//   to see shelved items...."
// Both were real, and both passed the source-level tests that
// existed then, because those tests only checked that the pieces
// were present — not that they showed up where a peek lands.
// These tests check what a peek actually sees. Local only,
// nothing deployed, nothing pushed. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const app = src.slice(src.indexOf("export function App()"));
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function GardenMapPage("));
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomVisual"));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));

test("Site Map pops the trail map up at once — the diagram comes before the cottage photo", () => {
  // A quick peek showed no trail map: the cottage photo filled
  // the first screen and the diagram was below it, so a peek
  // never reached it. The diagram must now come first, right
  // under the heading, so the trail map is what you see when you
  // tap Site Map.
  const diagramAt = map.indexOf('<svg viewBox="0 0 360 660"');
  const cottageAt = map.indexOf("Your cottage — where every path begins, warm and cozy from the get-go.");
  assert.ok(diagramAt !== -1, "the Map must still have its branching diagram");
  assert.ok(cottageAt !== -1, "the Map must still have the cottage caption Richard liked, word for word");
  assert.ok(diagramAt < cottageAt, "the diagram must come before the cottage photo, so a peek sees the trail map first");
  assert.ok(map.includes("src={welcomeCottage}"), "the Map cottage must still be our real cottage image");
});

test("tapping Site Map again returns to the map, even when the garden is already open", () => {
  // After Map → garden list, tapping Site Map again left the
  // garden on the list: useState(initialView) only runs on
  // mount, so the already-open garden never heard the second
  // tap. Every Site Map tap must bump a request the garden
  // answers by going back to its initial view — an effect, not
  // a remount, so no extra visit is recorded (visits bloom the
  // cottage patch, and three re-taps must not fake three visits).
  assert.ok(app.includes("const [siteMapRequest, setSiteMapRequest] = useState(0)"), "the App must count Site Map taps");
  const openAt = app.indexOf("const openSiteMap");
  assert.ok(app.slice(openAt, openAt + 400).includes("setSiteMapRequest((n) => n + 1)"), "opening the Site Map must bump the request count");
  assert.ok(app.includes("mapRequest={siteMapRequest}"), "the Site Map garden must receive the request count");
  assert.ok(garden.includes("mapRequest?: number"), "LifeGardenPage must take the request count");
  assert.ok(garden.includes("useEffect(() => { setView(initialView); }, [mapRequest, initialView])"), "the garden must go back to its initial view when the request count changes");
  assert.ok(!garden.includes("key={`site-map-"), "the garden must not remount on a re-tap — a remount would record another visit");
});

test("the enlarged Cozy Room is actually bigger — wide enough to see the shelves", () => {
  // The enlarge opened and closed fine, but rendered at the same
  // width as the normal view, so the shelves, trophies and books
  // were no easier to see. The enlarged room must be shown about
  // twice as wide, in a sideways-scrolling frame.
  const dialog = room.slice(room.indexOf('aria-label="My Cozy Room, enlarged"'));
  assert.ok(dialog.includes("overflow-x-auto"), "the enlarged room must scroll sideways");
  assert.ok(dialog.includes("w-[180%]"), "the enlarged room must be shown about twice as wide as the frame");
  assert.ok(dialog.includes("min-w-[620px]"), "the enlarged room must stay wide on a phone, not shrink to the screen");
  assert.ok(dialog.includes("Drag sideways to look around the room, up close."), "the enlarged room must say to drag sideways to look around");
  // Tap-to-close still works, as before.
  assert.ok(!dialog.includes("stopPropagation"), "the enlarged view must not stop a tap from closing it");
  assert.ok(dialog.includes("Tap anywhere to close"), "the enlarged view must still say tap anywhere to close");
  assert.ok(dialog.includes("interactive={false}"), "the enlarged room must still be shown non-interactive");
});
