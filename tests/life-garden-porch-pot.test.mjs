// My Life Garden Pathway — flower pots REMOVED (Richard,
// 2026-11-28): "Let's just please remove the adding flower
// pots. I think it adds confusion, if and when we do
// interactive on cottage porches, we can revisit that issue.
// For now, the cottage looks fabulous." The old test file
// asserted the pots existed; this one asserts they are gone,
// and the garden underneath is untouched. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");

test("the flower pots are removed from the garden list and the Map", () => {
  assert.ok(!src.includes("GardenPorchPot"), "no flower-pot component must remain");
  assert.ok(!src.includes("GARDEN_PORCH_POTS"), "no flower-pot list must remain");
  assert.ok(!src.includes("GARDEN_PORCH_POT_MILESTONES"), "no flower-pot milestones must remain");
  assert.ok(!src.includes("Flower pots on the big wrap-around porch"), "no flower-pot section must remain");
  // The removal is noted in the code, so a later reader knows
  // why the pots went and when they may come back.
  assert.ok(src.includes("flower pots (removed, Richard 2026-11-28)"), "the code must record that the pots were removed at Richard's word");
  assert.ok(src.includes("Revisit only if Richard asks for an interactive porch later"), "the code must record that pots may return only with an interactive porch");
});

test("removing the pots changed nothing else in the garden", () => {
  // Checklist, trophies, weeds-to-flowers and the cottage patch
  // all stay — only the pot window went.
  assert.ok(src.includes("LIFE_GARDEN_ITEMS"), "the garden checklist must still be there");
  assert.ok(src.includes("loadLifeGardenTrophies"), "the trophies must still be there");
  assert.ok(src.includes("gardenCottagePatchBlooms"), "the cottage patch must still bloom");
  assert.ok(src.includes("Your cottage — where every path begins, warm and cozy from the get-go."), "the cottage caption must stay word for word");
});
