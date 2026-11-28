// Mindful break — the gazebo (Richard, 2026-11-28):
//   "Give myself a break" / "Chill in Gazebo for a bit"
// — his words, verbatim. If you are struggling on any help
// tab, one tap takes you to the gazebo to ease the stress,
// and the Map's back button brings you back to the tab you
// came from — a pause, not giving up. Links live on Peace
// of Mind, in the Cozy Room, and on every help tab.
// Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const app = src.slice(src.indexOf("export function App()"));
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
const room = src.slice(src.indexOf("function CozyRoomPage("), src.indexOf("function HomePage("));
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function GardenMapPage("));
const peace = src.slice(src.indexOf("function PeacePage("), src.indexOf("function HomePage("));
const category = src.slice(src.indexOf("function CategoryPage("), src.indexOf("function WellbeingPage("));
const wellbeing = src.slice(src.indexOf("function WellbeingPage("), src.indexOf("function FoodPage("));
const food = src.slice(src.indexOf("function FoodPage("), src.indexOf("function ScreensPage("));
const screens = src.slice(src.indexOf("function ScreensPage("), src.indexOf("function LongevityPage("));
const longevity = src.slice(src.indexOf("function LongevityPage("), src.indexOf("function PeacePage("));

test("mindful-break wording is Richard's, verbatim, in one shared link", () => {
  assert.ok(src.includes("Give myself a break"), 'the link must say "Give myself a break"');
  assert.ok(src.includes("Chill in Gazebo for a bit"), 'the link must say "Chill in Gazebo for a bit"');
  assert.ok(src.includes("function GazeboBreakLink("), "the break link must be one shared component, not a copy on every tab");
  const link = src.slice(src.indexOf("function GazeboBreakLink("), src.indexOf("function PeacePage("));
  assert.ok(link.includes("Give myself a break — Chill in Gazebo for a bit"), "the button must carry both of Richard's phrases together");
  assert.ok(link.includes("a pause, not giving up"), "the link must say it is a pause, not giving up");
  assert.ok(link.includes("onGoGazebo"), "the link must call the gazebo opener, not a tab");
});

test("Peace of Mind carries the mindful-break link to the gazebo", () => {
  assert.ok(peace.includes("onGoGazebo"), "PeacePage must take a gazebo opener");
  assert.ok(peace.includes("<GazeboBreakLink onGoGazebo={onGoGazebo} />"), "Peace of Mind must render the break link");
  assert.ok(app.includes('<PeacePage onGoHome={() => setTab("home")} onGoGazebo={openGazebo} />'), "the App must wire Peace of Mind to openGazebo");
});

test("every help tab carries the mindful-break link", () => {
  for (const [name, slice] of [["CategoryPage", category], ["WellbeingPage", wellbeing], ["FoodPage", food], ["ScreensPage", screens], ["LongevityPage", longevity]]) {
    assert.ok(slice.includes("onGoGazebo"), `${name} must take a gazebo opener`);
    assert.ok(slice.includes("<GazeboBreakLink onGoGazebo={onGoGazebo} />"), `${name} must render the break link`);
  }
  // CategoryPage covers Alcohol, Smoking, Gambling, Drugs and
  // Codependency in one shared page.
  assert.ok(app.includes("<CategoryPage category={tab}"), "the App must render CategoryPage for the five quit tabs");
  assert.ok(app.includes("onGoGazebo={openGazebo}"), "the App must wire the help tabs to openGazebo");
  assert.ok(app.includes('<WellbeingPage onGoGazebo={openGazebo} />'), "Feeling Unwell must be wired to openGazebo");
  assert.ok(app.includes('<FoodPage onGoGazebo={openGazebo} />'), "Food must be wired to openGazebo");
  assert.ok(app.includes('<ScreensPage onGoGazebo={openGazebo} />'), "Screens must be wired to openGazebo");
  assert.ok(app.includes('<LongevityPage onGoGazebo={openGazebo} />'), "Longevity must be wired to openGazebo");
});

test("the Cozy Room carries the mindful-break link to the gazebo", () => {
  assert.ok(room.includes("onGoGazebo"), "CozyRoomPage must take a gazebo opener");
  assert.ok(room.includes("Give myself a break — Chill in Gazebo for a bit"), "the Cozy Room must show Richard's break wording");
  assert.ok(room.includes("onClick={onGoGazebo ?? onGoMap}"), "the Cozy Room break button must open the gazebo, falling back to the Map");
  assert.ok(room.includes("See the Map →"), "the Cozy Room must still keep its See the Map button");
  // Every Cozy Room in the app must be wired to the gazebo.
  assert.ok(app.includes("onGoGazebo={() => { setCozyRoomOpen(false); openGazebo(); }}"), "the standalone Cozy Room must open the gazebo");
  assert.ok(garden.includes("onGoGazebo={() => { setMapGazeboRequest((n) => n + 1); setView(\"map\");"), "the garden's Cozy Room must open the Map on the gazebo");
  assert.ok(src.includes("onGoGazebo={() => { setCozyOpen(false); setGardenInitialView(\"map\"); setGardenGazeboRequest((n) => n + 1);"), "the Home garden's Cozy Room must open the Map on the gazebo");
});

test("a break tap opens the Map with the gazebo stop already open, pic first", () => {
  assert.ok(app.includes("const openGazebo = () => {"), "the App must have an openGazebo opener");
  const openAt = app.indexOf("const openGazebo = () => {");
  const openBody = app.slice(openAt, openAt + 500);
  assert.ok(openBody.includes("setSiteMapOpen(true)"), "openGazebo must open the Site Map overlay");
  assert.ok(openBody.includes("setGazeboRequest((n) => n + 1)"), "openGazebo must bump the gazebo request");
  assert.ok(openBody.includes("setSiteMapReturnTab(tab)"), "openGazebo must remember the tab you came from, so Back goes back there");
  assert.ok(app.includes("gazeboRequest={gazeboRequest}"), "the Site Map must be given the gazebo request");
  assert.ok(map.includes("gazeboRequest?: number"), "GardenMapPage must take the gazebo request");
  assert.ok(map.includes('if (gazeboRequest && gazeboRequest > 0) {'), "the Map must open the gazebo only when a break was tapped");
  assert.ok(map.includes('openStop("gazebo")'), "the Map must open the gazebo stop for a break tap");
  // The gazebo stop, once open, still shows the pic first.
  assert.ok(map.includes("stop.id === \"gazebo\""), "the Gazebo stop must still have its own picture block");
});

test("a break request is consumed, so a plain Site Map tap lands on the Map top", () => {
  assert.ok(map.includes("onGazeboOpened?.()"), "the Map must call onGazeboOpened once the gazebo is open for a break");
  assert.ok(app.includes("onGazeboOpened={() => setGazeboRequest(0)}"), "the App must clear the gazebo request once it is used");
  assert.ok(app.includes("setGazeboRequest(0)"), "a plain Site Map tap must clear any earlier gazebo request");
  assert.ok(garden.includes("onGazeboOpened={() => { setMapGazeboRequest(0); onGazeboOpened?.(); }}"), "the garden must clear its own gazebo request too");
  assert.ok(src.includes("setMapGazeboRequest(0); setView(\"map\")"), "a plain See the Map from the garden must clear the gazebo request");
});

test("the break link is small and gentle — not on Home, not a new tab", () => {
  assert.equal((src.match(/function GazeboBreakLink\(/g) ?? []).length, 1, "there must be exactly one break-link component");
  // The gazebo is a branch on the Map, not a top tab: the TABS
  // list must not contain it.
  const tabs = src.slice(src.indexOf("const TABS"), src.indexOf("];", src.indexOf("const TABS")));
  assert.ok(!tabs.includes("gazebo"), "the gazebo must not become a new top tab");
  const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
  assert.ok(!home.includes("GazeboBreakLink"), "Home must not shout the break link — it lives on the help tabs, Peace of Mind and the Cozy Room");
});
