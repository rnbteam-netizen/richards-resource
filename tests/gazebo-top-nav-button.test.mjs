// Gazebo top-nav button (Richard, 2026-11-28):
//   "Search work's. Refreshed a couple times, no gazebo
//   button yet. Would look good same size and to the right
//   of help and resources, if not already coded elsewhere."
// The big Home Gazebo button IS live, but it sits below the
// cottage and the true message on Home, so it needs
// scrolling to reach — and Richard refreshed a couple of
// times and still did not see it. So there is now a second,
// always-visible route: a Gazebo button in the top nav,
// last in the row, to the right of Help & Resources, same
// NavTabButton size and shape as the other top buttons.
// It is NOT a new tab — it calls the same openGazebo as
// the Home button and the mindful-break links, opening the
// Map with the gazebo stop already open, pic first, and
// Back returns to the tab you came from. The big Home
// button stays too. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const app = src.slice(src.indexOf("export function App()"));
const nav = src.slice(src.indexOf('<nav aria-label="Sections"'), src.indexOf("</nav>", src.indexOf('<nav aria-label="Sections"')) + 7);
const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));

test("Gazebo button sits in the top nav, to the right of Help & Resources, same shape as the other top buttons", () => {
  assert.ok(nav.includes("Gazebo"), "there must be a Gazebo button in the top tab nav");
  assert.ok(nav.includes('ariaLabel="Gazebo — quiet time, open the gazebo"'), "the Gazebo button must say plainly that it opens the gazebo for quiet time");
  assert.ok(src.includes("aria-label={ariaLabel}"), "NavTabButton must render that label as the button's aria-label");
  const gazeboAt = nav.indexOf('ariaLabel="Gazebo — quiet time, open the gazebo"');
  assert.ok(gazeboAt > 0, "the Gazebo button must be in the nav");
  // A real top button in its own right, rendered on its own —
  // not a conditional tucked inside the tab loop.
  assert.ok(!nav.includes('t.id === "home"'), "the Gazebo button must not be a conditional inside the tab loop");
  assert.ok(nav.includes("<NavTabButton"), "the tab buttons must share one NavTabButton shape");
  // Order: after the tab loop — and Help & Resources is the
  // last tab in the TABS list, so after the loop means to its
  // right. Home, Site Map and Cozy Room all come first.
  const homeAt = nav.indexOf('TabIcon id="home"');
  const siteMapAt = nav.indexOf('ariaLabel="Site Map — open the trail map"');
  const cozyAt = nav.indexOf('ariaLabel="Cozy Room — see inside my Cozy Room"');
  const loopAt = nav.indexOf('TABS.filter((t) => t.id !== "home")');
  assert.ok(homeAt !== -1 && homeAt < gazeboAt, "the Home button must come before the Gazebo button");
  assert.ok(siteMapAt !== -1 && siteMapAt < gazeboAt, "the Site Map button must come before the Gazebo button");
  assert.ok(cozyAt !== -1 && cozyAt < gazeboAt, "the Cozy Room button must come before the Gazebo button");
  assert.ok(loopAt !== -1 && gazeboAt > loopAt, "the Gazebo button must come after the tab loop, so it sits to the right of the last tab, Help & Resources");
  const tabs = src.slice(src.indexOf("const TABS"), src.indexOf("];", src.indexOf("const TABS")));
  assert.ok(tabs.trimEnd().endsWith('{ id: "resources", label: "Help & Resources" },'), "Help & Resources must still be the last tab in the TABS list");
  assert.ok(nav.includes("onClick={openGazebo}"), "tapping Gazebo must call openGazebo");
  assert.ok(nav.includes("🌿"), "the Gazebo button must carry a quiet-garden mark so it reads as the gazebo at a glance");
});

test("the gazebo is still not a top tab", () => {
  const tabs = src.slice(src.indexOf("const TABS"), src.indexOf("];", src.indexOf("const TABS")));
  assert.ok(!tabs.includes('"gazebo"'), "the gazebo must not become a new top tab");
  assert.ok(!tabs.includes("Gazebo"), "the gazebo must not appear in the TABS list at all");
});

test("the top-nav Gazebo button opens the Map with the gazebo stop open, pic first — the same route as Home", () => {
  // openGazebo: same opener the Home button and the
  // mindful-break links use. It remembers the tab you came
  // from, opens the Map, and bumps the gazebo request, so
  // the Map lands with the gazebo stop already open.
  const openAt = app.indexOf("const openGazebo");
  assert.ok(openAt !== -1, "there must be an openGazebo opener");
  const openBody = app.slice(openAt, openAt + 600);
  assert.ok(openBody.includes("setSiteMapReturnTab(tab)"), "opening the gazebo must record the tab you came from");
  assert.ok(openBody.includes("setSiteMapOpen(true)"), "opening the gazebo must open the Map");
  assert.ok(openBody.includes("setGazeboRequest((n) => n + 1)"), "opening the gazebo must bump the gazebo request, so the Map opens with the gazebo stop open");
  assert.ok(openBody.includes("scrollTo(0, 0)"), "opening the gazebo must scroll to the top, so the Map pops up at its heading");
  // The Map consumes that request by opening the gazebo stop,
  // pic first — the same flow the Home button relies on.
  assert.ok(app.includes("gazeboRequest={gazeboRequest}"), "the standalone Map must be given the gazebo request");
  assert.ok(app.includes("onGazeboOpened={() => setGazeboRequest(0)}"), "the Map must consume the gazebo request once it has opened the gazebo");
});

test("the Gazebo button lights up only for the gazebo, not for a plain Site Map tap", () => {
  // The gazebo request counter is consumed as soon as the
  // Map opens the gazebo stop, so it cannot say afterwards
  // which button was tapped — a separate flag does that.
  assert.ok(app.includes("const [gazeboNavActive, setGazeboNavActive] = useState(false)"), "the App must track which button opened the Map");
  const openAt = app.indexOf("const openGazebo");
  assert.ok(app.slice(openAt, openAt + 600).includes("setGazeboNavActive(true)"), "opening the gazebo must light the Gazebo button");
  const siteMapAt = app.indexOf("const openSiteMap");
  assert.ok(app.slice(siteMapAt, siteMapAt + 800).includes("setGazeboNavActive(false)"), "a plain Site Map tap must not light the Gazebo button");
  assert.ok(nav.includes("active={siteMapOpen && gazeboNavActive}"), "the Gazebo button must be lit only while the Map is open on the gazebo");
  // Leaving the Map clears it again, through the same paths
  // that close the Map.
  const closeAt = app.indexOf("const closeSiteMap");
  assert.ok(app.slice(closeAt, closeAt + 300).includes("setGazeboNavActive(false)"), "closing the Map must clear the Gazebo button");
  const goAt = app.indexOf("const goToTab = (t: TabId) => {");
  assert.ok(app.slice(goAt, goAt + 300).includes("setGazeboNavActive(false)"), "going to a tab must clear the Gazebo button");
});

test("the top-nav Gazebo button has the same way back as the Site Map — to the tab you came from", () => {
  // Back goes through closeSiteMap, which returns to the tab
  // recorded when the gazebo was opened — never a promise of
  // Home when it goes to Gambling, or anywhere else.
  assert.ok(app.includes("setTab(siteMapReturnTab)"), "closing the Map must go back to the tab you came from");
  assert.ok(app.includes("`← Back to ${LAST_PLACE_LABELS[siteMapReturnTab]}`"), "the back button must name the tab it goes back to");
  assert.ok(app.includes("backLabel={siteMapReturnTab"), "the standalone Map must be given that back label");
  // Home is always one tap away: the tab nav stays above the Map.
  const mapRenderAt = src.indexOf("siteMapOpen ? (");
  const navAt = src.indexOf('<nav aria-label="Sections"');
  assert.ok(navAt !== -1 && mapRenderAt > navAt, "the tab nav — including Home and the Gazebo button — must stay above the Map");
});

test("the big Home Gazebo button is still there too — the top-nav button is a second route, not a replacement", () => {
  assert.ok(home.includes("The Gazebo — quiet time"), "Home must still have its Gazebo button");
  assert.ok(home.includes("Tap to open The Gazebo →"), "the Home Gazebo button must still say how to open it");
  assert.ok(home.includes('setGardenInitialView("map"); setGardenGazeboRequest((n) => n + 1); setGardenOpen(true);'), "the Home Gazebo button must still open the Map with the gazebo stop open");
  assert.equal((src.match(/The Gazebo — quiet time/g) ?? []).length, 1, "there must be exactly one Home Gazebo button with that heading — the top-nav button is labelled simply Gazebo, not a duplicate Home button");
});
