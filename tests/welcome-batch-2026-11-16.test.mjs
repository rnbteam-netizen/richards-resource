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

test("13/21/22/24. Welcome cottage is a FULL COVER PAGE first, tap the door to enter, never a gate", () => {
  const imgPath = path.join(root, "client", "src", "assets", "welcome-cottage.jpg");
  assert.ok(existsSync(imgPath), "the chosen cottage image must live in the app's client assets");
  const buf = readFileSync(imgPath);
  assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff], "cottage image must be a real JPEG");
  assert.ok(buf.length > 100000, "cottage image must be the full 1920x1280 picture, not a placeholder");
  assert.ok(src.includes('import welcomeCottage from "./assets/welcome-cottage.jpg"'), "the image must be imported so Vite bundles it");
  // The cover itself: a dedicated full-screen component.
  assert.ok(src.includes("function WelcomeCover("), "a WelcomeCover component must exist");
  const cover = src.slice(src.indexOf("function WelcomeCover("), src.indexOf("function WelcomeIntro()"));
  assert.ok(cover.includes("min-h-dvh"), "the cover must be full-screen");
  assert.ok(cover.includes('aria-label="Open the door and begin'), "the cottage must be a tap-to-enter button");
  assert.ok(cover.includes("WELCOME"), "the image alt text must name the WELCOME mat");
  assert.ok(cover.includes("Tap the door to come in"), "the cover must say tap the door to come in");
  assert.ok(cover.includes("open please come in"), "the cover must carry the sign wording");
  // Not a gate: a skip button on the cover itself goes straight in.
  assert.ok(cover.includes("skip the welcome"), "there must be a skip-the-welcome button on the cover");
  assert.ok(cover.includes("I need help right now"), "the skip button must offer help right now");
  assert.ok(!src.includes("The tabs above are always open"), "no tabs are shown above the cover, so that line must be gone");
  // The App gates on the cover: first open shows ONLY the cover —
  // no tab nav, no Home, no footer — until the door is tapped.
  const app = src.slice(src.indexOf("export function App()"));
  assert.ok(src.includes('const WELCOME_KEY = "richards-resource:welcome-seen"'), "the cover must use its own localStorage key");
  assert.ok(app.includes('safeLocalGet(WELCOME_KEY) === "seen"'), "the App must hide the cover once the flag is set");
  assert.ok(app.includes('safeLocalSet(WELCOME_KEY, "seen")'), "entering must record the seen flag locally");
  assert.ok(app.includes("return <WelcomeCover onEnter={enterWelcome} />;"), "the App must return only the cover before first entry");
  assert.ok(app.indexOf("if (!welcomeEntered)") < app.indexOf('<nav aria-label="Sections"'), "the cover gate must come before the tab nav");
  assert.ok(app.indexOf("if (!welcomeEntered)") < app.indexOf("<HomePage"), "the cover gate must come before Home");
  assert.ok(app.indexOf("if (!welcomeEntered)") < app.indexOf("<MeadowFooter"), "the cover gate must come before the footer");
  // After tapping, Home shows the choose wording, verbatim, with
  // 'choose' not 'use'/'select' — via the WelcomeIntro line on Home.
  assert.ok(src.includes("function WelcomeIntro()"), "a WelcomeIntro component must exist on Home");
  assert.ok(home.includes("<WelcomeIntro />"), "Home must render the Welcome intro line");
  const TRUE = "This is your personal journey, your personal cottage, but you are not alone.";
  assert.ok(home.indexOf("<WelcomeIntro />") < home.indexOf(TRUE), "intro must come before the true message");
  assert.ok(home.indexOf("<WelcomeIntro />") < home.indexOf("<WhatsNewBanner />"), "intro must come before What's New");
  assert.ok(src.includes("please feel free to choose any option, you may choose as many as you like"), "Home must carry the exact choose wording");
  assert.ok(!src.includes("please feel free to select any option"), "the old 'select' wording must not appear");
  assert.ok(!src.includes("please feel free to choose any option, you may use as many as you like"), "the wording must say 'choose', not 'use'");
});

test("13/21/22/24b. After entry, the cottage stays on Home, just above the choose wording", () => {
  // WelcomeIntro is what Home renders after the cover is entered.
  assert.ok(src.includes("function WelcomeIntro()"), "a WelcomeIntro component must exist on Home");
  const intro = src.slice(src.indexOf("function WelcomeIntro()"), src.indexOf("function HomePage("));
  // The same cottage image, shown FULL and uncropped — no fixed
  // height, no object-cover crop — so the stepping-stone pathway
  // and the background scenery are visible (Richard, 2026-11-16:
  // the cropped banner hid them). Not the full cover again.
  assert.ok(intro.includes("src={welcomeCottage}"), "Home must show the cottage image above the choose line");
  assert.ok(intro.includes("h-auto w-full"), "the Home cottage must show the full image, uncropped (h-auto w-full)");
  assert.ok(!intro.includes("object-cover"), "the Home cottage must not crop the image with object-cover");
  assert.ok(!intro.includes("h-36"), "the Home cottage must not use a fixed banner height (h-36) that crops it");
  assert.ok(!intro.includes("min-h-dvh"), "the Home cottage must not be a full-screen cover");
  assert.ok(intro.includes("WELCOME"), "the Home cottage alt text must name the WELCOME mat");
  assert.ok(!intro.includes("Tap the door to come in"), "the Home cottage is not a tap-to-enter button, so it must not say tap the door");
  // The cottage comes just above the choose wording, verbatim
  // (the wording itself lives in WELCOME_CHOOSE_TEXT, pinned
  // verbatim in the cover test above).
  assert.ok(intro.includes("{WELCOME_CHOOSE_TEXT}"), "the choose wording must follow the cottage");
  assert.ok(intro.indexOf("src={welcomeCottage}") < intro.indexOf("{WELCOME_CHOOSE_TEXT}"), "the cottage must sit above the choose wording");
  assert.ok(home.includes("<WelcomeIntro />"), "Home must render WelcomeIntro on every visit");
  // The cover itself is unchanged: full-screen, first open only.
  assert.ok(src.includes("function WelcomeCover("), "the full cover page must still exist for first-time visitors");
  const cover = src.slice(src.indexOf("function WelcomeCover("), src.indexOf("function WelcomeIntro()"));
  assert.ok(cover.includes("min-h-dvh"), "the cover must still be full-screen");
  assert.ok(cover.includes("skip the welcome"), "the cover must still carry the skip-the-welcome button");
});

test("24c. Cursor is a hand over the cottage door and the skip button on a laptop (Brian, 2026-11-16)", () => {
  // Brian, on his laptop: the cursor did not change when hovering over
  // the cottage on the cover — no hand to show it is a link. Root
  // cause: Tailwind v4 preflight does not give buttons a pointer
  // cursor by default. Fix: a global rule in theme.css, plus
  // cursor-pointer pinned on the cover's two buttons.
  const css = readFileSync(path.join(root, "client", "src", "theme.css"), "utf8");
  assert.ok(css.includes("button, a"), "theme.css must have a button/link cursor rule");
  assert.ok(css.includes("cursor: pointer"), "theme.css must set the pointer cursor for buttons and links");
  const cover = src.slice(src.indexOf("function WelcomeCover("), src.indexOf("function WelcomeIntro()"));
  // Both cover buttons must carry cursor-pointer explicitly.
  assert.ok(cover.includes("cursor-pointer"), "the cover buttons must carry cursor-pointer");
  const buttons = cover.match(/<button[^>]*className="[^"]*"/g) ?? [];
  assert.equal(buttons.length, 2, "the cover must have exactly two buttons (cottage + skip)");
  assert.ok(buttons.every((b) => b.includes("cursor-pointer")), "both cover buttons must have cursor-pointer");
  assert.ok(cover.includes("Open the door and begin"), "the cottage button must still be the tap-to-enter button");
  // The Home banner cottage is NOT a button/link, so it must NOT
  // get a pointer cursor — leave it as a plain image. The slice ends
  // at the Happy Button section (2026-11-18), which sits between the
  // intro and HomePage and does contain buttons of its own.
  const intro = src.slice(src.indexOf("function WelcomeIntro()"), src.indexOf("/* ---------- the Happy Button"));
  assert.ok(!intro.includes("cursor-pointer"), "the Home cottage is not a button, so it must not show a pointer cursor");
  assert.ok(!intro.includes("<button"), "the Home cottage must not be a button");
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
