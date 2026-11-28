// Gazebo + cottage fixes (Richard, 2026-11-28, after a break):
//   1. Gazebo music was "not loud enough or we need volume
//      control", and "All instruments playing same tune/sound.
//      The band needs a wee bit of practice."
//   2. "the pitch on the bell needs to be higher."
//   3. "Oboe are nice too."
//   4. "Our beautiful cottage pic in the field should be pinch
//      to expand, so folks can enjoy the fine wood grain and
//      details."
//   5. Map view: "Do we want the cottage button (start here)
//      to actually pull up the cottage?"
//   6. "Let's just please remove the adding flower pots. I think
//      it adds confusion, if and when we do interactive on
//      cottage porches, we can revisit that issue."
//   7. Spirit guide stays — only avatars were removed.
// Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const sound = readFileSync(path.join(root, "client", "src", "sound.ts"), "utf8");
const garden = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function GardenMapPage("));
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("function CozyRoomVisual"));

test("the bell is higher — 2093 Hz, not 1568 Hz", () => {
  assert.ok(sound.includes("GAZEBO_BELL_FREQUENCIES_HZ: [number, number, number] = [2093, 3136, 4186]"),
    "the tiny bell must strike at 2093 Hz (C7), harmonics 3136 and 4186 Hz");
  assert.ok(sound.includes("GAZEBO_BELL_GAIN = 0.07"), "the higher bell must stay soft — same gain 0.07");
  assert.ok(sound.includes("GAZEBO_BELL_DURATION_MS = 2400"), "the higher bell must still fade over about 2.4 seconds");
});

test("the music is louder, with a volume slider in the gazebo", () => {
  // Base gains about double the old whisper (0.07–0.09).
  assert.ok(!sound.includes('piano: { type: "triangle", gain: 0.09 }'), "the piano must no longer be at the old whisper gain 0.09");
  assert.ok(sound.includes("GAZEBO_MUSIC_VOLUME_MAX = 0.4"), "the music volume must top out at 0.4");
  assert.ok(src.includes('aria-label="Background tones volume"'), "the gazebo must have a background-tones volume slider");
});

test("oboe is a sixth tone, with its own tune and voice", () => {
  assert.ok(sound.includes('{ id: "oboe" }'), "oboe must be in the tone list");
  assert.ok(sound.includes('oboe: { type: "sawtooth", gain: 0.07 }'), "the oboe must sound reedy — sawtooth, not a bare sine");
  assert.ok(sound.includes("G major pentatonic"), "the oboe must have its own tune, in G major");
  assert.ok(map.includes("GAZEBO_MUSIC_KINDS.map((kind, i)"), "the gazebo chooser must list all six tones from the engine, oboe included");
});

test("the garden cottage pic pinch-zooms like the gazebo", () => {
  // Same treatment as the gazebo: 1x–4x, drag to pan, double-tap
  // to reset, single tap to close, wheel too — not just a dark
  // background with a same-size picture.
  assert.ok(garden.includes("cottageZoomTouchStart"), "the cottage pic must listen for fingers touching down");
  assert.ok(garden.includes("cottageZoomTouchMove"), "the cottage pic must listen for fingers moving — the pinch itself");
  assert.ok(garden.includes("cottageZoomTouchEnd"), "the cottage pic must listen for fingers lifting");
  assert.ok(garden.includes("cottageZoomWheel"), "the cottage pic must zoom with the mouse wheel too");
  assert.ok(garden.includes("translate(${cottageZoom.x}px, ${cottageZoom.y}px) scale(${cottageZoom.scale})"), "the enlarged cottage picture must actually grow and slide with the fingers");
  assert.ok(garden.includes("Pinch with two fingers to zoom in, drag to look around, double-tap to reset."), "the enlarged cottage must tell the visitor how to zoom, in plain words");
  assert.ok(garden.includes("pinch to zoom in close, to see the wood grain and the details"), "the garden must say plainly the pinch is for the wood grain and the details");
  assert.ok(!garden.includes("max-h-[85vh]"), "the old just-darkens enlarged view (max-h 85vh, same-size picture) must be gone");
});

test("the Map cottage button pulls up the cottage", () => {
  assert.ok(map.includes('aria-label="Tap to open the cottage — where every path begins"'), "the cottage button at the top of the Map must open the cottage");
  assert.ok(map.includes("openMapCottage"), "there must be an opener that pulls the cottage up");
  assert.ok(map.includes('aria-label="The cottage, enlarged"'), "the enlarged cottage view must exist on the Map");
  assert.ok(map.includes("mapCottageZoomTouchStart"), "the Map cottage must pinch-zoom too, not just open big");
});

test("the flower pots are gone — no pot section, no pot window, anywhere", () => {
  // Richard: remove the adding flower pots, it adds confusion;
  // revisit only if the porch ever becomes interactive.
  assert.ok(!src.includes("GardenPorchPot"), "no flower-pot component must remain in the app");
  assert.ok(!src.includes("GARDEN_PORCH_POTS"), "no flower-pot list must remain in the app");
  assert.ok(!src.includes("GARDEN_PORCH_POT_MILESTONES"), "no flower-pot milestones must remain in the app");
  assert.ok(!src.includes("Flower pots on the big wrap-around porch"), "no flower-pot section must remain in the app");
  // The cottage itself is untouched and fabulous as it is.
  assert.ok(map.includes("Your cottage — where every path begins, warm and cozy from the get-go."), "the cottage caption must stay word for word");
  // And the garden data underneath is untouched: checklist,
  // trophies and weeds-to-flowers still live here.
  assert.ok(src.includes("LIFE_GARDEN_ITEMS"), "the garden checklist must still be there");
  assert.ok(src.includes("loadLifeGardenTrophies"), "the trophies must still be there");
});

test("the spirit guide stays — only avatars were removed", () => {
  assert.ok(src.includes("Your name & your spirit guide") || src.includes("spirit guide"), "the spirit guide section must still be there");
  assert.ok(src.includes("Or choose my own guide"), "the custom spirit-guide fill-in must still be there");
  assert.ok(!src.includes("avatar"), "avatars must still be completely gone");
});

test("the unused stopGazeboMusic helper is gone", () => {
  assert.ok(!src.includes("const stopGazeboMusic = () =>"), "the unused GardenMapPage helper must be deleted");
  assert.ok(src.includes("sounds.stopGazeboMusic()"), "the sound engine's stop must still be called directly");
});
