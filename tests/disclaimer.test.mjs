// Medical / mental-health disclaimer (Richard, 2026-11-12, the student
// of law in him): plain, kind language, not heavy legalese. Full version
// in the footer on every tab and on Help & Resources; a short one-line
// version at the top of Longevity, Feeling Unwell, Food, and Peace of
// Mind. The privacy line stays verbatim, and the 988 / 911 crisis boxes
// stay prominent where they already are.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");

function page(fn, nextFn) {
  return src.slice(src.indexOf(`function ${fn}()`), src.indexOf(`function ${nextFn}()`));
}

test("disclaimer components exist, in plain kind language", () => {
  assert.ok(src.includes("function MedicalDisclaimer()"), "full MedicalDisclaimer component must exist");
  assert.ok(src.includes("function DisclaimerShort()"), "short DisclaimerShort component must exist");
  assert.ok(src.includes("Please read — this is not medical advice"),
    "full disclaimer must be headed as not medical advice");
  assert.ok(src.includes("general information and support only"),
    "disclaimer must say general information and support only");
  assert.ok(src.includes("not a diagnosis"), "disclaimer must say not a diagnosis");
  assert.ok(src.includes("not a substitute for your own doctor"),
    "disclaimer must say it is not a substitute for your own doctor");
  assert.ok(src.includes("a counselor"), "disclaimer must name a counselor");
  assert.ok(src.includes("an addiction professional"), "disclaimer must name an addiction professional");
  assert.ok(src.includes("Before you start an exercise programme, change what you eat, or stop or change a medicine"),
    "disclaimer must cover exercise, diet, and stopping or changing a medicine");
  assert.ok(src.includes("own doctor first"), "disclaimer must say talk to your own doctor first");
  assert.ok(src.includes("seek counseling"), "disclaimer must say to seek counseling for mental health");
  assert.ok(src.includes("If you feel unsafe, or you have thoughts of harming yourself"),
    "disclaimer must cover feeling unsafe / thoughts of harming yourself");
  assert.ok(src.includes("call or text"), "disclaimer must give 988 as call or text");
  assert.ok(src.includes("Stopping alcohol suddenly can be dangerous"),
    "disclaimer must warn stopping alcohol suddenly can be dangerous");
  assert.ok(src.includes("withdrawal needs medical supervision"),
    "disclaimer must say alcohol withdrawal needs medical supervision");
});

test("full disclaimer in the footer on every tab and on Help & Resources", () => {
  // The footer is rendered once, at the bottom of the app, for every tab.
  const footer = src.slice(src.indexOf("function MeadowFooter()"), src.indexOf("/* ---------- the pause"));
  assert.ok(footer.includes("<MedicalDisclaimer />"),
    "MeadowFooter must include the full MedicalDisclaimer");
  assert.ok(src.includes("function MeadowFooter()"), "MeadowFooter must exist");
  assert.ok(src.includes("<MeadowFooter />"), "the app must render MeadowFooter");
  // Help & Resources carries the full version as its own closing section too.
  const resources = src.slice(src.indexOf("function ResourcesPage("), src.indexOf("export function App()"));
  assert.ok(resources.includes("<MedicalDisclaimer />"),
    "ResourcesPage must include the full MedicalDisclaimer");
  assert.ok(!resources.includes("first prototype and a companion"),
    "the old short Resources closing note is replaced by the full disclaimer");
});

test("short one-line disclaimer at the top of the four relevant tabs", () => {
  const short = "This app is support, not medical advice — talk to your own doctor about exercise, diet, medicines, or mental health.";
  assert.ok(src.includes(short), "the short disclaimer line must exist verbatim");
  const uses = src.match(/<DisclaimerShort \/>/g) ?? [];
  assert.equal(uses.length, 4, `expected 4 DisclaimerShort uses, got ${uses.length}`);
  assert.ok(page("WellbeingPage", "FoodPage").includes("<DisclaimerShort />"),
    "Feeling Unwell must show the short disclaimer");
  assert.ok(page("FoodPage", "ScreensPage").includes("<DisclaimerShort />"),
    "Food must show the short disclaimer");
  assert.ok(src.slice(src.indexOf("function LongevityPage()"), src.indexOf("function PeacePage()")).includes("<DisclaimerShort />"),
    "Longevity must show the short disclaimer");
  assert.ok(src.slice(src.indexOf("function PeacePage()"), src.indexOf("function HomePage")).includes("<DisclaimerShort />"),
    "Peace of Mind must show the short disclaimer");
});

test("privacy line verbatim and crisis boxes unchanged", () => {
  assert.ok(src.includes("We don't share your data. This is your personal journey."),
    "privacy line must stay verbatim");
  assert.ok(src.includes("function CrisisStrip()"), "CrisisStrip must still exist");
  assert.ok(src.includes('href="tel:988"'), "988 link must still be present");
  assert.ok(src.includes('href="tel:911"'), "911 link must still be present");
  // The disclaimer must not hide the crisis strip: every tab that had a
  // CrisisStrip still has one.
  for (const [fn, next] of [["WellbeingPage", "FoodPage"], ["FoodPage", "ScreensPage"]]) {
    assert.ok(page(fn, next).includes("<CrisisStrip />"), `${fn} must still show CrisisStrip`);
  }
  assert.ok(src.slice(src.indexOf("function LongevityPage()"), src.indexOf("function PeacePage()")).includes("<CrisisStrip />"),
    "Longevity must still show CrisisStrip");
  assert.ok(src.slice(src.indexOf("function PeacePage()"), src.indexOf("/* ---------- home & resources")).includes("<CrisisStrip />"),
    "Peace of Mind must still show CrisisStrip");
});
