// Search + My RR (Richard, 2026-11-21): the app is about 24,000
// words with no way to find anything, and no way back to where you
// left off. This build adds (1) a 🔍 search box, on every tab, that
// searches the app's own content on the phone and jumps to the tab,
// and (2) My RR on Home, which shows where you left off and offers
// one big button to continue there — plus the app defaults to the
// last tab on return, with a clear "Go to Home instead". Adding,
// not subtracting: cottage, welcome line, true message, Happy
// Button, Share button all stay where they were. No account, no
// personal data, nothing sent to the server — the last place lives
// in this browser's localStorage only, like the welcome flag.
// My Muse and its 100-points-for-AI award landed in the next
// piece (2026-11-21, tests/my-muse.test.mjs), not this one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchApp, loadLastPlace, saveLastPlace, LAST_PLACE_KEY, LAST_PLACE_LABELS, SEARCH_INDEX } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const searchSrc = readFileSync(path.join(root, "client", "src", "search.ts"), "utf8");
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    _store: store,
  };
}

test("Search: finds the thing by its own words — breathing, 988, quit date", () => {
  const breathing = searchApp("breathing");
  assert.ok(breathing.length > 0, "breathing must find something");
  assert.equal(breathing[0].id, "breathing", "the breathing entry must rank first for “breathing”");
  assert.equal(breathing[0].tab, "home", "breathing lives on Home");

  const crisis = searchApp("988");
  assert.ok(crisis.some((r) => r.id === "988"), "988 must find the crisis lifeline");
  assert.ok(crisis.some((r) => r.tab === "wellbeing"), "the 988 entry must jump to Feeling Unwell?");

  const quit = searchApp("quit date");
  assert.ok(quit.some((r) => r.id === "points"), "“quit date” must find the points entry that explains it");
  const slot = searchApp("slot machine");
  assert.equal(slot[0].id, "slot", "“slot machine” must rank the Honest Slot Machine first");
  assert.equal(slot[0].tab, "gambling", "the slot machine lives on the Gambling tab");
});

test("Search: case-insensitive, empty and nonsense queries return nothing", () => {
  assert.deepEqual(searchApp("BREATHING").map((r) => r.id), searchApp("breathing").map((r) => r.id),
    "search must not care about capital letters");
  assert.deepEqual(searchApp(""), [], "an empty query must return no results");
  assert.deepEqual(searchApp("   "), [], "a blank query must return no results");
  assert.deepEqual(searchApp("zxqvkj"), [], "a nonsense word must return no results");
  assert.ok(searchApp("anxiety").some((r) => r.id === "gad7"), "anxiety must find the GAD-7 check-in");
  assert.ok(searchApp("anxiety").some((r) => r.tab === "wellbeing"), "anxiety results must jump to Feeling Unwell?");
});

test("Search: at most 8 results, and every tab in the app is findable", () => {
  assert.ok(searchApp("a").length <= 8, "results must be capped at 8 so the list stays short on a phone");
  const tabs = ["home", "alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing", "longevity", "peace", "resources"];
  for (const tab of tabs) {
    assert.ok(SEARCH_INDEX.some((e) => e.tab === tab), `the index must have at least one entry for the ${tab} tab`);
    assert.ok(LAST_PLACE_LABELS[tab], `every tab must have a label for My RR / the welcome-back banner, missing ${tab}`);
  }
  const ids = SEARCH_INDEX.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "every search entry must have a unique id");
  // Every indexed tab must be a real tab in App.tsx — a typo here
  // would send a tap to a tab that does not exist.
  const tabsBlock = src.slice(src.indexOf("const TABS"), src.indexOf("];", src.indexOf("const TABS")) + 2);
  for (const entry of SEARCH_INDEX) {
    assert.ok(tabsBlock.includes(`id: "${entry.tab}"`), `search entry ${entry.id} names tab "${entry.tab}", which is not in TABS`);
  }
});

test("My RR / last place: round-trips through localStorage, and only real tabs resume", () => {
  const storage = fakeStorage();
  assert.equal(loadLastPlace(storage), null, "no last place yet must mean no resume — start on Home");
  saveLastPlace(storage, "smoking");
  assert.equal(storage._store.get(LAST_PLACE_KEY), "smoking", "the last place must be stored under the last-place key");
  assert.equal(loadLastPlace(storage), "smoking", "loading must give back the tab that was saved");
  saveLastPlace(storage, "home");
  assert.equal(loadLastPlace(storage), null, "“home” is not a place to return to — Home is where the app starts anyway");
  saveLastPlace(storage, "not-a-tab");
  assert.equal(loadLastPlace(storage), null, "a bogus stored value must never resume anywhere");
  saveLastPlace(storage, "resources");
  assert.equal(loadLastPlace(storage), "resources", "Help & Resources must be resumable too");
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(loadLastPlace(broken), null, "blocked storage must mean no resume, not a crash");
  assert.doesNotThrow(() => saveLastPlace(broken, "peace"), "blocked storage must not crash saving");
});

test("Search + My RR: nothing leaves the phone — no server call, no account", () => {
  assert.ok(!searchSrc.includes("fetch(") && !searchSrc.includes("api.") && !searchSrc.includes("award("),
    "the search / last-place module must never call the server or touch points");
  assert.ok(searchSrc.includes("localStorage") || searchSrc.includes("LAST_PLACE_KEY"),
    "the last place must be kept in localStorage only");
  assert.ok(searchSrc.includes("never sent to the server") || searchSrc.includes("never leaves the phone"),
    "the module must say plainly that the last place is never sent");
  assert.ok(!searchSrc.includes("richardsresource3@gmail.com") && !searchSrc.includes("device_id"),
    "search / last place must not touch email or device ids");
});

test("Search box: on every tab, under the tab buttons, with the privacy line", () => {
  assert.ok(src.includes("function SearchBox("), "a SearchBox component must exist");
  assert.ok(src.includes("🔍") && src.includes("Search the app"), "the box must say 🔍 Search the app");
  assert.ok(src.includes('type="search"'), "the box must be a real search input");
  assert.ok(src.includes("nothing you type is sent anywhere"),
    "the box must tell the visitor their search stays on the phone");
  assert.ok(src.includes("<SearchBox onGo={goToTab} />"), "the search box must be wired to go to a tab");
  const navEnd = src.indexOf("</nav>", src.indexOf('aria-label="Sections"'));
  const searchAt = src.indexOf("<SearchBox onGo={goToTab} />");
  const pointsAt = src.indexOf("★ {displayTotal} points");
  assert.ok(navEnd > 0 && searchAt > navEnd, "the search box must sit under the tab buttons, so it is on every tab");
  assert.ok(pointsAt > searchAt, "the search box must sit before the points strip");
  assert.equal(src.match(/<SearchBox /g)?.length, 1, "there must be exactly one search box");
  // Results must jump: tapping a result goes to its tab and clears the query.
  assert.ok(src.includes("onClick={() => open(r.tab)}"), "tapping a search result must open its tab");
  assert.ok(src.includes('setQuery("")'), "opening a result must clear the search");
});

test("My RR: Home only, after the Share button, with the continue button", () => {
  assert.ok(src.includes("function MyRRCard("), "a MyRRCard component must exist");
  assert.ok(src.includes("My RR"), "the card must say My RR");
  assert.ok(src.includes("Continue where I left off"), "the card must offer one big button to continue where you left off");
  assert.ok(home.includes("<MyRRCard"), "My RR must be on Home");
  assert.equal(src.match(/<MyRRCard /g)?.length, 1, "there must be exactly one My RR card");
  const shareAt = home.indexOf("<ShareButton />");
  const myRrAt = home.indexOf("<MyRRCard");
  const whatsNewAt = home.indexOf("<WhatsNewBanner />");
  assert.ok(shareAt > 0 && myRrAt > shareAt, "My RR must sit after the Share button on Home");
  assert.ok(whatsNewAt > myRrAt, "My RR must sit before the rest of Home");
  assert.ok(src.includes("on this phone only"), "My RR must say the last place is kept on this phone only");
  // Adding, not subtracting: the warm greeting is untouched.
  const happyAt = home.indexOf("<HappyButton />");
  const trueAt = home.indexOf("BUT YOU ARE NOT ALONE");
  assert.ok(trueAt > 0 && happyAt > trueAt && shareAt > happyAt,
    "the true message, Happy Button and Share button must still come first on Home, in that order");
  assert.ok(home.includes("We are so Happy you are here"), "the welcome line must still be on Home");
});

test("Return to last place: the app defaults to it, with a clear way back to Home", () => {
  assert.ok(src.includes("loadLastPlace(LOCAL_STORAGE_ADAPTER)"), "the app must read the last place on load");
  assert.ok(src.includes('useState<TabId>(() => loadLastPlace(LOCAL_STORAGE_ADAPTER) ?? "home")'),
    "the app must default to the last tab, or Home when there is none");
  assert.ok(src.includes("saveLastPlace(LOCAL_STORAGE_ADAPTER, tab)"),
    "the app must save the tab whenever it changes");
  assert.ok(src.includes("Welcome back"), "a welcome-back banner must name the return");
  assert.ok(src.includes("where you left off"), "the banner must say where you left off");
  assert.ok(src.includes("Go to Home instead"), "the banner must offer a clear way back to Home");
  assert.ok(src.includes("setResumedTab(null)"), "going Home instead must dismiss the banner");
  // The welcome cover still comes first on a first visit.
  assert.ok(src.includes("if (!welcomeEntered)"), "the full welcome cover must still gate first entry");
  // Points are untouched by the search / My RR build: the search
  // module itself adds no award action. (My Muse and its +100
  // once-ever myMuse award arrived in the next piece, 2026-11-21,
  // and are pinned in tests/my-muse.test.mjs — this old guard
  // used to forbid them, and was updated when that piece landed.)
  assert.ok(!searchSrc.includes("happyMoment") && !searchSrc.includes("myMuse"),
    "the search / last-place module must not add a points action");
});
