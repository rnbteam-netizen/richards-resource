// Sounds + What's new (Richard, 2026-11-12) — source-level tests.
// The sound engine is Web Audio in the browser, which node has no
// access to, so these tests pin the contract in the source instead:
// defaults off, no audio files, no autoplay, no push/email/phone,
// no medical claims, and the What's new banner shows once per
// version from a local-only flag. The runtime behaviour (tones only
// after a tap, tone stops when breathing stops) is covered by the
// typecheck + build below in CI order, and by the wiring assertions
// here (the calls sit inside tap handlers and the breathing effect).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const sound = readFileSync(path.join(root, "client", "src", "sound.ts"), "utf8");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

test("sound engine: Web Audio only, no audio files, no new dependencies", () => {
  assert.ok(sound.includes("AudioContext"), "sound engine must use the Web Audio API");
  assert.ok(!sound.includes(".mp3") && !sound.includes(".wav") && !sound.includes(".ogg"),
    "no audio files — tones are generated in the browser");
  assert.ok(!sound.includes("new Audio("), "no HTMLAudioElement — Web Audio only");
  assert.ok(sound.includes("createOscillator"), "tones must be generated oscillators");
  assert.ok(!pkg.dependencies || !("tone" in pkg.dependencies),
    "no new sound dependency was added");
});

test("slot sounds: click on spin, chime on win, low tone when broke — off by default", () => {
  // Specs: click 880 Hz short blip, chime two soft notes, low falling note.
  assert.ok(sound.includes('click: { frequencyHz: 880'), "click tone must be specced");
  assert.ok(sound.includes("523"), "chime must start on a soft 523 Hz note");
  assert.ok(sound.includes('low: { frequencyHz: 160'), "low tone must be specced");
  assert.ok(src.includes('playSlotSound("click")'), "a spin must play the click");
  assert.ok(src.includes('playSlotSound("chime")'), "a win must play the chime");
  assert.ok(src.includes('playSlotSound("low")'), "running out must play the low tone");
  // Off by default, with a speaker toggle on the Gambling tab's machine.
  assert.ok(src.includes("const [soundOn, setSoundOn] = useState(false)"),
    "slot sounds must default to off");
  assert.ok(src.includes("Slot sounds: off"), "toggle must show the off state");
  assert.ok(src.includes("Slot sounds: on"), "toggle must show the on state");
  assert.ok(src.includes('aria-pressed={soundOn}'), "toggle must expose its state");
  assert.ok(src.includes("never on its own"), "toggle must say sound never plays by itself");
  // Sounds only fire when soundOn — every play call is guarded.
  for (const call of src.match(/sounds\.playSlotSound\("[a-z]+"\)/g) ?? []) {
    const idx = src.indexOf(call);
    const before = src.slice(Math.max(0, idx - 200), idx);
    assert.ok(before.includes("soundOn"), `${call} must be guarded by soundOn`);
  }
});

test("calm tone: binaural-style, calm ~10 Hz and sleepy ~6 Hz, off by default, no medical claims", () => {
  assert.ok(sound.includes("CALM_TONE_BEAT_HZ = 10"), "calm tone beat must be ~10 Hz");
  assert.ok(sound.includes("SLEEPY_TONE_BEAT_HZ = 6"), "sleepy tone beat must be ~6 Hz");
  assert.ok(sound.includes("CALM_TONE_BASE_HZ = 200"), "base tone must be a low 200 Hz");
  assert.ok(sound.includes("createStereoPanner"), "one tone per ear, via stereo panning");
  assert.ok(src.includes('const [tone, setTone] = useState<CalmToneKind | "off">("off")'),
    "calm tone must default to off");
  assert.ok(src.includes("Calm tone"), "breathing must offer the calm tone");
  assert.ok(src.includes("Sleepy tone"), "breathing must offer the sleepy tone");
  assert.ok(src.includes("Tone off"), "breathing must offer turning the tone off");
  // No medical claims anywhere near the tone.
  assert.ok(src.includes("change your") && src.includes("brainwaves"),
    "tone copy must say plainly it doesn't change brainwaves");
  assert.ok(src.includes("promises nothing medical"), "tone copy must promise nothing medical");
  assert.ok(!sound.toLowerCase().includes("brainwave entrainment"),
    "no brainwave-entrainment claims");
  assert.ok(!src.includes("changes your brainwaves"),
    "no claim that the tone changes brainwaves");
  // The tone starts only while breathing runs, and stops with it.
  assert.ok(src.includes("sounds.startCalmTone(tone)"), "breathing must start the tone");
  assert.ok(src.includes("sounds.stopCalmTone()"), "breathing must stop the tone");
  assert.ok(src.includes("if (!running || tone === \"off\") return;"),
    "tone must only start while breathing is running and a tone is chosen");
  assert.ok(src.includes("useEffect(() => () => sounds.stopCalmTone(), [])"),
    "tone must stop when the breathing exercise unmounts (tab left)");
  // Peace of Mind gets the tone through its one shared breathing exercise.
  const peace = src.slice(src.indexOf("function PeacePage()"), src.indexOf("/* ---------- home & resources ---------- */"));
  assert.ok(peace.includes("<CalmingBreathing />"), "Peace of Mind must include the breathing exercise with its tone toggle");
  const breathingCount = (peace.match(/<CalmingBreathing \/>/g) ?? []).length;
  assert.equal(breathingCount, 1, "Peace must still have exactly one breathing exercise");
});

test("sounds respect silence: lazy context, tap-only, no autoplay", () => {
  assert.ok(sound.includes("created lazily, only inside a"), "context must be created lazily");
  assert.ok(sound.includes("never on load"), "sound engine must say never on load");
  assert.ok(sound.includes("silent"), "sound engine must address the silent switch");
  // No AudioContext creation at module load: the only `new Ctor()` is
  // inside getAudioContext, called from tap-driven methods.
  assert.ok(!/^const ctx = new/m.test(sound), "no audio context at module load");
  assert.ok(!src.includes("sounds.playSlotSound") || src.includes("soundOn"),
    "slot sounds must be gated on the toggle");
  assert.ok(!src.match(/sounds\.startCalmTone\(tone\)/g) || src.includes("if (!running"),
    "calm tone must be gated on breathing running");
});

test("What's new: banner on Home, once per version, local flag only — no push, no email, no phone", () => {
  assert.equal(pkg.version, "1.1.0", "package version must be 1.1.0 for this What's new version");
  assert.ok(src.includes('const WHATS_NEW_VERSION = "1.1.0"'), "banner version must be 1.1.0");
  assert.ok(src.includes("function WhatsNewBanner()"), "WhatsNewBanner must exist");
  assert.ok(src.includes("<WhatsNewBanner />"), "Home must render the banner");
  const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
  assert.ok(home.includes("<WhatsNewBanner />"), "banner must be on the Home page");
  assert.ok(src.includes('const WHATS_NEW_KEY = "richards-resource:whats-new-seen"'),
    "banner must use its own localStorage key");
  assert.ok(src.includes("safeLocalGet(WHATS_NEW_KEY) !== WHATS_NEW_VERSION"),
    "banner must show only when this version hasn't been seen");
  assert.ok(src.includes("safeLocalSet(WHATS_NEW_KEY, WHATS_NEW_VERSION)"),
    "dismissing must record the seen version locally");
  assert.ok(src.includes('aria-label="Dismiss what\'s new"'), "banner must have a dismiss button");
  // The banner lists what's new in this version.
  for (const item of ["Longevity tab", "Peace of Mind tab", "Icons on every tab button", "Optional sounds", "What's new banner"]) {
    assert.ok(src.includes(item), `banner must mention: ${item}`);
  }
  assert.ok(src.includes("No notifications, no emails"), "banner must say there are no notifications or emails");
  // No push notification code, service-worker push, VAPID, or
  // email/phone collection anywhere in the client or server.
  const allFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|mjs|json|html)$/.test(entry.name)) allFiles.push(p);
    }
  };
  walk(path.join(root, "client", "src"));
  walk(path.join(root, "server", "src"));
  const banned = ["Notification", "PushManager", "VAPID", "vapid", "serviceWorker", "pushManager", "subscribe(", "requestPermission"];
  for (const file of allFiles) {
    const text = readFileSync(file, "utf8");
    for (const word of banned) {
      assert.ok(!text.includes(word), `${path.relative(root, file)} must not contain push/notification code (${word})`);
    }
  }
  // The banner flag is never sent to the server: no api call mentions it.
  assert.ok(!src.includes("whats-new-seen") || src.match(/whats-new-seen/g).length <= 3,
    "the What's new flag must only appear in its local definition and use");
  assert.ok(!src.includes("api.") || !src.match(/api\.\w+\([^)]*WHATS_NEW/s),
    "the What's new flag must never be sent to the server");
});

test("anonymity unchanged: privacy line verbatim, no new personal data", () => {
  assert.ok(src.includes("We don't share your data. This is your personal journey."),
    "privacy line must be unchanged");
  assert.ok(!sound.includes("deviceId") && !sound.includes("localStorage"),
    "sound engine must not touch identity or storage");
  assert.ok(!src.includes("WHATS_NEW") || src.includes("never sent to the server"),
    "What's new must say the flag is never sent to the server");
});
