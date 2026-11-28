// Gazebo music + bell every minute (Richard, 2026-11-28):
//   "We want our user to be able to select from those 5 while
//   in the gazebo. And the bell is very spaced apart, like one
//   minute spacing."
// The five, Richard's list: soft piano, harp, harmonica,
// acoustic guitar, violins. All original music, made here with
// Web Audio — no audio files, no downloaded music, no
// copyrighted songs, no copied melody. Off by default: nothing
// plays until the visitor taps one, and it stops when they
// leave the gazebo. The bell's every-minute ringing is opt-in
// too, off to start with, once every 60 seconds while they
// stay in the gazebo. Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const sound = readFileSync(path.join(root, "client", "src", "sound.ts"), "utf8");
// The gazebo stop in the Map — the figure with the pic, the
// caption, the bell, the music chooser, and the enlarged view.
const gazeboStart = src.indexOf('{open && stop.id === "gazebo"');
const gazebo = src.slice(gazeboStart, gazeboStart + 16000);

test("the gazebo offers exactly Richard's five music choices", () => {
  assert.ok(sound.includes('export const GAZEBO_MUSIC_KINDS: { id: GazeboMusicKind; label: string }[] = ['),
    "the sound engine must list the gazebo music kinds");
  for (const label of ["Soft piano", "Harp", "Harmonica", "Acoustic guitar", "Violins"]) {
    assert.ok(sound.includes(`label: "${label}"`), `the music list must include ${label}`);
  }
  assert.equal((sound.match(/label: "/g) ?? []).length, 5, "there must be exactly five music choices, no more");
  // The chooser renders the list from the engine — the labels
  // themselves live in sound.ts, and the gazebo maps over them.
  assert.ok(gazebo.includes("Choose music in the gazebo"), "the gazebo must have a music chooser");
  assert.ok(gazebo.includes("GAZEBO_MUSIC_KINDS.map((kind)"), "the gazebo chooser must list the five choices from the engine");
  assert.ok(gazebo.includes("Original music, made here for the gazebo — soft and slow, no copyrighted songs."),
    "the chooser must say plainly the music is original and made here");
});

test("the five pieces are original Web Audio phrases, not files and not copied songs", () => {
  // Each kind has its own slow phrase of notes, in the
  // instrument's own voice — five different shapes.
  assert.ok(sound.includes("export function gazeboMusicPhrase(kind: GazeboMusicKind): GazeboMusicNote[]"),
    "each piece must be a phrase of notes, made here");
  assert.ok(sound.includes("export function gazeboMusicVoice(kind: GazeboMusicKind)"),
    "each piece must have its own voice");
  assert.ok(sound.includes("export function gazeboMusicPhrase") || sound.includes("gazeboMusicPhrase"),
    "the phrases must be in the sound engine");
  // No audio file anywhere in the music: no .mp3, no .wav, no
  // <audio> element, no fetch of music.
  assert.ok(!sound.toLowerCase().includes(".mp3"), "no mp3 file for the gazebo music");
  assert.ok(!sound.toLowerCase().includes(".wav"), "no wav file for the gazebo music");
  assert.ok(!sound.includes("<audio"), "no audio element for the gazebo music");
  assert.ok(!/fetch\(/.test(sound), "no music is fetched from anywhere");
  // The engine offers start/stop, and the phrase loops slowly.
  assert.ok(sound.includes("startGazeboMusic(kind: GazeboMusicKind): void"), "the engine must offer startGazeboMusic");
  assert.ok(sound.includes("stopGazeboMusic(): void"), "the engine must offer stopGazeboMusic");
  assert.ok(sound.includes("GAZEBO_MUSIC_LOOP_MS = 30000"), "a phrase must loop about every 30 seconds, slow and unhurried");
});

test("the music is off by default and only starts from a tap", () => {
  // Nothing plays on opening the gazebo: the state starts at
  // no music, and the only start call is inside a tap handler.
  assert.ok(src.includes("const [gazeboMusic, setGazeboMusic] = useState<GazeboMusicKind | null>(null);"),
    "no music must be playing when the gazebo opens");
  const starts = [...src.matchAll(/sounds\.startGazeboMusic\(/g)];
  assert.ok(starts.length >= 1, "there must be a start call for the chosen piece");
  for (const start of starts) {
    const around = src.slice(Math.max(0, start.index - 300), start.index);
    assert.ok(around.includes("onClick") || around.includes("chooseGazeboMusic"),
      "the music must only start from a tap on a music choice");
  }
  // Opening the gazebo must not start music.
  const openAt = src.indexOf("const openGazebo");
  assert.ok(openAt !== -1, "there must be an openGazebo opener");
  assert.ok(!src.slice(openAt, openAt + 600).includes("startGazeboMusic"), "opening the gazebo must not start music");
});

test("the music stops when the visitor leaves the gazebo", () => {
  // Leaving the gazebo stop stops the music and clears the
  // choice; unmounting the Map stops it too.
  assert.ok(src.includes('if (selected !== "gazebo") {'),
    "leaving the gazebo stop must be watched for");
  const leave = src.slice(src.indexOf('if (selected !== "gazebo") {'), src.indexOf('if (selected !== "gazebo") {') + 300);
  assert.ok(leave.includes("sounds.stopGazeboMusic()"), "leaving the gazebo must stop the music");
  assert.ok(leave.includes("setGazeboMusic(null)"), "leaving the gazebo must clear the music choice");
  // Tapping the playing piece again stops it too.
  assert.ok(gazebo.includes("tap it again to stop") || gazebo.includes("tap it again, or leave the gazebo, to stop"),
    "the chooser must say tapping the playing piece again stops it");
});

test("the bell every minute is opt-in, off by default, and rings once every 60 seconds", () => {
  // One minute spacing, as Richard asked: 60,000 ms.
  assert.ok(sound.includes("GAZEBO_BELL_EVERY_MINUTE_MS = 60000"),
    "the bell spacing must be one minute — 60,000 ms");
  assert.ok(gazebo.includes("🔔 Ring the bell every minute"), "the gazebo must have a Ring the bell every minute toggle");
  assert.ok(gazebo.includes("When on, the tiny bell rings once every minute, spaced apart, while you are in the gazebo."),
    "the toggle must explain the one-minute spacing in plain words");
  // Off by default.
  assert.ok(src.includes("const [gazeboBellEveryMinute, setGazeboBellEveryMinute] = useState(false);"),
    "the every-minute bell must be off to start with");
  // The interval only runs while the toggle is on and the
  // visitor is still in the gazebo, and it is cleared when
  // either changes.
  const intervalAt = src.indexOf("GAZEBO_BELL_EVERY_MINUTE_MS)");
  assert.ok(intervalAt !== -1, "there must be a one-minute bell interval");
  const guard = src.slice(Math.max(0, intervalAt - 400), intervalAt);
  assert.ok(guard.includes("gazeboBellEveryMinute"), "the interval must only run while the toggle is on");
  assert.ok(guard.includes('selected !== "gazebo"'), "the interval must only run while the visitor is in the gazebo");
  // Leaving the gazebo turns the toggle off too.
  const leave = src.slice(src.indexOf('if (selected !== "gazebo") {'), src.indexOf('if (selected !== "gazebo") {') + 300);
  assert.ok(leave.includes("setGazeboBellEveryMinute(false)"), "leaving the gazebo must turn the every-minute bell off");
});

test("the enlarged gazebo view has the music chooser too", () => {
  const enlarged = gazebo.slice(gazebo.indexOf('aria-label="The gazebo, enlarged"'));
  assert.ok(enlarged.includes("Choose music in the gazebo"), "the enlarged gazebo view must have the music chooser too");
  assert.ok(enlarged.includes("onTouchStart={(e) => e.stopPropagation()}"), "the enlarged music taps must not reach the dialog");
});
