// My Life Garden Pathway — name & spirit guide (Richard,
// 2026-11-26), third piece, source-level tests. Choose your own
// name (optional, first name or nickname, used in the garden
// welcome, Clear returns to "friend"); eight spirit guides — Owl,
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
const companions = src.slice(src.indexOf("/* ---------- My Life Garden Pathway — your name & spirit guide"), src.indexOf("/* ---------- My Life Garden Pathway — path expansion & weeds to flowers"));
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

test("avatars removed completely (Richard, 2026-11-28): no figure picker, no avatar code", () => {
  // Richard: "the avatars are not really necessary. My bad idea.
  // It's not a video game. We please need to remove that option
  // completely. Not a good fit for the app." So the garden must
  // offer no avatar / figure choice at all, and carry no avatar
  // code — a saved avatar from before is simply ignored.
  assert.ok(!companions.toLowerCase().includes("avatar"), "the companions section must not mention avatars at all");
  assert.ok(!gardenView.toLowerCase().includes("avatar"), "the garden view must not mention avatars at all");
  assert.ok(!companions.includes("Pick a figure"), "there must be no figure picker");
  assert.ok(!companions.includes("GARDEN_AVATARS"), "there must be no avatar list left in the code");
  assert.ok(!companions.includes("GardenAvatarFigure"), "there must be no avatar figure component left");
  assert.ok(!companions.includes("life-garden:avatar"), "there must be no avatar localStorage key left");
  assert.ok(!companions.includes("That’s you ✓"), "there must be no 'That’s you' figure confirmation left");
  // The section is now name + spirit guide only.
  assert.ok(companions.includes("Your name & your spirit guide"), "the companions section must now be titled name & spirit guide");
  assert.ok(companions.includes("Pick a spirit guide"), "the spirit guide picker must still be there");
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
});

test("custom spirit guide (Richard, 2026-11-28): fill-in-the-blank 'My own guide', no preset religious list", () => {
  // Richard: "Are we offended any religious folks, by not offering
  // a fill in the blank option for spirit guide. Some may want to
  // type Jesus, God, god, Mohammed, Krishna etc?" So beside the
  // eight animals there must be a blank field, typed in the
  // visitor's own words — no doctrine, no one religion, no preset
  // religious list. Local only, like the name.
  assert.ok(companions.includes("Or choose my own guide"), "there must be a 'My own guide' option beside the eight animals");
  assert.ok(companions.includes("Type your own guide"), "the custom guide box must say type your own guide");
  assert.ok(companions.includes("Save my guide"), "the custom guide must have a clear Save my guide button");
  assert.ok(companions.includes("Jesus, God, Mohammed, Krishna"), "the custom guide must name Richard's examples, so a religious visitor knows the blank is for them");
  assert.ok(companions.includes("No list, no doctrine"), "the custom guide must say plainly there is no list and no doctrine");
  assert.ok(companions.includes("custom:"), "a custom guide must be stored under the same guide key, as custom:<name>");
  assert.ok(companions.includes("gardenCustomGuideName"), "the code must read a custom guide name back from its stored value");
  assert.ok(companions.includes("customDraft.trim().slice(0, 40)"), "a typed guide name must be trimmed and capped at 40 chars, like the name, with no character filter");
  assert.ok(companions.includes("onBlur"), "the custom guide must also save when the box loses focus");
  assert.ok(companions.includes("`${customGuide} walks beside you, ${displayName}.`"), "the summary must show a typed guide the same way as an animal guide");
  assert.ok(companions.includes("Saved ✓ — ${customGuide} walks beside you."), "saving a custom guide must confirm it, Saved ✓");
  // The eight animals are unchanged, and no avatar comes back.
  assert.equal((companions.match(/label: "/g) ?? []).length, 8, "there must still be exactly eight animal spirit guides");
  assert.ok(!companions.toLowerCase().includes("avatar"), "adding a custom guide must not re-add avatars");
  // The garden save path must normalise a custom guide and must
  // clear the key when the guide is cleared, not save an empty string.
  assert.ok(gardenView.includes("safeLocalRemove(LIFE_GARDEN_GUIDE_KEY)"), "clearing a guide must remove the guide key");
  assert.ok(gardenView.includes("useState<string | null>(() => loadLifeGardenGuide())"), "the garden must load the saved guide — animal or custom — on every open");
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
  assert.ok(companions.includes("Your name & your spirit guide"), "there must be one companions section with that title");
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
