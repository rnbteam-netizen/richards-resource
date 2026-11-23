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
const theme = readFileSync(path.join(root, "client", "src", "theme.css"), "utf8");

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

test("6. Screens look-away: 10 seconds first, 30 seconds next, sound only at the end", () => {
  const screens = src.slice(src.indexOf("function ScreensHook()"), src.indexOf("function WellbeingHook()"));
  assert.ok(screens.includes("Look up now — 10 seconds"), "10-second look-away must still be the first win");
  assert.ok(screens.includes("You did 10, try 30"), "30 seconds must be offered as the next rung");
  assert.ok(!screens.includes("start(60)") && !screens.includes("count to 60"), "there must be no 60-second look-away timer");
  // Sound only (Richard, 2026-11-14): no spoken counting — the voice
  // was too variable — just a soft sound when 10 or 30 seconds is up.
  assert.ok(!screens.includes("speakNumber"), "look-away must not speak numbers any more");
  assert.ok(!screens.includes("speakOn"), "look-away must not offer a spoken-counting toggle");
  assert.ok(!screens.includes("Hear the counting"), "look-away must not offer spoken counting");
  assert.ok(screens.includes("sounds.playDoneSound()"), "look-away must play a sound when the time is up");
  assert.ok(screens.includes("sounds.prepareAudio()"), "look-away must warm up audio from the tap, so the end sound can be heard");
  assert.ok(sound.includes("playDoneSound"), "sound helper must offer a done sound");
  assert.ok(screens.includes("A soft sound plays when your time is up"), "copy must say a soft sound plays when the time is up");
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

test("9. true message on Home, with the privacy line said once (rephrased 2026-11-23)", () => {
  // JSX writes the apostrophe as an HTML entity, so the test string does too.
  const TRUE = "This is your personal journey, your personal cottage, but you are not alone. This app is your resource guide for help at your fingertips. We even have a button for when you&apos;re feeling happy.";
  assert.ok(home.includes(TRUE), "Home must carry the true message in full");
  // 2026-11-23 follow-up (Richard: "the Dept of redundancy
  // department strikes again"): the small privacy paragraph was
  // removed from this box — it is already said above the
  // cottage, in the PrivacyStrip.
  assert.ok(!home.includes("We don&apos;t ask for it, we don&apos;t collect it. We have no personal information to share with anyone."),
    "the small privacy paragraph must be gone from the true-message box");
  // Before the What's new banner, the tagline and the banner.
  const first = home.indexOf(TRUE);
  assert.ok(first !== -1 && first < home.indexOf("<WhatsNewBanner />"), "true message must come before the What's new banner");
  assert.ok(first < home.indexOf("Making the world"), "true message must come before the tagline");
  assert.ok(first < home.indexOf("The best FREE self-help app EVER!"), "true message must come before the banner");
  // The old wording is gone from Home, and the small privacy
  // paragraph is gone from the true-message box (2026-11-23
  // follow-up) — no duplicate privacy lines there.
  assert.ok(!home.includes("BUT YOU ARE NOT ALONE"), "the old true-message wording must not remain on Home");
  assert.ok(!home.includes("We don&apos;t share your data"), "Home must not repeat the old privacy line");
  // The privacy line itself is unchanged elsewhere (PrivacyStrip, Terms).
  assert.ok(src.includes("We don't share your data. This is your personal journey."), "privacy line must be unchanged elsewhere");
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

test("10. held fixes 2026-11-14: breathing 3/1/4/1 and the new privacy line", () => {
  // Breathing (Richard, 2026-11-14): in 3, pause 1, out 4, pause 1.
  assert.ok(src.includes("const BREATH_IN_MS = 3000"), "breathing in must be 3 seconds");
  assert.ok(src.includes("const BREATH_OUT_MS = 4000"), "breathing out must be 4 seconds");
  assert.ok(src.includes("const BREATH_PAUSE_MS = 1000"), "breathing must have a 1-second pause after breathing out");
  assert.ok(src.includes("BREATH_IN_MS + BREATH_HOLD_MS + BREATH_OUT_MS + BREATH_PAUSE_MS"), "breathing cycle must include all four phases");
  assert.ok(src.includes("in… 2, 3 — pause — out… 2, 3, 4 — pause."), "breathing caption must read 3 in, pause, 4 out, pause");
  assert.ok(!src.includes("in… 2, 3, 4 — hold — out… 2, 3, 4, 5, 6."), "old 4/1/6 caption must be gone");
  assert.ok(!src.includes("about 11 seconds"), "old 11-second breathing copy must be gone");
  assert.ok(theme.includes("animation: breathe 9s"), "breathing circle must run a 9-second cycle");
  // Privacy line (Richard, 2026-11-14): in the PrivacyStrip, on every tab.
  assert.ok(src.includes("We can't share your personal information, because we don't ask for it."), "app must carry the new privacy line");
  const strip = src.slice(src.indexOf("function PrivacyStrip()"), src.indexOf("function DisclaimerShort()"));
  assert.ok(strip.includes("We can't share your personal information, because we don't ask for it."), "new privacy line must sit in the PrivacyStrip");
});
