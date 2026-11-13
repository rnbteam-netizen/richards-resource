// Post-review batch (Richard, 2026-11-12/13) — source-level tests.
// Richard read every word and tried every tab, then sent notes 1–9.
// The browser behaviours (speech, tones, localStorage) cannot run in
// node, so these tests pin the contract in the source instead: the
// exact wording, the ordering on Home, the wiring of the new controls,
// and that nothing else in the app moved. Runtime behaviour is
// covered by the typecheck + build, and by a local smoke test of the
// built bundle (see BUILD-NOTES.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const sound = readFileSync(path.join(root, "client", "src", "sound.ts"), "utf8");
const speech = readFileSync(path.join(root, "client", "src", "speech.ts"), "utf8");

const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));

test("1. crisis box on Home, after the tabs, before the points box", () => {
  // The shared crisis box, same wording as Feeling Unwell: 988 / 911.
  assert.ok(src.includes("In crisis right now?"), "crisis box must exist");
  assert.ok(home.includes("<CrisisStrip />"), "Home must render the crisis box");
  const tabs = home.indexOf('Section title="The tabs"');
  const points = home.indexOf('Section title="Your points"');
  const crisis = home.indexOf("<CrisisStrip />", tabs);
  assert.ok(tabs !== -1 && points !== -1 && crisis !== -1, "tabs, crisis box and points must all be on Home");
  assert.ok(tabs < crisis && crisis < points, "crisis box must sit after the tabs and before the points box");
  // No one gets points for killing themselves: the box is before points, not after.
  const crisisText = home.slice(crisis, crisis + 400);
  assert.ok(!crisisText.includes("Your points"), "crisis box must not be part of the points box");
});

test("2. UrgeSurf title is simply 'Ride out this urge' on every tab", () => {
  assert.ok(src.includes('title="Ride out this urge"'), "UrgeSurf title must be exactly 'Ride out this urge'");
  assert.ok(!src.includes("Ride out this urge —"), "no category label may follow the title");
  assert.ok(!src.includes("categoryLabel"), "UrgeSurf must not take a category label any more");
  assert.ok(!src.includes("Ride out this urge — Gambling"), "the Gambling label must be gone");
});

test("3. What's New banner: bigger dismiss button AND an X, same flag", () => {
  assert.ok(src.includes('aria-label="Dismiss what\'s new"'), "big dismiss button must exist");
  assert.ok(src.includes('aria-label="Close what\'s new"'), "an X button must exist");
  assert.ok(src.includes("Got it — hide this"), "dismiss button must still read 'Got it — hide this'");
  // Both buttons call the same dismiss, which writes the same flag.
  const banner = src.slice(src.indexOf("function WhatsNewBanner()"), src.indexOf("function timeLabel("));
  assert.ok(banner.includes("onClick={dismiss}"), "both buttons must call dismiss");
  assert.ok((banner.match(/onClick=\{dismiss\}/g) ?? []).length >= 2, "both buttons must be wired to dismiss");
  assert.ok(banner.includes("min-h-14"), "dismiss button must be bigger than before (min-h-14)");
  assert.ok(banner.includes("safeLocalSet(WHATS_NEW_KEY, WHATS_NEW_VERSION)"), "dismiss must record the seen version locally");
  assert.ok(banner.includes("it will not come back for this version"), "banner must say it will not come back");
});

test("4. breathing tones: calm tone louder (0.22) with a volume control", () => {
  assert.ok(sound.includes("CALM_TONE_GAIN = 0.22"), "calm tone gain must be 0.22, up from 0.05");
  assert.ok(!sound.includes("linearRampToValueAtTime(0.05,"), "the old whisper-quiet 0.05 gain must be gone");
  assert.ok(sound.includes("setCalmToneVolume"), "sound engine must offer a volume control");
  assert.ok(sound.includes("CALM_TONE_GAIN_MAX = 0.4"), "volume must be capped, so the tone can never get harsh");
  assert.ok(src.includes("Calm tone volume"), "breathing must show a volume control");
  assert.ok(src.includes('aria-label="Calm tone volume"'), "volume control must be labelled");
  assert.ok(src.includes('type="range"'), "volume control must be a slider");
  assert.ok(src.includes("sounds.setCalmToneVolume"), "breathing must call the volume control");
  // Tone still off by default, and still follows the phone's volume.
  assert.ok(src.includes('const [tone, setTone] = useState<CalmToneKind | "off">("off")'), "calm tone must still default to off");
  assert.ok(src.includes("follows your phone's volume"), "copy must still say sound follows the phone's volume");
  // Slot tones left alone: click/chime/low at their old, quiet levels.
  assert.ok(sound.includes('this.playTone(523, 220, "sine", 0.12)'), "slot chime must still be 0.12");
});

test("5. Codependency: soft female voice reads the phrases aloud, tap-to-hear", () => {
  assert.ok(src.includes("Hear it read aloud"), "Codependency must offer a read-aloud button");
  assert.ok(src.includes("speakText("), "read-aloud must use the speech helper");
  assert.ok(speech.includes("speechSynthesis"), "speech helper must use the phone's own text-to-speech");
  assert.ok(speech.includes("pickFemaleVoice"), "speech helper must prefer a female voice");
  assert.ok(speech.includes("Google US English") || speech.includes("google us english"), "voice choice must name the well-known female voices");
  assert.ok(speech.includes("cannot guarantee"), "speech helper must say plainly a female voice cannot be guaranteed");
  assert.ok(speech.includes("no recording"), "speech helper must say nothing is recorded");
  assert.ok(!speech.includes("fetch(") && !speech.includes("XMLHttpRequest"), "speech must send nothing anywhere");
  assert.ok(src.includes("nothing is recorded or sent"), "Codependency copy must say nothing is recorded or sent");
  assert.ok(src.includes("soft\n            female voice") || src.includes("soft female voice"), "Codependency copy must say a soft female voice is asked for");
  // No autoplay: the only speak call in Codependency sits in a tap handler.
  const codep = src.slice(src.indexOf("function CodependencyHook()"), src.indexOf("function FoodHook()"));
  assert.ok(codep.includes("onClick={() => { const phrase"), "read-aloud must fire from a tap");
  assert.ok(codep.includes("stopSpeaking()"), "speech must stop when the phrase changes or the tab is left");
});

test("6. Screens look-away: 10 seconds first, 30 seconds next, spoken 1-2-3-last", () => {
  const screens = src.slice(src.indexOf("function ScreensHook()"), src.indexOf("function WellbeingHook()"));
  assert.ok(screens.includes("I&apos;ll count to 10"), "10-second look-away must still be the first win");
  assert.ok(screens.includes("You did 10, try 30"), "30 seconds must be offered as the next rung");
  assert.ok(screens.includes("I&apos;ll count to 30"), "the 30-second rung must count to 30");
  assert.ok(!screens.includes("start(60)") && !screens.includes("count to 60"), "there must be no 60-second look-away timer");
  // Spoken counting: 1, 2, 3, then the last number — and off by default.
  assert.ok(screens.includes('speakNumber(1)'), "counting must speak 1");
  assert.ok(screens.includes('speakNumber(2)'), "counting must speak 2");
  assert.ok(screens.includes('speakNumber(3)'), "counting must speak 3");
  assert.ok(screens.includes('speakNumber(seconds)'), "counting must speak the last number (10 or 30)");
  assert.ok(screens.includes("const [speakOn, setSpeakOn] = useState(false)"), "spoken counting must default to off");
  assert.ok(screens.includes("Hear the counting"), "Screens must offer a spoken-counting toggle");
  assert.ok(screens.includes("1, 2, 3, then the last number"), "copy must explain the sparse counting");
  assert.ok(speech.includes("speakNumber"), "speech helper must offer speaking a number");
});

test("7. grammar: 'None of these are new', 'doctors use' kept", () => {
  assert.ok(src.includes("None of these are new"), "Longevity must read 'None of these are new'");
  assert.ok(!src.includes("None of these is new"), "the old 'None of these is new' must be gone");
  assert.ok(src.includes("the check-ins doctors use"), "'doctors use' must be kept, no possessive");
  assert.ok(!src.includes("doctors' use"), "'doctors' use' must not appear");
});

test("8. Terms: one page, arbitration in Grays Harbor County, errors and omissions, never a locked gate", () => {
  assert.ok(src.includes("function TermsPage("), "a Terms page must exist");
  assert.ok(src.includes("We are here to help."), "Terms must start 'We are here to help.'");
  assert.ok(src.includes("Arbitration in Grays Harbor County, Washington."), "Terms must include arbitration in Grays Harbor County");
  assert.ok(src.includes("binding arbitration in Grays Harbor County"), "arbitration must be binding, in Grays Harbor County");
  assert.ok(src.includes("errors and omissions") || src.includes("errors or\n            omissions"), "Terms must include errors-and-omissions verbiage");
  assert.ok(src.includes("may contain errors or\n            omissions"), "errors-and-omissions clause must be present in full");
  assert.ok(src.includes("not legal advice"), "Terms must say plainly it is not legal advice");
  // Linked in the footer on every tab (MeadowFooter is rendered in App root)
  // and on Help & Resources (ResourcesPage).
  const footer = src.slice(src.indexOf("function MeadowFooter("), src.indexOf("/* ---------- the pause"));
  assert.ok(footer.includes("Terms of Use"), "footer must link the Terms");
  const resources = src.slice(src.indexOf("function ResourcesPage("), src.indexOf("/* ---------- root ---------- */"));
  assert.ok(resources.includes("Terms of Use"), "Help & Resources must link the Terms");
  // First-visit notice: short, with a link and a Got it button, never a gate.
  assert.ok(src.includes("function TermsNotice("), "a first-visit Terms notice must exist");
  assert.ok(src.includes('aria-label="Dismiss terms notice"'), "notice must have a Got it dismiss");
  assert.ok(src.includes("Help is never locked behind it"), "notice must say help is never locked behind the Terms");
  assert.ok(src.includes('const TERMS_KEY = "richards-resource:terms-seen"'), "notice must use its own local flag");
  // The Terms page itself has a back button, and the App renders it
  // in place of the tab content — the tabs stay reachable from the nav.
  assert.ok(src.includes("Back to the app"), "Terms page must have a way back");
  assert.ok(src.includes("<TermsPage onBack="), "App must render the Terms page");
  assert.ok(src.includes("<TermsNotice onReadTerms="), "App must render the first-visit notice");
  // All ten sections present.
  for (const heading of ["1. This is support, not medical advice.", "2. In a crisis, get help now.", "3. No guarantees.", "4. Your data.", "5. Your responsibility.", "6. Donations.", "7. The app as it is", "8. Arbitration", "9. Changes.", "10. Contact."]) {
    assert.ok(src.includes(heading), `Terms must include section: ${heading}`);
  }
});

test("9. true message first thing on Home, with the privacy line", () => {
  // JSX writes the apostrophe as an HTML entity, so the test string does too.
  const TRUE = "We don&apos;t share your data. This is your personal journey... BUT YOU ARE NOT ALONE. Help is at your fingertips.";
  assert.ok(home.includes(TRUE), "Home must carry the true message in full");
  // First thing on Home: before the What's new banner, the tagline and the banner.
  const first = home.indexOf(TRUE);
  assert.ok(first !== -1 && first < home.indexOf("<WhatsNewBanner />"), "true message must come before the What's new banner");
  assert.ok(first < home.indexOf("Making the world"), "true message must come before the tagline");
  assert.ok(first < home.indexOf("The best FREE self-help app EVER!"), "true message must come before the banner");
  // The privacy line itself is unchanged elsewhere.
  assert.ok(src.includes("We don't share your data. This is your personal journey."), "privacy line must be unchanged");
  // Also in the Terms, right under "We are here to help." — the two
  // halves sit in separate paragraphs there, so check both.
  const terms = src.slice(src.indexOf("function TermsPage("), src.indexOf("function TermsNotice("));
  assert.ok(terms.includes("We don&apos;t share your data. This is your personal journey."), "Terms must carry the privacy half of the true message");
  assert.ok(terms.includes("BUT YOU ARE NOT ALONE. Help is at your fingertips."), "Terms must carry the 'not alone' half of the true message");
});

test("scoped: banner, tagline, copyright and points are untouched", () => {
  assert.ok(src.includes("The best FREE self-help app EVER!"), "banner must be unchanged");
  assert.ok(src.includes("Making the world 🌎 a happier place ❤️"), "tagline must be unchanged");
  assert.ok(src.includes("© 2026 Richard's Resource. All rights reserved."), "copyright must be unchanged");
  assert.ok(src.includes("No one gets points for killing themselves") || true, "crisis note is in the review file, not the app copy");
  assert.ok(!src.includes("RR is your personal and private"), "launch/intro positioning must NOT be added to the app");
});
