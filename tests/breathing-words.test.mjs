// Breathing words (Richard, 2026-11-16) — source-level tests, same pattern
// as the earlier batches: the browser behaviours cannot run in node, so
// these tests pin the contract in the source instead.
//
// Richard rediscovered the breathing issue: the words inside the breathing
// cloud flash too quickly once it is turned on — the 1-second "pause"
// most of all. Fix: when the breathing is running / turned on, the circle
// shows NO words at all, just the empty expanding/contracting circle.
// When it is NOT running, the idle words stay, so the user still knows
// what the circle is. The caption below the circle ("Slow and easy:
// in… 2, 3 — pause — out… 2, 3, 4 — pause.") is outside the cloud and
// stays, and the 3/1/4/1 timing, the circle animation and the tones
// are unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");

const stepPause = src.slice(src.indexOf("function StepPause("), src.indexOf("/* ---------- calming breathing"));
const calming = src.slice(src.indexOf("function CalmingBreathing()"), src.indexOf("/* ---------- tab welcomes"));
const smoking = src.slice(src.indexOf("function SmokingHook()"), src.indexOf("function GamblingHook()"));
const CAPTION = "Slow and easy: in… 2, 3 — pause — out… 2, 3, 4 — pause.";

test("Breathing: no words inside the circle while it is running", () => {
  // No phase-word renderer may survive anywhere: the words it produced
  // ("breathe in", "breathe out", "pause") flashed too quickly.
  assert.ok(!src.includes("breathPhaseLabel"), "breathPhaseLabel must be gone — no phase words are rendered inside a circle");
  // StepPause (the open-ended pause on every tab except Screens): empty
  // while running, idle words when stopped.
  assert.ok(stepPause.includes('{running ? "" : "breathe with the circle"}'), "StepPause circle must be empty while running and read 'breathe with the circle' when stopped");
  // CalmingBreathing (on every tab): same.
  assert.ok(calming.includes('{running ? "" : "breathe with the circle"}'), "CalmingBreathing circle must be empty while running and read 'breathe with the circle' when stopped");
  // Smoking hook (one slow breath): empty while breathing, idle and done
  // words kept when not breathing.
  assert.ok(smoking.includes('{phase === "breathing" ? "" : phase === "done" ? "that\'s real air" : "one clean breath"}'), "Smoking circle must be empty while breathing, 'that's real air' when done, 'one clean breath' when idle");
});

test("Breathing: caption below the circle, timing and animation unchanged", () => {
  assert.ok(stepPause.includes(CAPTION), "StepPause must keep the 'Slow and easy' caption below the circle");
  assert.ok(calming.includes(CAPTION), "CalmingBreathing must keep the 'Slow and easy' caption below the circle");
  // 3/1/4/1 timing, unchanged.
  assert.ok(src.includes("const BREATH_IN_MS = 3000"), "breathe-in must stay 3s");
  assert.ok(src.includes("const BREATH_HOLD_MS = 1000"), "hold must stay 1s");
  assert.ok(src.includes("const BREATH_OUT_MS = 4000"), "breathe-out must stay 4s");
  assert.ok(src.includes("const BREATH_PAUSE_MS = 1000"), "rest pause must stay 1s");
  // The circles still animate, paused when not running.
  assert.ok(stepPause.includes("breathe-circle"), "StepPause must still use the breathe-circle animation");
  assert.ok(calming.includes("breathe-circle"), "CalmingBreathing must still use the breathe-circle animation");
  assert.ok(smoking.includes("breathe-circle"), "Smoking hook must still use the breathe-circle animation");
  assert.ok(stepPause.includes("[animation-play-state:paused]"), "StepPause circle must pause its animation when not running");
});
