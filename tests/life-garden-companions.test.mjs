// My Life Garden Pathway — name, avatar & spirit guide (Richard,
// 2026-11-26), third piece, source-level tests. Choose your own
// name (optional, first name or nickname, used in the garden
// welcome, Clear returns to "friend"); six distinct figures with
// no preset names and no name labels; eight spirit guides — Owl,
// Robin, Turtle, Butterfly, Deer, Bear, Dog, Cat — drawn as
// naturalistic lifelike profiles, not cartoons, with their animal
// labels and a short companion line each. All local only, nothing
// sent anywhere, no account. Path expansion / quit day and
// weeds turning to flowers are built in the fifth piece
// (2026-11-26), below. Held, NOT built here: badges, points
// for weeds. Favourite books and your own photos for the frames
// are built in the Cozy Room (fourth piece, 2026-11-26).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const garden = src.slice(src.indexOf("const LIFE_GARDEN_ITEMS"), src.indexOf("function HomePage("));
const companions = src.slice(src.indexOf("/* ---------- My Life Garden Pathway — your name, avatar & spirit guide"), src.indexOf("/* ---------- My Life Garden Pathway — path expansion & weeds to flowers"));
const gardenView = src.slice(src.indexOf("function LifeGardenPage("), src.indexOf("function HomePage("));

test("choose your own name: optional, used in the welcome, Clear returns to friend", () => {
  assert.ok(companions.includes("richards-resource:life-garden:name:v1"), "the name must be saved under its own localStorage key");
  assert.ok(companions.includes("Choose your own name"), "there must be a Choose your own name box");
  assert.ok(companions.includes("First name or nickname"), "the name box must say first name or nickname");
  assert.ok(companions.includes("Save my name"), "the name box must have a clear Save my name button — Richard, 2026-11-26: typing alone did not stick, and 'That's me' never said Save");
  assert.ok(companions.includes("Saved ✓"), "saving the name must confirm it, Saved ✓");
  assert.ok(companions.includes("onBlur"), "the name must also save when the box loses focus, so typing it then tapping away still sticks");
  assert.ok(companions.includes("Clear"), "the name box must have a Clear button");
  assert.ok(gardenView.includes("Welcome, {gardenName ? gardenName : \"friend\"}"), "the garden welcome must use the chosen name, or friend when none is chosen");
  assert.ok(companions.includes("nothing is sent anywhere"), "the companions section must say plainly that nothing is sent anywhere");
});

test("six figures, each different, with no preset names and no name labels", () => {
  for (const name of ["Sunny", "Meadow", "Sky", "Blossom", "River", "Ember"]) {
    assert.ok(!companions.includes(name), `the figures must not carry the preset name "${name}"`);
  }
  // Six distinct figures: different skin tones, hair styles, features, clothes.
  const skins = (companions.match(/skin: "#[0-9a-f]{6}"/g) ?? []).length;
  assert.ok(skins >= 6, `there must be six figures with different skin tones (found ${skins})`);
  for (const hair of ["long", "afro", "short", "bun", "bob", "bald"]) {
    assert.ok(companions.includes(`hair: "${hair}"`), `one figure must have ${hair} hair`);
  }
  for (const feature of ["beard", "glasses", "freckles", "earrings", "moustache"]) {
    assert.ok(companions.includes(`feature: "${feature}"`), `one figure must have ${feature}`);
  }
  assert.ok(companions.includes("Pick a figure that stands for you"), "the figure picker must say it stands for you");
  assert.ok(companions.includes("That’s you"), "picking a figure must confirm that figure is you");
});

test("eight spirit guides, lifelike profiles, animal labels, companion lines", () => {
  for (const label of ["Owl", "Robin", "Turtle", "Butterfly", "Deer", "Bear", "Dog", "Cat"]) {
    assert.ok(companions.includes(`label: "${label}"`), `the guides must include the ${label}`);
  }
  assert.equal((companions.match(/label: "/g) ?? []).length, 8, "there must be exactly eight spirit guides");
  assert.ok(companions.includes("Loyal, joyful, and always glad you're here"), "the Dog's companion line must be Richard's wording");
  assert.ok(companions.includes("Quiet, independent, and knows when to curl up close"), "the Cat's companion line must be Richard's wording");
  assert.ok(companions.includes("Pick a spirit guide"), "there must be a spirit guide picker");
  assert.ok(companions.includes("Walking beside you"), "picking a guide must say it walks beside you");
  assert.ok(companions.includes("richards-resource:life-garden:guide:v1"), "the guide must be saved under its own localStorage key");
  assert.ok(companions.includes("richards-resource:life-garden:avatar:v1"), "the figure must be saved under its own localStorage key");
});

test("the name sticks: saved to localStorage on Save, Enter and blur, loaded on every garden open", () => {
  // The save itself lives in LifeGardenPage: saveGardenName trims,
  // caps at 40 chars, writes the name key — or removes it when blank.
  assert.ok(gardenView.includes("safeLocalSet(LIFE_GARDEN_NAME_KEY, clean)"), "saving a name must write it to the name key");
  assert.ok(gardenView.includes("safeLocalRemove(LIFE_GARDEN_NAME_KEY)"), "clearing a name must remove the name key");
  assert.ok(gardenView.includes("useState<string>(() => loadLifeGardenName())"), "the garden must load the saved name on every open");
  assert.ok(gardenView.includes("loadLifeGardenName"), "the garden must read the saved name from localStorage");
  // The draft must follow the saved name, so Clear or a save from
  // another view cannot leave a stale draft showing the old name.
  assert.ok(companions.includes("useEffect(() => { setDraft(name); }, [name])"), "the name draft must follow the saved name");
  // "007.5" is a valid name: digits and a dot, nothing to reject.
  // The save path trims and caps at 40 chars only — no character
  // filter — so 007.5 saves exactly as typed, and the welcome and
  // the greeting use it: "Welcome, 007.5" / "Hello 007.5."
  assert.ok(companions.includes("draft.trim().slice(0, 40)"), "saving must trim and cap at 40 chars only, with no character filter that could reject 007.5");
  assert.ok(gardenView.includes("Hello {gardenName ? gardenName : \"friend\"}"), "the greeting must use the saved name, or friend when none is chosen");
  assert.ok(companions.includes("that’s you, ${name}"), "the saved confirmation must say that's you, with the saved name");
  assert.ok(companions.includes("Tap Save my name — it stays on this phone, in this browser."), "the section must say plainly that the name stays on this phone, in this browser");
});

test("once the name sticks, it replaces 'friend' everywhere in the garden — except the verbatim intro", () => {
  // Garden list, Map and Cozy Room all greet the visitor by name:
  // "Welcome, 007.5" once saved, "Welcome, friend" when no name.
  const welcomes = gardenView.match(/Welcome, \{gardenName \? gardenName : "friend"\}/g) ?? [];
  assert.ok(welcomes.length >= 3, `the garden list, the Map and the Cozy Room must all greet the visitor by saved name or friend (found ${welcomes.length})`);
  assert.ok(gardenView.includes("Hello {gardenName ? gardenName : \"friend\"}"), "the greeting must use the saved name, or friend when none is chosen");
  // The name is passed into the Map and the Cozy Room from the
  // garden, and loaded from localStorage for the Cozy Room opened
  // straight from Home — so it follows the visitor everywhere.
  assert.ok(gardenView.includes("gardenName={gardenName}"), "the garden must pass its saved name to the Map and the Cozy Room");
  assert.ok(src.includes("gardenName={loadLifeGardenName()}"), "the Cozy Room opened from Home must load the saved name");
  // Richard's exact intro verbiage is the one exception: it stays
  // word for word, "Welcome friend. This is your garden of Life…",
  // and is never rewritten with the name.
  assert.ok(gardenView.includes("Welcome friend. This is your garden of Life. We all choose our own path. You have chosen yours. We are here to help guide you to a happier place, a happier you. Some paths you may have already explored and others await. Enjoy the journey. Peace."), "Richard's intro verbiage must stay word for word, starting 'Welcome friend.'");
  // The other "friend" words in the garden are not the visitor
  // being addressed, so they stay: the "stay 'friend'" instruction
  // for a blank name, the Robin and Bear guide lines, and the
  // "I have friends, furry and/or human" checklist item.
  assert.ok(companions.includes("leave it blank and stay “friend”"), "the blank-name instruction must still explain that blank means friend");
});

test("companions are one gentle section, after the checklist, big buttons, local only", () => {
  assert.ok(companions.includes("Your name, your avatar & your spirit guide"), "there must be one companions section with that title");
  // In the garden view itself the section is used as one component,
  // after the checklist and before the Map button — not all on the
  // first screen.
  const checklist = gardenView.indexOf("What is already true for you");
  const usage = gardenView.indexOf("<GardenCompanions");
  const mapButton = gardenView.indexOf("See the Map");
  assert.ok(checklist !== -1 && usage !== -1 && usage > checklist, "the companions section must come after the checklist, not all on the first screen");
  assert.ok(mapButton !== -1 && usage < mapButton, "the companions section must come before the Map button");
  assert.ok(companions.includes("min-h-14") && companions.includes("min-h-28"), "the name box and the pickers must use big, easy taps");
  assert.ok(!companions.includes("http"), "the companions section must not hotlink anything");
});

test("companions piece builds nothing held for later", () => {
  // Scoped to the garden view itself: the header comments list
  // the held items by name, so strip comment lines before
  // checking — the check guards the code.
  // Books and photos are built in the Cozy Room (fourth piece),
  // and path expansion / quit day is built in the garden and
  // the Map (fifth piece), so neither is banned here any more.
  const code = gardenView.replace(/^\/\/.*$/gm, "");
  for (const banned of ["badge", "weed pile"]) {
    assert.ok(!code.toLowerCase().includes(banned.toLowerCase()), `garden view must not build "${banned}" yet`);
  }
  assert.ok(!gardenView.includes("award("), "the garden must not award points");
});
