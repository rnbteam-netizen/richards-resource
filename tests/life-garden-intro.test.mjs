// My Life Garden Pathway — Richard's intro verbiage (2026-11-26
// 08:00 PST), word for word at the start of the garden, before
// the checklist. Source-level test: the exact words must appear
// in LifeGardenPage, and the separate "Welcome, friend / Welcome,
// [name]" line must stay as its own line, not a replacement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const gardenView = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));

const VERBATIM =
  "Welcome friend. This is your garden of Life. We all choose our own path. You have chosen yours. We are here to help guide you to a happier place, a happier you. Some paths you may have already explored and others await. Enjoy the journey. Peace.";

test("Richard's exact intro verbiage opens the garden, before the checklist", () => {
  assert.ok(gardenView.includes(VERBATIM), "Richard's exact intro verbiage must be in the garden view, word for word");
  const intro = gardenView.indexOf(VERBATIM);
  const checklist = gardenView.indexOf("What is already true for you");
  assert.ok(intro !== -1 && checklist !== -1 && intro < checklist, "the intro verbiage must come before the checklist");
  assert.ok(gardenView.includes('Welcome, {gardenName ? gardenName : "friend"}'), "the separate Welcome, friend / Welcome, [name] line must stay");
});
