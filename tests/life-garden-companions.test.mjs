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
  assert.ok(companions.includes("That’s me"), "the name box must have a That’s me button");
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
