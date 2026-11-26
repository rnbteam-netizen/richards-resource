// My Life Garden Pathway — "See the Map" buttons (Richard,
// 2026-11-26): "Tap to see map (they're 2 of them and first
// one didn't show me the map. The second showed me a tree
// which is more like a progress report but I wouldn't call it
// a map. When I push show me the map, I'd expect it to pop
// up." Source-level tests.
//
// What was wrong: there were two "See the Map →" buttons doing
// different things. The one in the garden list opened the real
// Map; the one in the Cozy Room called onGoGarden, which went
// back to the garden list — so it did not show a map at all,
// and landing mid-list showed the pathway strip, a progress
// report of weed patches in flower, not a map. From Home, the
// Cozy Room had no route to the Map at all. So every "See the
// Map" button must now open the real Map page directly, at the
// top, and the pathway strip must never be called a map.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));
const gardenList = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("/* ---------- Garden Map + Cozy Room"));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
const strip = src.slice(src.indexOf("function GardenPathStrip("), src.indexOf("/* ---------- My Life Garden Pathway — flower pots"));

test("there are exactly two See the Map buttons, and both open the real Map", () => {
  const count = (garden.match(/See the Map →/g) ?? []).length;
  assert.equal(count, 2, `there must be exactly two "See the Map" buttons in the garden (found ${count}) — one in the garden list, one in the Cozy Room, both opening the real Map`);
  // The garden-list button sets the view to "map".
  assert.ok(gardenList.includes('setView("map")'), "the garden-list See the Map button must set the view to map");
  // The Cozy Room button must call onGoMap, not onGoGarden.
  assert.ok(room.includes('onClick={onGoMap}'), "the Cozy Room See the Map button must call onGoMap");
  assert.ok(!room.includes("onGoGarden"), "the Cozy Room must not go back to the garden list from its See the Map button");
});

test("the Cozy Room takes an onGoMap prop, wired to the Map in both places it opens", () => {
  assert.ok(room.includes("onGoMap: () => void"), "CozyRoomPage must take an onGoMap prop");
  // From inside the garden: the Cozy Room's onGoMap sets the view to "map".
  assert.ok(garden.includes('onGoMap={() => { setView("map")'), "the garden's Cozy Room must open the Map on See the Map");
  // From Home: the Cozy Room's onGoMap opens the garden landed on the Map.
  assert.ok(home.includes('setGardenInitialView("map")'), "Home's Cozy Room must land the garden on the Map on See the Map");
  assert.ok(home.includes("setGardenOpen(true)"), "Home's Cozy Room See the Map must open the garden");
});

test("the garden can open landed on the Map, and Home's garden button still lands on the list", () => {
  assert.ok(garden.includes('initialView = "list"'), "LifeGardenPage must take an initialView, defaulting to the list");
  assert.ok(garden.includes("useState<\"list\" | \"map\" | \"cozy\">(initialView)"), "the garden view must start from its initialView");
  assert.ok(home.includes("initialView={gardenInitialView}"), "Home must pass its garden initial view into the garden");
  assert.ok(home.includes('setGardenInitialView("list")'), "Home's garden button must land on the list, not on the Map");
});

test("every move to the Map scrolls to the top, so the Map pops up at its heading", () => {
  // Garden list -> Map, garden Cozy Room -> Map, Home Cozy Room -> Map.
  const mapMoves = (garden.match(/setView\("map"\)[^}]*scrollTo\(0, 0\)/g) ?? []).length
    + (home.match(/setGardenInitialView\("map"\)[^}]*scrollTo\(0, 0\)/g) ?? []).length;
  assert.ok(mapMoves >= 2, `at least two Map openings must scroll to the top (found ${mapMoves})`);
  assert.ok(garden.includes("Map — My Life Garden Pathway"), "the Map page must be headed Map — My Life Garden Pathway");
});

test("the pathway strip is a progress report, never called a map", () => {
  assert.ok(strip.includes("Your pathway, from the cottage steps"), "the pathway strip must keep its own title");
  assert.ok(strip.includes("patches in flower"), "the pathway strip must report patches in flower");
  assert.ok(!strip.includes("See the Map"), "the pathway strip must not carry a See the Map button");
  assert.ok(!strip.toLowerCase().includes("this is the map"), "the pathway strip must not be presented as the map");
});

test("the Map diagram starts at the cottage, so it reads as a map, not a tree", () => {
  const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
  assert.ok(map.includes("Cottage — start here"), "the Map diagram must start at the cottage, labelled start here");
  assert.ok(map.includes("Map — My Life Garden Pathway"), "the Map page must be headed as a map");
  assert.ok(map.includes("Longevity → ∞"), "the Map must still show Longevity going on to infinity");
});

test("every Map stop with a help tab has an active Visit link, first in its panel", () => {
  const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
  // The stops list lives just before GardenMapPage in the file.
  const stopsStart = src.indexOf("const GARDEN_MAP_STOPS");
  const stops = src.slice(stopsStart, src.indexOf("];", stopsStart) + 2);
  // The ten stops with a help tab, and the tab each must go to.
  const expected = {
    gazebo: "peace",
    alcohol: "alcohol",
    smoking: "smoking",
    gambling: "gambling",
    drugs: "drugs",
    codependency: "codependency",
    food: "food",
    screens: "screens",
    wellbeing: "wellbeing",
    longevity: "longevity",
  };
  for (const [stopId, tabId] of Object.entries(expected)) {
    const at = stops.indexOf(`id: "${stopId}"`);
    assert.ok(at !== -1, `the Map must have a ${stopId} stop`);
    assert.ok(stops.slice(at, at + 220).includes(`tab: "${tabId}"`), `the ${stopId} stop must point at the ${tabId} tab`);
  }
  // The two stops with no help tab go elsewhere, not to a tab.
  assert.ok(stops.includes('id: "garden", label: "My Life Garden Pathway", tab: null'), "the pathway stop has no help tab");
  assert.ok(stops.includes('id: "cozy", label: "My Cozy Room", tab: null'), "the Cozy Room stop has no help tab");
  // The Visit link calls onGoTab with that stop's tab, and it is
  // the first thing in the open panel — before the options and
  // the quit-day block — not buried at the bottom.
  assert.ok(map.includes("Visit {tabLabel} →"), "each open stop must offer a Visit link to its help tab");
  assert.ok(map.includes("onClick={() => onGoTab(stop.tab!)}"), "the Visit link must call onGoTab with the stop's tab");
  const visitAt = map.indexOf("Visit {tabLabel} →");
  const optionsAt = map.indexOf("What is already true for you?");
  const quitAt = map.indexOf("Your quit day for this path");
  assert.ok(visitAt !== -1 && optionsAt !== -1 && visitAt < optionsAt, "the Visit link must come before the stop's options");
  assert.ok(quitAt === -1 || visitAt < quitAt, "the Visit link must come before the quit-day block");
  assert.ok(map.includes("then tap Visit to go to that help"), "the Map must say plainly to tap Visit to go to that help");
});

test("tapping Visit Gambling takes you to the Gambling help portion, and so does every other tab", () => {
  // goToTab switches the App tab and scrolls to the top; the
  // garden overlay lives inside Home, so switching tab leaves it.
  assert.ok(src.includes("const goToTab = (t: TabId) => {"), "the App must have a goToTab that switches tabs");
  assert.ok(src.includes("setTab(t);"), "goToTab must switch the tab");
  // LifeGardenPage passes its onGoTab into the Map, and Home
  // passes the App's goToTab into the garden as onGoTab.
  assert.ok(garden.includes("onGoTab={onGoTab}"), "the garden must pass its tab switcher into the Map");
  assert.ok(home.includes("onGoTab={onGo}"), "Home must pass the App's goToTab into the garden");
  // Every tab a Map stop points at renders a real help page.
  const app = src.slice(src.indexOf("export function App()"));
  assert.ok(app.includes('tab === "gambling"') || app.includes("CategoryPage category={tab}"), "the Gambling tab must render a help page");
  assert.ok(app.includes("<CategoryPage category={tab}"), "Alcohol, Smoking, Gambling, Drugs and Codependency must render their help page");
  for (const page of ["<FoodPage", "<ScreensPage", "<WellbeingPage", "<LongevityPage", "<PeacePage"]) {
    assert.ok(app.includes(page), `the App must render ${page} for its Map stop`);
  }
});
