// Home instruction line (Richard, 2026-11-27): one short line for a
// first-time visitor — "Just tap a tab, scroll down a wee bit for
// help" — right after "We are so Happy you are here" on Home, above
// the Home buttons. Source-level test: the exact words must appear
// in HomePage, in that order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const homeView = src.slice(src.indexOf("function HomePage("));

const LINE = "Just tap a tab, scroll down a wee bit for help";

test("Home shows Richard's tap-and-scroll instruction, after the welcome line and above the Home buttons", () => {
  assert.ok(homeView.includes(LINE), "the exact instruction line must be on Home");
  assert.ok(!homeView.includes("Just tap any button and scroll down a wee bit for that resource"), "the earlier draft wording must not be on Home — Richard corrected it to 'tap a tab'");
  assert.ok(!homeView.includes("anybutton"), "the line must say 'any button', two words, not 'anybutton'");
  const welcome = homeView.indexOf("We are so Happy you are here");
  const line = homeView.indexOf(LINE);
  // The garden button's own label (not the state comment above,
  // which mentions the garden name first in source).
  const gardenButton = homeView.indexOf("Tap to open My Life Garden Pathway →");
  assert.ok(welcome !== -1 && line !== -1 && gardenButton !== -1, "welcome line, instruction line and garden button must all be on Home");
  assert.ok(welcome < line, "the instruction line must come after 'We are so Happy you are here'");
  assert.ok(line < gardenButton, "the instruction line must come above the Home buttons");
});
