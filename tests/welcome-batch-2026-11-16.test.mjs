// Welcome batch (Richard, 2026-11-15/16, notes 10, 11, 13, 16, 20,
// 21, 22, 24, 26) — source-level tests, same pattern as the earlier
// batches: the browser behaviours (speech voices, localStorage, tap
// to enter) cannot run in node, so these tests pin the contract in
// the source instead: the exact wording, the wiring, the image, and
// that nothing out of scope moved. Runtime behaviour is covered by
// the typecheck + build, and by a local smoke test of the built
// bundle (see BUILD-NOTES.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const speech = readFileSync(path.join(root, "client", "src", "speech.ts"), "utf8");

const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
const footer = src.slice(src.indexOf("function MeadowFooter("), src.indexOf("/* ---------- the pause"));
const resources = src.slice(src.indexOf("function ResourcesPage("), src.indexOf("/* ---------- root ---------- */"));

test("10. What's New is click-to-open, not full wordy text on Home", () => {
  assert.ok(src.includes("function WhatsNewBanner()"), "WhatsNewBanner must exist");
  assert.ok(src.includes("tap to open"), "banner must offer tap to open");
  assert.ok(src.includes("aria-expanded={open}"), "open/closed state must be exposed");
  assert.ok(src.includes("const [open, setOpen] = useState(false)"), "banner must start closed");
  // The list is only rendered when open.
  const banner = src.slice(src.indexOf("function WhatsNewBanner()"), src.indexOf("function timeLabel("));
  assert.ok(banner.includes("{open && ("), "the wordy list must render only when open");
  // Dismiss behaviour unchanged: same flag, same version, same copy.
  assert.ok(src.includes('const WHATS_NEW_VERSION = "1.1.0"'), "version must stay 1.1.0");
  assert.ok(src.includes('const WHATS_NEW_KEY = "richards-resource:whats-new-seen"'), "dismiss flag key must be unchanged");
  assert.ok(banner.includes("safeLocalSet(WHATS_NEW_KEY, WHATS_NEW_VERSION)"), "dismiss must record the seen version locally");
  assert.ok(banner.includes("Got it — hide this"), "dismiss button must still read 'Got it — hide this'");
  assert.ok(banner.includes("it will not come back for this version"), "banner must say it will not come back");
});

test("13/21/22/24. Welcome cottage intro first on Home, tap the door to enter, never a gate", () => {
  const imgPath = path.join(root, "client", "src", "assets", "welcome-cottage.jpg");
  assert.ok(existsSync(imgPath), "the chosen cottage image must live in the app's client assets");
  const buf = readFileSync(imgPath);
  assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff], "cottage image must be a real JPEG");
  assert.ok(buf.length > 100000, "cottage image must be the full 1920x1280 picture, not a placeholder");
  assert.ok(src.includes('import welcomeCottage from "./assets/welcome-cottage.jpg"'), "the image must be imported so Vite bundles it");
  assert.ok(src.includes("function WelcomeIntro()"), "a WelcomeIntro component must exist");
  assert.ok(home.includes("<WelcomeIntro />"), "Home must render the Welcome intro");
  // First thing on Home: before the true message, What's New, the tagline and the banner.
  const TRUE = "We don&apos;t share your data. This is your personal journey... BUT YOU ARE NOT ALONE. Help is at your fingertips.";
  assert.ok(home.indexOf("<WelcomeIntro />") < home.indexOf(TRUE), "intro must come before the true message");
  assert.ok(home.indexOf("<WelcomeIntro />") < home.indexOf("<WhatsNewBanner />"), "intro must come before What's New");
  // The door is the entry: one tap, on the image button.
  const intro = src.slice(src.indexOf("function WelcomeIntro()"), src.indexOf("function HomePage("));
  assert.ok(intro.includes('aria-label="Open the door and begin'), "the cottage must be a tap-to-enter button");
  assert.ok(intro.includes("WELCOME"), "the image alt text must name the WELCOME mat");
  assert.ok(intro.includes("Tap the door to come in"), "the intro must say tap the door to come in");
  // Not a gate: a skip button, and the tabs above are always open.
  assert.ok(intro.includes("skip the welcome"), "there must be a skip-the-welcome button");
  assert.ok(intro.includes("The tabs above are always open"), "the intro must say the tabs are always open");
  // Does not reappear after first entry: its own localStorage flag.
  assert.ok(src.includes('const WELCOME_KEY = "richards-resource:welcome-seen"'), "intro must use its own localStorage key");
  assert.ok(intro.includes("safeLocalSet(WELCOME_KEY, \"seen\")"), "entering must record the seen flag locally");
  assert.ok(intro.includes('safeLocalGet(WELCOME_KEY) === "seen"'), "intro must hide once the flag is set");
  // After tapping, the next screen says, verbatim, with 'choose' not 'use'/'select'.
  assert.ok(src.includes("please feel free to choose any option, you may choose as many as you like"), "Home must carry the exact choose wording");
  assert.ok(!src.includes("please feel free to select any option"), "the old 'select' wording must not appear");
  assert.ok(!src.includes("please feel free to choose any option, you may use as many as you like"), "the wording must say 'choose', not 'use'");
});

test("16. Home banner 'The best FREE self-help app EVER!' is about 1/4 its size", () => {
  assert.ok(src.includes("The best FREE self-help app EVER!"), "banner wording must be unchanged");
  assert.ok(!home.includes("text-[28px]"), "the banner must no longer be 28px");
  assert.ok(!home.includes("sm:text-4xl"), "the banner must no longer be 4xl on wide screens");
  assert.ok(home.includes("text-sm"), "the banner must be small now");
});

test("20. Contact email in Help & Resources and in the footer, tap-to-email", () => {
  assert.ok(src.includes('const CONTACT_EMAIL = "richardsresource3@gmail.com"'), "contact email must be richardsresource3@gmail.com");
  assert.ok(src.includes("mailto:"), "email must be a tap-to-email mailto link");
  assert.ok(src.includes("Questions or feedback? Email"), "the line must read 'Questions or feedback? Email'");
  assert.ok(resources.includes("<FeedbackContact />"), "Help & Resources must show the feedback contact");
  assert.ok(footer.includes("<FeedbackContact />"), "the footer on every tab must show the feedback contact");
  const contact = src.slice(src.indexOf("function FeedbackContact()"), src.indexOf("function WelcomeIntro()"));
  assert.ok(!contact.includes("<form"), "the feedback contact must be just a mailto link, no form");
});

test("11. Add to Home Screen: not one touch, short plain steps", () => {
  const hint = src.slice(src.indexOf("function AddToHomeScreenHint()"), src.indexOf("function HomePage("));
  assert.ok(hint.includes("It takes a few taps, not one touch"), "hint must say plainly it is not one touch");
  assert.ok(hint.includes("three dots"), "steps must name the three dots menu");
  assert.ok(hint.includes("Add to Home Screen"), "steps must name Add to Home Screen");
  assert.ok(hint.includes("then <strong>Add</strong>"), "steps must end with Add");
  // The old promises are unchanged.
  assert.ok(hint.includes("RR opens full-screen, like an app, and updates automatically."), "hint must still say RR opens full-screen and updates automatically");
});

test("26. Codependency voice: en-US voices first, so no garbled non-US voice", () => {
  assert.ok(speech.includes("pickFemaleVoice"), "speech helper must still pick a voice");
  const pick = speech.slice(speech.indexOf("export function pickFemaleVoice("), speech.indexOf("function getVoices()"));
  assert.ok(pick.includes('v.lang.toLowerCase() === "en-us"'), "voice choice must prefer en-US");
  // en-US is checked before any other English voice: the en-US find
  // comes before the plain-English find in the source.
  assert.ok(pick.indexOf('=== "en-us"') < pick.indexOf('startsWith("en")'), "en-US must be preferred before any other English voice");
  assert.ok(pick.includes("Google US English") || pick.includes("google us english"), "Google US English must still be named");
  // Still optional, tap-to-hear, off by default, nothing recorded/sent.
  assert.ok(speech.includes("speechSynthesis"), "speech must use the phone's own text-to-speech");
  assert.ok(speech.includes("cannot guarantee"), "speech must say plainly a voice cannot be guaranteed");
  assert.ok(speech.includes("no recording"), "speech must say nothing is recorded");
  assert.ok(!speech.includes("fetch("), "speech must send nothing anywhere");
});

test("scoped: breathing, Terms, palette and the duplicated disclaimer are untouched", () => {
  // Breathing as-is (Richard, 2026-11-15): in 3, pause 1, out 4, pause 1.
  assert.ok(src.includes("const BREATH_IN_MS = 3000"), "breathing in must still be 3 seconds");
  assert.ok(src.includes("const BREATH_OUT_MS = 4000"), "breathing out must still be 4 seconds");
  assert.ok(src.includes("in… 2, 3 — pause — out… 2, 3, 4 — pause."), "breathing caption must be unchanged");
  assert.ok(!src.includes("Timeout box"), "no Timeout box may be added");
  // Terms unchanged.
  assert.ok(src.includes("We are here to help."), "Terms must still start 'We are here to help.'");
  assert.ok(src.includes("Arbitration in Grays Harbor County, Washington."), "Terms arbitration must be unchanged");
  // Duplicated disclaimer at the very end: no change (note 25).
  assert.ok(src.includes("function MedicalDisclaimer()"), "the full medical disclaimer must still exist");
  assert.ok(footer.includes("<MedicalDisclaimer />"), "the footer must still render the disclaimer");
  // Tagline, copyright and points untouched.
  assert.ok(src.includes("Making the world 🌎 a happier place ❤️"), "tagline must be unchanged");
  assert.ok(src.includes("© 2026 Richard's Resource. All rights reserved."), "copyright must be unchanged");
});
