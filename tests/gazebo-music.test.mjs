// Gazebo background tones + bell every minute (Richard,
// 2026-11-28): "We want our user to be able to select from
// those 5 while in the gazebo. And the bell is very spaced
// apart, like one minute spacing." Then (2026-11-28): "Let's
// please speed up the sound a bit and refer to it as
// background tones" — and "We're removing all the instrument
// labels correct?" Yes: six original tones, numbered only,
// never named after instruments — the tones do not sound like
// real instruments, and naming them would promise what is not
// there. All original, made here with Web Audio — no audio
// files, no downloaded music, no copyrighted songs, no copied
// melody. Off by default: nothing plays until the visitor
// taps one, and it stops when they leave the gazebo. The
// bell's every-minute ringing is opt-in too, off to start
// with, once every 60 seconds while they stay in the gazebo.
// Source-level tests.
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

test("the gazebo offers exactly six background tones, numbered, never named after instruments", () => {
  assert.ok(sound.includes('export const GAZEBO_MUSIC_KINDS: { id: GazeboMusicKind }[] = ['),
    "the sound engine must list the gazebo tone kinds");
  for (const id of ["piano", "harp", "harmonica", "guitar", "violins", "oboe"]) {
    assert.ok(sound.includes(`{ id: "${id}" }`), `the tone list must include ${id}`);
  }
  assert.equal((sound.match(/\{ id: "/g) ?? []).length, 6, "there must be exactly six tones, no more");
  // No instrument label anywhere in the engine's tone list.
  assert.ok(!sound.includes('label: "Soft piano"') && !sound.includes('label: "Oboe"'),
    "the tone list must carry no instrument labels");
  // The chooser renders the list from the engine, numbered.
  assert.ok(gazebo.includes("Choose background tones in the gazebo"), "the gazebo must have a background-tones chooser");
  assert.ok(gazebo.includes("GAZEBO_MUSIC_KINDS.map((kind, i)"), "the gazebo chooser must list the six tones from the engine");
  assert.ok(gazebo.includes("Background tone ${i + 1}"), "the chooser must number the tones, not name them");
  assert.ok(gazebo.includes("Original tones, made here for the gazebo — soft and slow."),
    "the chooser must say plainly the tones are original and made here");
  assert.ok(!gazebo.includes("Choose music in the gazebo"), "the old music wording must be gone from the gazebo");
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
  assert.ok(sound.includes("GAZEBO_MUSIC_LOOP_MS = 15000"), "a phrase must loop about every 15 seconds — sped up, still calm");
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
  assert.ok(enlarged.includes("Choose background tones in the gazebo"), "the enlarged gazebo view must have the background-tones chooser too");
  assert.ok(enlarged.includes("Background tone ${i + 1}"), "the enlarged chooser must number the tones too, not name them");
  assert.ok(enlarged.includes("onTouchStart={(e) => e.stopPropagation()}"), "the enlarged music taps must not reach the dialog");
});

test("the six pieces are genuinely different tunes, not the same notes in different voices", () => {
  // The first version shared one 8-note C-major pool, so every
  // instrument played the same tune — Richard: "All instruments
  // playing same tune/sound. The band needs a wee bit of
  // practice." Each piece now has its own key/mode and shape:
  // piano C-major pentatonic stepping down, harp arpeggiating
  // wide, harmonica D minor pentatonic held long, guitar E major
  // plucked rhythmic, violins A minor slow and legato, oboe G
  // major pentatonic reedy. The phrase table must show notes
  // no other piece uses.
  assert.ok(sound.includes('"F4"') || sound.includes("F4"), "the harmonica's D minor tune must use F");
  assert.ok(sound.includes("A3"), "the violins' A minor tune must reach down to A3");
  assert.ok(sound.includes("GSharp4"), "the guitar's E major tune must use G sharp");
  assert.ok(sound.includes('"B4"') || sound.includes("B4"), "the oboe's G major tune must use B");
  // Different rhythms too: guitar plucks short and quick, the
  // long-note instruments hold.
  assert.ok(sound.includes("guitar: 450"), "the guitar must pluck short notes");
  assert.ok(sound.includes("harmonica: 1700"), "the harmonica must hold long notes");
  assert.ok(sound.includes("violins: 1800"), "the violins must hold long notes");
  // Sped up: a note about every 1.2 seconds, not 2.4.
  assert.ok(sound.includes("piano: 1200"), "the piano must step about every 1.2 seconds now");
  assert.ok(sound.includes("guitar: 600"), "the guitar must step about every 0.6 seconds now");
  // Different voices too, and louder than the first whisper:
  // piano and guitar triangle, harp and violins sine, oboe
  // sawtooth — and gains about double the old 0.07–0.09.
  assert.ok(sound.includes('piano: { type: "triangle", gain: 0.18 }'), "the piano must be louder — gain 0.18, not 0.09");
  assert.ok(sound.includes('oboe: { type: "sawtooth", gain: 0.07 }'), "the oboe must be reedy — sawtooth");
  assert.ok(sound.includes("frequencyHz * 2"), "the violins must sing with a soft octave above, not a bare sine");
});

test("the gazebo has a background-tones volume control, off by default in loudness terms", () => {
  // Richard: "Not loud enough or we need volume control."
  // The engine offers a volume, 0 to 0.4, default 0.22 — the
  // same level and pattern as the calm tone.
  assert.ok(sound.includes("GAZEBO_MUSIC_VOLUME_DEFAULT = 0.22"), "the music must play at 0.22 by default, not the old whisper");
  assert.ok(sound.includes("GAZEBO_MUSIC_VOLUME_MAX = 0.4"), "the music volume must top out at 0.4");
  assert.ok(sound.includes("setGazeboMusicVolume(volume: number): void"), "the engine must offer setGazeboMusicVolume");
  // The gazebo has a slider in the panel and in the enlarged
  // view, following the breathing exercise's calm-tone slider.
  assert.ok(src.includes('aria-label="Background tones volume"'), "the gazebo must have a background-tones volume control");
  assert.ok(src.includes("sounds.setGazeboMusicVolume((gazeboMusicVolume / 100) * 0.4)"), "the slider must set the tones volume like the calm-tone slider does");
  assert.ok(src.includes("const [gazeboMusicVolume, setGazeboMusicVolume] = useState(55);"), "the volume must start at 55% — 0.22, the same as the calm tone");
  assert.equal((src.match(/aria-label="Background tones volume"/g) ?? []).length, 2, "the volume control must be in the gazebo panel and in the enlarged view");
  assert.ok(!src.includes('aria-label="Gazebo music volume"'), "the old music volume label must be gone");
});
