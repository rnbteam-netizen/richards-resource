// Site Map button (Richard, 2026-11-26): "Tap to see map … I'd
// expect it to pop up." The garden already had "See the Map"
// buttons, but they were buried in the garden — from a tab, or
// from Home, there was no way to reach the trail map at all.
// So there is now a Site Map button at the top, next to Home,
// where the tabs are, always visible. Tapping it opens the
// trail map — the real GardenMapPage — popping up immediately,
// at the top, from any tab or from Home, with a clear way back
// to Home / the tab you came from. No second map is built: the
// button reuses LifeGardenPage landed on its map view, which
// renders GardenMapPage itself. The garden list's progress
// strip is renamed "Progress tree" and is never called a map.
// Search finds it too: "map", "site map" and "trail map" all
// open the Site Map. Local only, nothing deployed, nothing
// pushed. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchApp, SEARCH_INDEX } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const searchSrc = readFileSync(path.join(root, "client", "src", "search.ts"), "utf8");
const app = src.slice(src.indexOf("export function App()"));
const nav = src.slice(src.indexOf('<nav aria-label="Sections"'), src.indexOf("</nav>", src.indexOf('<nav aria-label="Sections"')) + 7);
const strip = src.slice(src.indexOf("function GardenPathStrip"), src.indexOf("/* ---------- My Life Garden Pathway — flower pots"));
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomPage("));
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));

test("Site Map button sits at the top, next to Home, where the tabs are", () => {
  assert.ok(nav.includes("Site Map"), "there must be a Site Map button in the top tab nav");
  assert.ok(nav.includes('ariaLabel="Site Map — open the trail map"'), "the Site Map button must say plainly that it opens the trail map");
  assert.ok(src.includes("aria-label={ariaLabel}"), "NavTabButton must render that label as the button's aria-label");
  // The button itself — not the comments above it, which also
  // say "Site Map" — is found by its label prop.
  const siteMapAt = nav.indexOf('ariaLabel="Site Map — open the trail map"');
  assert.ok(siteMapAt > 0, "the Site Map button must be in the nav");
  // It is a real top button in its own right, rendered on its
  // own right after the Home button — not a conditional tucked
  // inside the tab loop (2026-11-26: Richard's screenshot of
  // the tab row showed no Site Map at all, and the loop
  // conditional was the one place it could hide).
  assert.ok(!nav.includes('t.id === "home"'), "the Site Map button must not be a conditional inside the tab loop");
  assert.ok(nav.includes("<NavTabButton"), "the tab buttons must share one NavTabButton shape");
  const homeAt = nav.indexOf('TabIcon id="home"');
  const restAt = nav.indexOf('TABS.filter((t) => t.id !== "home")');
  assert.ok(homeAt !== -1 && homeAt < siteMapAt, "the Home button must come first, before the Site Map button");
  assert.ok(restAt !== -1 && siteMapAt < restAt, "the Site Map button must come first after Home, before the rest of the tabs");
  assert.ok(nav.includes("onClick={openSiteMap}"), "tapping Site Map must call openSiteMap");
  assert.ok(nav.includes("🗺️"), "the Site Map button must carry a map mark so it reads as a map at a glance");
});

test("Site Map opens the real trail map, immediately, at the top — no second map", () => {
  assert.equal((src.match(/function GardenMapPage\(/g) ?? []).length, 1, "there must be exactly one GardenMapPage — no second, different map");
  assert.ok(app.includes("const [siteMapOpen, setSiteMapOpen] = useState(false)"), "the Site Map must be App-level view state, not a tab");
  assert.ok(app.includes("initialView=\"map\""), "the Site Map must land the garden straight on its map view");
  assert.ok(app.includes("<LifeGardenPage"), "the Site Map must reuse LifeGardenPage, which renders GardenMapPage");
  assert.ok(app.includes("onGoHome={closeSiteMap}"), "the standalone Map must close back through closeSiteMap");
  assert.ok(app.includes("onGoTab={goToTab}"), "the standalone Map must send Visit links through goToTab");
  // Opening pops up at the top: openSiteMap scrolls to the top.
  const openAt = app.indexOf("const openSiteMap");
  assert.ok(openAt !== -1, "there must be an openSiteMap opener");
  assert.ok(app.slice(openAt, openAt + 400).includes("scrollTo(0, 0)"), "opening the Site Map must scroll to the top, so the Map pops up at its heading");
  // The heading is the Map's own heading, unchanged.
  assert.ok(map.includes("Map — My Life Garden Pathway"), "the trail map must still be headed Map — My Life Garden Pathway");
  // No second diagram: only one map SVG in the whole app.
  assert.equal((src.match(/viewBox="0 0 360 660"/g) ?? []).length, 1, "there must be exactly one map diagram in the app");
});

test("Site Map works from any tab, and going to a tab closes it", () => {
  // goToTab — the one way tabs are switched, from the nav, the
  // search results, Home cards and the Map's Visit links — closes
  // the Site Map, so a Visit lands on the help tab, not under it.
  assert.ok(app.includes("const goToTab = (t: TabId) => {"), "the App must have a goToTab that switches tabs");
  const goAt = app.indexOf("const goToTab = (t: TabId) => {");
  assert.ok(app.slice(goAt, goAt + 300).includes("setSiteMapOpen(false)"), "goToTab must close the Site Map");
  // The nav tab buttons close it too, so tapping any tab from the
  // Map leaves the Map behind.
  assert.ok(nav.includes("setSiteMapOpen(false)"), "tapping a tab button must close the Site Map");
  // The Map's Visit link still calls onGoTab with the stop's tab,
  // first in the open panel — tap Gambling, land on Gambling help.
  assert.ok(map.includes("Visit {tabLabel} →"), "each open stop must offer a Visit link to its help tab");
  assert.ok(map.includes("onClick={() => onGoTab(stop.tab!)}"), "the Visit link must call onGoTab with the stop's tab");
  assert.ok(garden.includes("onGoTab={onGoTab}"), "the garden must pass its tab switcher into the Map");
});

test("Site Map has a clear way back — to the tab you came from, and to Home", () => {
  // The tab you came from is remembered when the Map opens.
  assert.ok(app.includes("const [siteMapReturnTab, setSiteMapReturnTab] = useState<TabId>(\"home\")"), "the App must remember the tab the Site Map was opened from");
  assert.ok(app.includes("setSiteMapReturnTab(tab)"), "opening the Site Map must record the tab you came from");
  // Back goes there, and the button says where — it never
  // promises Home when it goes to Gambling, or anywhere else.
  assert.ok(app.includes("setTab(siteMapReturnTab)"), "closing the Site Map must go back to the tab you came from");
  assert.ok(app.includes("`← Back to ${LAST_PLACE_LABELS[siteMapReturnTab]}`"), "the back button must name the tab it goes back to");
  assert.ok(app.includes("backLabel={siteMapReturnTab"), "the standalone Map must be given that back label");
  // The Map and the Cozy Room take a backLabel, defaulting to Home.
  assert.ok(map.includes("backLabel = \"← Back to Home\""), "GardenMapPage must take a backLabel, defaulting to Back to Home");
  assert.ok(map.includes("{backLabel}"), "the Map's back buttons must use the back label");
  // Home is always one tap away: the tab buttons stay above the Map.
  const siteMapRenderAt = src.indexOf("siteMapOpen ? (");
  const navAt = src.indexOf('<nav aria-label="Sections"');
  assert.ok(navAt !== -1 && siteMapRenderAt > navAt, "the tab nav — including Home — must stay above the Site Map");
  assert.ok(nav.includes("{t.label}"), "the Home tab button must still be in the nav");
});

test("the progress strip is renamed Progress tree, and is never called a map", () => {
  assert.ok(strip.includes("Your progress tree, from the cottage steps"), "the strip must be titled Your progress tree, from the cottage steps");
  assert.ok(!strip.includes("Your pathway, from the cottage steps"), "the old pathway title must be gone");
  assert.ok(strip.includes("patches in flower"), "the progress tree must still report N of 13 patches in flower");
  assert.ok(strip.includes("of {LIFE_GARDEN_ITEMS.length} patches in flower"), "the progress tree must count patches in flower out of all 13 items");
  // "Map" as a word, in the strip's own words — the one "map" in
  // the code is the array .map() call that lists the patches, not
  // a label, so it is set aside before checking.
  assert.ok(!strip.replace(/\.map\(/g, "").toLowerCase().includes("map"), "the progress tree must not be called a map anywhere in its own words");
  // The garden list still shows the progress tree, not a map.
  assert.ok(garden.includes("<GardenPathStrip"), "the garden list must still show the progress tree");
  assert.ok(garden.includes("progress tree is a progress report, not a map"), "the garden must say plainly the progress tree is not a map");
});

test("search finds the Site Map: map, site map, trail map", () => {
  const entry = SEARCH_INDEX.find((e) => e.id === "site-map");
  assert.ok(entry, "the search index must have a site-map entry");
  assert.equal(entry.title, "Site Map", "the search result must be titled Site Map");
  assert.ok(entry.openSiteMap, "the site-map entry must be flagged to open the Site Map, not a tab");
  for (const kw of ["map", "site map", "trail map"]) {
    assert.ok(entry.keywords.includes(kw), `the Site Map entry must carry the keyword "${kw}"`);
  }
  for (const q of ["map", "site map", "Site Map", "trail map", "garden map"]) {
    const results = searchApp(q);
    assert.ok(results.some((r) => r.id === "site-map"), `searching "${q}" must find the Site Map`);
    assert.ok(results.find((r) => r.id === "site-map")?.openSiteMap, `the "${q}" Site Map result must open the Site Map`);
  }
  assert.equal(searchApp("map")[0].id, "site-map", "searching “map” must rank the Site Map first");
  assert.ok(searchApp("map").some((r) => r.title === "Site Map"), "searching “map” must return a Site Map result");
  // The search box routes that result to the Site Map, and labels
  // it as the trail map — not as a Home tab result.
  assert.ok(src.includes("onOpenSiteMap={openSiteMap}"), "the search box must be wired to open the Site Map");
  assert.ok(src.includes("if (r.openSiteMap && onOpenSiteMap)"), "a Site Map search result must open the Site Map");
  assert.ok(src.includes('"Trail map →"'), "a Site Map search result must be labelled as the trail map");
});

test("Richard's exact verbiage is untouched, and the name-sticks fix is untouched", () => {
  assert.ok(src.includes("Welcome friend. This is your garden of Life. We all choose our own path. You have chosen yours. We are here to help guide you to a happier place, a happier you. Some paths you may have already explored and others await. Enjoy the journey. Peace."),
    "Richard's garden intro must stay word for word");
  assert.ok(src.includes("Our cottage — where every path begins, warm and cozy from the get-go."),
    "the Map caption must stay word for word");
  // Name sticks (2026-11-26): Save my name button, save on
  // Enter / blur, Saved ✓, name replaces "friend" on Map/Cozy Room.
  assert.ok(src.includes("Save my name"), "the Save my name button must still be there");
  assert.ok(src.includes("Saved ✓"), "the Saved ✓ confirmation must still be there");
  assert.ok(src.includes('if (e.key === "Enter") saveName()'), "the name must still save on Enter");
  assert.ok(src.includes("onBlur={() => { if (draft.trim().slice(0, 40) !== name) saveName(); }}"), "the name must still save when the box loses focus");
  assert.ok(map.includes('Welcome, {gardenName ? gardenName : "friend"}'), "the Map must still greet the visitor by their saved name, or friend");
});
