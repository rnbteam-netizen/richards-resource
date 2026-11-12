// Longevity tab (Richard, 2026-11-12): a bigger Home button, a new
// tab after Feeling Unwell and before Help & Resources, a gentle
// check-in that is never saved or sent and earns NO points for its
// ticks, one CalmingBreathing copy, and an icon on every tab button.
// Static source checks — the tab is client-only, like Food/Screens/
// Feeling Unwell, so there is no server behaviour to test over HTTP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const src = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "src", "App.tsx"),
  "utf8",
);

test("Longevity tab sits after Feeling Unwell, before Help & Resources", () => {
  const wellbeing = src.indexOf('{ id: "wellbeing"');
  const longevity = src.indexOf('{ id: "longevity"');
  const resources = src.indexOf('{ id: "resources"');
  assert.ok(wellbeing > 0 && longevity > wellbeing && resources > longevity,
    "TABS order should be wellbeing, longevity, resources");
  assert.ok(src.includes('longevity:    { activeBg: "#8fd6cf"'),
    "Longevity needs its own distinct pastel (dawn teal)");
  assert.ok(src.includes('longevity: "longevity"'), "TAB_TO_POINT_TAB must map longevity");
  assert.ok(src.includes('longevity: "Longevity"'), "POINT_TAB_LABEL must name longevity");
});

test("Longevity page: hook, one breathing exercise, no points for check-in ticks", () => {
  assert.ok(src.includes("function LongevityHook()"), "Longevity needs its skippable hook");
  assert.ok(src.includes("function LongevityPage()"), "LongevityPage must exist");
  assert.ok(src.includes('{tab === "longevity" && <LongevityPage />}'),
    "the app must render LongevityPage for the longevity tab");
  // Exactly one CalmingBreathing inside the Longevity page section
  // (up to the next top-level section, Peace of Mind).
  const page = src.slice(
    src.indexOf("function LongevityPage()"),
    src.indexOf("/* ---------- peace of mind"),
  );
  const breathing = page.match(/<CalmingBreathing \/>/g) ?? [];
  assert.equal(breathing.length, 1, `expected 1 CalmingBreathing on Longevity, got ${breathing.length}`);
  assert.ok(page.includes("no points for these\n          ticks") || page.includes("no points for these"),
    "Longevity check-in must say plainly there are no points for its ticks");
  assert.ok(!page.includes('awardFields("longevity"'), "Longevity check-in must not award field points");
  assert.ok(!src.includes('awardFields("longevity"'), "no awardFields call for longevity anywhere");
  assert.ok(page.includes("never saved or sent"), "Longevity answers must never be saved or sent");
  assert.ok(page.includes("screening, not a diagnosis"), "Longevity check-in must be framed as screening, not diagnosis");
  // Richard, 2026-11-12: no published studies in the starter app — the
  // research note (OSK, epigenetic clocks, ER-100) is gone from Longevity.
  assert.ok(!page.includes("Research, not treatment yet"), "Longevity must not have a research section");
  assert.ok(!page.includes("OSK"), "Longevity must not mention OSK");
  assert.ok(!page.includes("epigenetic"), "Longevity must not mention epigenetic clocks");
  assert.ok(!page.includes("Ocampo"), "Longevity must not cite published studies");
  assert.ok(src.includes("Live longer, live better — start today."), "bigger Home button line must be present");
});

test("Server accepts longevity taps: tab enum, schema, and Neon CHECK widened", () => {
  const actions = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "src", "actions.ts"), "utf8");
  const schema = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "server", "src", "schema.ts"), "utf8");
  const sql = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0001_public.sql"), "utf8");
  assert.ok(actions.includes('"longevity"'), "server pointTabEnum must accept longevity");
  assert.ok(schema.includes('"longevity"'), "server pointTabs must include longevity");
  assert.ok(sql.includes("'wellbeing','longevity'"), "fresh Neon schema tab CHECK must include longevity");
  assert.ok(sql.includes("points_tab_check"), "migration must widen the existing Neon tab CHECK idempotently");
});

test("Every tab button has a small inline SVG icon, no emoji icon", () => {
  for (const id of ["home", "alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing", "longevity", "resources"]) {
    assert.ok(src.includes(`case "${id}":`), `TabIcon must have a case for ${id}`);
  }
  assert.ok(src.includes("<TabIcon id={t.id} size={16}"), "top nav pills must show the tab icon");
  assert.ok(src.includes('<TabIcon id="longevity" size={40}'), "bigger Longevity button must show a larger icon");
  // Home tab cards use TabIcon, not the old flower placeholder.
  assert.ok(src.includes('<TabIcon id={c} size={24}'), "Home category cards must show the tab icon");
  assert.ok(src.includes('<TabIcon id="food" size={24}'), "Home Food card must show the tab icon");
  assert.ok(src.includes('<TabIcon id="screens" size={24}'), "Home Screens card must show the tab icon");
  assert.ok(src.includes('<TabIcon id="wellbeing" size={24}'), "Home Feeling Unwell card must show the tab icon");
  assert.ok(src.includes('<TabIcon id="longevity" size={24}'), "Home Longevity card must show the tab icon");
});
