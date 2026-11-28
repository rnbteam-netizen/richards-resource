// Gazebo background tones, faster + no instrument labels, and
// spirit guide search (Richard, 2026-11-28):
//   1. "Let's please speed up the sound a bit and refer to it
//      as background tones."
//   2. "We're removing all the instrument labels correct?" —
//      YES: no Soft piano, no Harp, no Harmonica, no Acoustic
//      guitar, no Violins, no Oboe anywhere the visitor can
//      see — only "background tones", numbered 1 to 6.
//   3. "Searching for Spirit or spirit guide doesn't get a
//      hit." — it must now find Your spirit guide first.
// Source-level tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchApp, SEARCH_INDEX } from "../client/src/search.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const sound = readFileSync(path.join(root, "client", "src", "sound.ts"), "utf8");
const gazeboStart = src.indexOf('{open && stop.id === "gazebo"');
const gazebo = src.slice(gazeboStart, gazeboStart + 16000);
const enlarged = gazebo.slice(gazebo.indexOf('aria-label="The gazebo, enlarged"'));
const searchBox = src.slice(src.indexOf("function SearchBox("), src.indexOf("/* ---------- My Muse"));
const app = src.slice(src.indexOf("export function App()"));

test("the background tones are faster — about twice as fast, a note about every 1.2 seconds", () => {
  // A phrase is twelve notes; at ~1.2s apart it runs about
  // 15 seconds, not 30. The loop follows the phrase.
  assert.ok(sound.includes("GAZEBO_MUSIC_LOOP_MS = 15000"), "the phrase must loop about every 15 seconds now");
  assert.ok(!sound.includes("GAZEBO_MUSIC_LOOP_MS = 30000"), "the old 30-second loop must be gone");
  const phrase = sound.slice(sound.indexOf("export function gazeboMusicPhrase"), sound.indexOf("export function gazeboMusicVoice"));
  // Read the real step spacings out of the phrase table and
  // check the slowest phrase still fits inside the loop.
  const stepMatch = phrase.match(/const stepMs[^;]*;/s);
  assert.ok(stepMatch, "the phrase table must list a step spacing per tone");
  const steps = [...stepMatch[0].matchAll(/(\d+)/g)].map((m) => Number(m[1]));
  assert.equal(steps.length, 6, "there must be one step spacing per tone");
  assert.ok(Math.max(...steps) <= 1300, "no tone may step slower than about 1.3 seconds now");
  assert.ok(Math.min(...steps) >= 600, "the tones must still be calm, not hurried");
  const slowestPhraseMs = 11 * Math.max(...steps);
  assert.ok(slowestPhraseMs <= 15000, "the slowest phrase must still fit inside the 15-second loop");
  assert.ok(phrase.includes("piano: 1200"), "the piano steps must be about 1.2 seconds apart now");
  assert.ok(!phrase.includes("piano: 2400"), "the old 2.4-second piano steps must be gone");
});

test("the gazebo calls it background tones, not music, and shows no instrument labels", () => {
  assert.ok(gazebo.includes("Choose background tones in the gazebo"), "the chooser must be titled background tones");
  assert.ok(gazebo.includes("Original tones, made here for the gazebo — soft and slow."), "the chooser must say tones, made here, soft and slow");
  assert.ok(gazebo.includes("Background tones volume"), "the volume must be labelled background tones volume");
  // Numbered only, in the panel and in the enlarged view.
  assert.ok(gazebo.includes("Background tone ${i + 1} — playing, tap to stop"), "a playing tone must be numbered, not named");
  assert.ok(enlarged.includes("Background tone ${i + 1}"), "the enlarged chooser must number the tones too");
  // Zero instrument labels anywhere the visitor can see in
  // the gazebo — panel, enlarged view, volume, playing line.
  for (const label of ["Soft piano", "Harp", "Harmonica", "Acoustic guitar", "Violins", "Oboe"]) {
    assert.ok(!gazebo.includes(label), `the gazebo must not show the instrument label ${label}`);
  }
  assert.ok(!gazebo.includes("Choose music in the gazebo"), "the old music heading must be gone");
  assert.ok(!gazebo.includes("Gazebo music volume"), "the old music volume label must be gone");
  // The six distinct tone patterns are still underneath —
  // different keys, shapes and voices — only the names are gone.
  assert.ok(sound.includes("GAZEBO_MUSIC_LOOP_MS = 15000"), "the six tones must still loop");
  assert.ok(sound.includes('oboe: { type: "sawtooth", gain: 0.07 }'), "the sixth tone must keep its own reedy voice underneath");
});

test("the bell is unchanged — still the higher 2093 Hz bell Richard liked", () => {
  assert.ok(sound.includes("GAZEBO_BELL_FREQUENCIES_HZ: [number, number, number] = [2093, 3136, 4186]"),
    "the tiny bell must still strike at 2093 Hz");
  assert.ok(sound.includes("GAZEBO_BELL_GAIN = 0.07"), "the bell must stay soft");
});

test("the search index has a dedicated spirit guide entry", () => {
  const entry = SEARCH_INDEX.find((e) => e.id === "spirit-guide");
  assert.ok(entry, "the search index must have a spirit-guide entry");
  assert.equal(entry.title, "Your spirit guide", "the search result must be titled Your spirit guide");
  assert.ok(entry.openSpiritGuide, "the spirit guide entry must open the garden, not a tab");
  assert.ok(entry.keywords.includes("spirit"), "the keywords must include spirit");
  assert.ok(entry.keywords.includes("guide"), "the keywords must include guide");
  for (const word of ["owl", "robin", "turtle", "butterfly", "deer", "bear", "dog", "cat"]) {
    assert.ok(entry.keywords.includes(word), `the keywords must include the ${word} guide`);
  }
  for (const word of ["jesus", "god", "mohammed", "krishna"]) {
    assert.ok(entry.keywords.includes(word), `the keywords must include the custom guide ${word}`);
  }
  assert.ok(entry.snippet.includes("Your name & your spirit guide"), "the snippet must name the garden section");
});

test("searching spirit or spirit guide returns the spirit guide first", () => {
  assert.equal(searchApp("spirit")[0].id, "spirit-guide", "searching “spirit” must rank the spirit guide first");
  assert.equal(searchApp("spirit guide")[0].id, "spirit-guide", "searching “spirit guide” must rank the spirit guide first");
  assert.equal(searchApp("Spirit")[0].id, "spirit-guide", "searching “Spirit” must rank the spirit guide first");
  assert.equal(searchApp("spirit")[0].openSpiritGuide, true, "the spirit guide result must carry the openSpiritGuide flag");
  assert.ok(searchApp("jesus").some((r) => r.id === "spirit-guide"), "searching “jesus” must find the spirit guide");
  assert.ok(searchApp("owl").some((r) => r.id === "spirit-guide"), "searching “owl” must find the spirit guide");
});

test("the search box routes a spirit guide result to the garden's guide section", () => {
  assert.ok(searchBox.includes("onOpenSpiritGuide"), "the search box must take a spirit-guide opener");
  assert.ok(searchBox.includes("if (r.openSpiritGuide && onOpenSpiritGuide)"), "a spirit guide search result must open the garden, not a tab");
  assert.ok(searchBox.includes('"Garden →"'), "a spirit guide search result must be labelled as the garden");
  assert.ok(app.includes("onOpenSpiritGuide={openSpiritGuide}"), "the App must wire the search box to openSpiritGuide");
  assert.ok(app.includes("const openSpiritGuide = () =>"), "there must be an openSpiritGuide opener in the App");
  assert.ok(app.includes("setSpiritGuideRequest((n) => n + 1)"), "opening the spirit guide must bump the guide request, so the garden scrolls to it");
  assert.ok(app.includes('guideRequest={spiritGuideRequest}'), "the garden must receive the guide request");
  // The id and the scroll live in LifeGardenPage, which is
  // defined before the App in the file — check the whole source.
  assert.ok(src.includes('id="spirit-guide"'), "the garden must mark the name & spirit guide section to scroll to");
  assert.ok(src.includes('document.getElementById("spirit-guide")'), "the garden must scroll to the spirit guide section on a search request");
});
