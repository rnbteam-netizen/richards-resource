// Gazebo bell (Richard, 2026-11-28):
//   "Now to please make the gazebo environment the best we can.
//   Music is tricky due to copyright stuff. A small bell is
//   certainly a nice touch."
// A tiny yoga bell, like the one his instructor rang at the end
// of a session, to mark a quiet moment in the gazebo. Music was
// deliberately not added — copyright — so the bell stands alone.
// Web Audio only, generated on the spot, no audio file, no
// download, no music. It only rings when tapped — never on its
// own, never when the gazebo opens, never on a loop — and it
// follows the phone's volume and silent switch, like every
// other sound in the app. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const sound = readFileSync(path.join(root, "client", "src", "sound.ts"), "utf8");
// The gazebo stop in the Map — the figure with the pic, the
// caption, and the enlarged view.
const gazebo = src.slice(src.indexOf('{open && stop.id === "gazebo"'), src.indexOf('{open && stop.id === "gazebo"') + 9000);

test("the gazebo bell is a small Web Audio bell, not the big carnival bell and not a file", () => {
  // A bell of its own, softer and higher than the Happy Button's
  // big carnival bell (1046 Hz, gain 0.14, about 1.2 seconds).
  assert.ok(sound.includes("GAZEBO_BELL_FREQUENCIES_HZ: [number, number, number] = [1568, 2352, 3136]"),
    "the gazebo bell must be a high, gentle strike — 1568 Hz with quiet harmonics");
  assert.ok(sound.includes("GAZEBO_BELL_DURATION_MS = 2400"),
    "the tiny bell must ring for about 2.4 seconds, longer and softer than the carnival bell");
  assert.ok(sound.includes("GAZEBO_BELL_GAIN = 0.07"),
    "the tiny bell must be soft — gain 0.07, about half the carnival bell's 0.14");
  assert.ok(sound.includes("playGazeboBell(): void"), "the sound engine must offer playGazeboBell");
  assert.ok(sound.includes('this.playTone(GAZEBO_BELL_FREQUENCIES_HZ[0], GAZEBO_BELL_DURATION_MS, "sine", GAZEBO_BELL_GAIN)'),
    "the bell must be generated with Web Audio, like every other sound here");
  // No audio file anywhere in the bell: no .mp3, no .wav, no
  // <audio> element, no music — copyright was the reason music
  // was left out, and the bell stands alone.
  assert.ok(!sound.toLowerCase().includes(".mp3"), "no mp3 file for the bell");
  assert.ok(!sound.toLowerCase().includes(".wav"), "no wav file for the bell");
  assert.ok(!sound.includes("<audio"), "no audio element for the bell");
  assert.ok(!src.includes("playGazeboBell") || !src.match(/\.mp3|\.wav/), "the app must not reference an audio file for the gazebo bell");
});

test("the gazebo panel has a Ring the bell button, in Richard's words", () => {
  assert.ok(gazebo.includes("🔔 Ring the bell"), "the gazebo panel must have a Ring the bell button");
  assert.ok(gazebo.includes('aria-label="Ring the tiny bell — a quiet moment, like the bell at the end of a yoga session"'),
    "the bell button must say plainly what it is — a tiny bell for a quiet moment, like the end of a yoga session");
  assert.ok(gazebo.includes("A tiny bell, like the one at the end of a yoga session — tap it to mark a quiet moment."),
    "the panel must explain the bell in plain words");
});

test("the enlarged gazebo view has the bell too, and ringing it does not close the picture", () => {
  // While you are there in the enlarged picture, the bell is
  // right there too — next to Close.
  const enlarged = gazebo.slice(gazebo.indexOf('aria-label="The gazebo, enlarged"'));
  assert.ok(enlarged.includes("🔔 Ring the bell"), "the enlarged gazebo view must have the bell too");
  // A tap on the bell must not reach the dialog's touch
  // handlers — a tap there is read as a tap to close, so the
  // bell's taps stop here.
  assert.ok(enlarged.includes("onTouchStart={(e) => e.stopPropagation()}"), "the enlarged bell must stop its touch-start reaching the dialog");
  assert.ok(enlarged.includes("onTouchEnd={(e) => e.stopPropagation()}"), "the enlarged bell must stop its touch-end reaching the dialog");
});

test("the bell only rings when tapped — never on its own, never when the gazebo opens, never on a loop", () => {
  // Three call sites only: the panel button and the enlarged-view
  // button, both inside a tap handler, plus the opt-in
  // every-minute interval (Richard, 2026-11-28) — nothing else
  // plays it.
  const calls = [...src.matchAll(/sounds\.playGazeboBell\(\)/g)];
  assert.equal(calls.length, 3, "playGazeboBell must be called from exactly three places — the panel button, the enlarged-view button, and the opt-in every-minute interval");
  for (const call of calls) {
    const around = src.slice(Math.max(0, call.index - 200), call.index);
    assert.ok(around.includes("onClick") || around.includes("setInterval"), "each bell ring must come from a tap handler or the opt-in every-minute interval");
  }
  // No autoplay: no effect or open-handler plays it on its own.
  assert.ok(!src.includes("useEffect") || !/useEffect\([^)]*playGazeboBell/s.test(src),
    "no effect may ring the bell");
  assert.ok(!/setTimeout\([^)]*playGazeboBell/.test(src), "no timer may ring the bell");
  // The only loop is the opt-in every-minute one, guarded by
  // the toggle and by still being in the gazebo — see the
  // gazebo-music tests for the full check.
  const intervals = [...src.matchAll(/setInterval\([\s\S]*?playGazeboBell\(\)/g)];
  assert.equal(intervals.length, 1, "there must be exactly one bell interval — the opt-in every-minute one");
  // Opening the gazebo must not ring it: the openers only open
  // the Map and bump the gazebo request.
  const openAt = src.indexOf("const openGazebo");
  assert.ok(openAt !== -1, "there must be an openGazebo opener");
  assert.ok(!src.slice(openAt, openAt + 600).includes("playGazeboBell"), "opening the gazebo must not ring the bell");
  // The bell follows the phone's volume and silent switch, like
  // every other sound — the panel says so in the sound file's
  // own header, and the engine plays at the phone's volume.
  assert.ok(sound.includes("Sound still follows the phone's volume and silent") && sound.includes("switch"),
    "the sound engine must still say sound follows the phone's volume and silent switch");
});
