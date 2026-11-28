// My Life Garden Pathway — the Map, prettier (Richard,
// 2026-11-28), source-level tests. The green stick lines
// become stepping-stone pathways, winding gently — the main
// path down from the cottage and each side pathway out to its
// stop — not sharp zigzags. The whole pathway fills with
// flowers along its length when it is walked, not one tiny
// flower at the end: stones stay stones, flowers grow around
// and between them, one flower per settled quit-date milestone
// (Quit day, One day, One week, One month, Three months, One
// year), and the same share on any other path for what is
// already true there. Each pathway has its own colour from the
// app's spring palette. Richard, 2026-11-28: the stool is
// gone — just the trophy 🏆 now, in the boxes, the aria-label
// and the caption — and the flowers are re-spaced in two rows
// above and below the dirt path, with a small bud at the next
// spot on a path that has started. Local only, nothing sent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const map = src.slice(src.indexOf("function GardenMapPage("), src.indexOf("/* ---------- My Life Garden Pathway — books & photos"));
const diagramStart = map.indexOf('<svg viewBox="0 0 360 960"');
const diagram = diagramStart === -1 ? "" : map.slice(diagramStart, map.indexOf("</svg>", diagramStart));
const helpers = src.slice(src.indexOf("const GARDEN_MAP_MAIN_PATH"), src.indexOf("function GardenMapPage("));

const BRANCH_IDS = ["gazebo", "alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing", "longevity"];

test("the stick lines are gone — the main path winds gently, with curves, not a straight vertical", () => {
  assert.ok(!diagram.includes("M180 40 V640"), "the straight vertical stick down the middle must be gone");
  assert.ok(diagram.includes('viewBox="0 0 360 960"'), "the longer tree must be 960 tall — taller than one phone screen, so life reads as a long path");
  assert.ok(helpers.includes("GARDEN_MAP_MAIN_PATH"), "the main pathway must be a named winding path");
  assert.ok(helpers.includes("C170 90"), "the main pathway must curve gently, not run straight");
  assert.ok(helpers.includes("180 268") && helpers.includes("180 408") && helpers.includes("180 548") && helpers.includes("180 688"),
    "the winding main pathway must still pass through the branch joins at y 268, 408, 548 and 688, so the side branches still meet it");
});

test("the tree is longer — rows about 140 apart, Longevity with room to go onward (Richard, 2026-11-28)", () => {
  // Life is a long path: it is OK if the tree does not all fit
  // on one smartphone screen — the visitor scrolls down it.
  assert.ok(diagram.includes('viewBox="0 0 360 960"'), "the diagram must be 960 tall, not 660");
  assert.ok(!diagram.includes('viewBox="0 0 360 660"'), "the old 660-tall diagram must be gone");
  // Branch joins about 140 apart, not 100: 268, 408, 548, 688.
  const joins = [268, 408, 548, 688];
  for (let i = 1; i < joins.length; i++) {
    assert.equal(joins[i] - joins[i - 1], 140, `branch rows must be 140 apart, not crowded — join ${joins[i - 1]} to ${joins[i]}`);
  }
  // The boxes sit on those joins: first pair centred on 268,
  // last pair on 688, Longevity box down at 780–930.
  assert.ok(diagram.includes('y="240"'), "the first pair of boxes must sit at y 240, centred on the 268 join");
  assert.ok(diagram.includes('y="660"'), "the last pair of boxes must sit at y 660, centred on the 688 join");
  assert.ok(diagram.includes('y="780"'), "the Longevity box must start at y 780, with room below the last pair");
  assert.ok(diagram.includes('y="918"'), "Longevity → ∞ must sit near the bottom, at y 918");
  assert.ok(helpers.includes("180 780"), "the main pathway must run on down to y 780, into the Longevity box");
  assert.ok(map.includes("Life is a long path, so the tree is taller than one screen"), "the Map must say plainly to scroll down to walk it all");
  // Stones spread along the longer trunk, not bunched: one
  // near the top, one near the bottom of the long run.
  assert.ok(helpers.includes("{ x: 178, y: 70 }") && helpers.includes("{ x: 186, y: 620 }"), "main-path stones must spread from near the cottage to near Longevity");
});

test("no side branch is a straight horizontal stick, and none is a sharp zigzag", () => {
  assert.ok(!diagram.includes(" H124") && !diagram.includes(" H236"), "no branch may be a straight horizontal stick to x=124 or x=236");
  assert.ok(!diagram.includes('d="M180 70 L138 118"'), "the gazebo branch must no longer be a straight diagonal stick");
  assert.ok(!helpers.toLowerCase().includes("zigzag"), "the Map must not be built with sharp zigzags — gentle winding only");
  for (const id of BRANCH_IDS) {
    assert.ok(helpers.includes(`${id}: {`), `the Map must have winding pathway geometry for "${id}"`);
    const branch = helpers.slice(helpers.indexOf(`${id}: {`), helpers.indexOf(`${id}: {`) + 400);
    assert.ok(!branch.includes(" L"), `the "${id}" pathway must curve (C), not run in straight (L) segments`);
    assert.ok(branch.includes("stones:"), `the "${id}" pathway must carry stepping stones`);
    assert.ok(branch.includes("flowers:"), `the "${id}" pathway must carry flower spots along its length`);
  }
});

test("stepping stones are drawn on the pathways, and stones stay stones", () => {
  assert.ok(diagram.includes("Stepping stones along the main pathway"), "the main pathway must draw its stepping stones");
  for (const label of ["gazebo", "Alcohol", "Smoking", "Gambling", "Drugs", "Codependency", "Food", "Screens", "Feeling Unwell", "Longevity"]) {
    assert.ok(diagram.includes(`Stepping stones along the ${label} pathway`), `the ${label} pathway must draw its stepping stones`);
  }
  assert.ok(diagram.includes("<ellipse"), "stepping stones must be drawn as ellipses on the pathways");
  // Flowers are a separate layer, drawn after the boxes — they
  // grow around the stones, they do not replace them.
  assert.ok(diagram.includes("Flowers along the pathways you have walked"), "the Map must draw a flowers layer along the pathways");
  assert.ok(diagram.includes("GardenMapFlower"), "flowers must be drawn with the GardenMapFlower component");
  assert.ok(helpers.includes("GARDEN_MAP_MAIN_STONES"), "the main pathway stones must be named data, laid along the sway of the path");
});

test("each pathway has its own spring colour, from the app's spring palette", () => {
  for (const colour of ["#d99a4e", "#3f6fb5", "#e86a8a", "#6aa84f", "#9a5a90"]) {
    assert.ok(helpers.includes(`"${colour}"`), `the spring palette must include ${colour}`);
  }
  for (const id of BRANCH_IDS) {
    assert.ok(helpers.includes(`${id}: "#`), `the "${id}" pathway must have its own spring colour`);
  }
  assert.ok(helpers.includes("GARDEN_MAP_BRANCH_COLOURS"), "the pathway colours must be named data, one per pathway");
  assert.ok(helpers.includes("GardenMapFlower"), "flowers must be drawn in the pathway's own colour");
});

test("flowers grow with the settled milestones — one flower per milestone on a quit-date path", () => {
  assert.ok(helpers.includes("gardenMapBranchFlowerCount"), "the Map must count flowers per branch from progress");
  assert.ok(helpers.includes("gardenMilestonesReached"), "a quit-date path must grow flowers from the milestones reached");
  assert.ok(src.includes("const GARDEN_PATH_MILESTONES"), "the flower count must use the settled milestones");
  assert.ok(src.includes('{ days: 0, label: "Quit day — you chose this path" }') && src.includes('{ days: 365, label: "One year" }'), "the milestones must run from Quit day to One year");
  // A quit day in the past still counts: the count is from
  // days since the quit day, not from whether it is today.
  assert.ok(helpers.includes("daysUntilGardenDate(effectiveQuitDay)"), "the flower count must use the effective quit day — tab first, otherwise garden");
  // Paths without a quit day bloom from what is already true:
  // each item ticked or trophy-earned fills the same share.
  assert.ok(helpers.includes("Math.round((6 * done) / stop.items.length)"), "a non-quit path must fill its six flower spots in proportion to what is already true");
  // Six spots per branch, so a finished path is full of
  // flowers along its whole length, not one flower at the end.
  const flowerArrays = helpers.match(/flowers: \[/g) ?? [];
  assert.equal(flowerArrays.length, 10, "every one of the ten pathways must carry six flower spots along its length");
  assert.ok(map.includes("fills with flowers along its whole length"), "the Map must say plainly that a path fills with flowers along its whole length");
});

test("the branches are still tappable, and the boxes are unchanged", () => {
  assert.equal((diagram.match(/role="button"/g) ?? []).length, 10, "there must still be ten tappable branches in the diagram");
  for (const id of BRANCH_IDS) {
    assert.ok(diagram.includes(`onClick={() => openStop("${id}")}`), `the diagram must still have a tappable branch for "${id}"`);
  }
  assert.ok(diagram.includes("🏠 Cottage — start here"), "the cottage must still start the Map at the top");
  assert.ok(diagram.includes("Longevity → ∞"), "Longevity must still go on to infinity");
});

test("no stool anywhere on the Map — just the trophy (Richard, 2026-11-28)", () => {
  assert.ok(!diagram.includes("on a stool"), "no 'on a stool' may remain in the Map diagram");
  assert.ok(!diagram.includes("wooden stool"), "no 'wooden stool' may remain in the Map diagram");
  assert.ok(!map.includes("on a stool") && !map.includes("wooden stool"), "no stool wording may remain anywhere on the Map page — boxes, aria-label, caption or stop panels");
  assert.ok(!src.includes("on a stool") && !src.includes("on a wooden stool"), "no stool wording may remain anywhere in the app for the Map");
  // The eight dead-end boxes show just the trophy.
  assert.equal((diagram.match(/>🏆<\/text>/g) ?? []).length, 11, "the eight dead-end boxes and the three Longevity trophies must each show just 🏆");
  assert.ok(map.includes("each with a trophy at the end"), "the diagram aria-label must say just 'a trophy at the end'");
  assert.ok(map.includes("eight dead ends each with a trophy,"), "the Map caption must say just 'each with a trophy'");
  assert.ok(src.includes("A trophy waits at the end"), "the dead-end stop notes must say just 'a trophy waits at the end'");
});

test("full bloom is spaced, not crowded — two rows above and below the dirt, innermost pulled back (Richard, 2026-11-28)", () => {
  // Parse the flower spots and stones straight out of the
  // branch data, the way the preview script does — no invented
  // coordinates.
  const branchBlock = helpers.slice(helpers.indexOf("const GARDEN_MAP_BRANCH_PATHS"), helpers.indexOf("// How many of the six flower spots"));
  const parsePts = (s) => [...s.matchAll(/\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\}/g)].map((m) => ({ x: +m[1], y: +m[2] }));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const branches = {};
  for (const m of branchBlock.matchAll(/(\w+):\s*\{\s*d:\s*"[^"]+",\s*stones:\s*\[(.*?)\],\s*flowers:\s*\[(.*?)\],?\s*\}/gs)) {
    branches[m[1]] = { stones: parsePts(m[2]), flowers: parsePts(m[3]) };
  }
  assert.equal(Object.keys(branches).length, 10, "all ten pathways must carry flower spots");
  const LEFT = { alcohol: 268, gambling: 408, codependency: 548, screens: 688 };
  const RIGHT = { smoking: 268, drugs: 408, food: 548, wellbeing: 688 };
  for (const [id, b] of Object.entries(branches)) {
    assert.equal(b.flowers.length, 6, `the "${id}" pathway must still carry six flower spots`);
    // No two flowers overlap: a full flower spans about 12.6
    // across (petals at 3.8, r 2.5), so centres need 13+ apart.
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        assert.ok(dist(b.flowers[i], b.flowers[j]) >= 13, `"${id}" flowers ${i + 1} and ${j + 1} must be at least 13 apart, not crowded (found ${dist(b.flowers[i], b.flowers[j]).toFixed(1)})`);
      }
    }
    // No flower sits on a stone: stone (rx 8, ry 5.5) plus a
    // flower (about 6.3 across from its centre) need 11.8 apart.
    for (const f of b.flowers) {
      for (const s of b.stones) {
        assert.ok(dist(f, s) >= 12, `"${id}" flower at (${f.x}, ${f.y}) must sit clear of the stone at (${s.x}, ${s.y})`);
      }
    }
  }
  // Side branches: two rows, 20 above and 20 below the join —
  // never on the dirt path — blooming from their own box
  // toward the trunk, innermost pulled back so the left and
  // right clusters never meet at the trunk.
  for (const [id, join] of Object.entries(LEFT)) {
    const xs = branches[id].flowers.map((f) => f.x);
    assert.ok(branches[id].flowers.every((f) => Math.abs(f.y - join) === 20), `"${id}" flowers must sit 20 above or below the join, off the dirt path`);
    assert.ok(Math.max(...xs) <= 168, `"${id}" innermost flower must be pulled back toward its own box, no nearer the trunk than x=168`);
  }
  for (const [id, join] of Object.entries(RIGHT)) {
    const xs = branches[id].flowers.map((f) => f.x);
    assert.ok(branches[id].flowers.every((f) => Math.abs(f.y - join) === 20), `"${id}" flowers must sit 20 above or below the join, off the dirt path`);
    assert.ok(Math.min(...xs) >= 192, `"${id}" innermost flower must be pulled back toward its own box, no nearer the trunk than x=192`);
  }
  // Longevity: trunk flowers staggered to the sides, between
  // the stones — and the three in-box flowers flank the
  // trophies (146, 806), (214, 832), (146, 858) in the JSX.
  const lon = branches.longevity.flowers;
  for (const f of lon.slice(0, 3)) {
    for (const s of branches.longevity.stones) {
      assert.ok(dist(f, s) >= 14, `Longevity trunk flower at (${f.x}, ${f.y}) must sit clear of the trunk stone at (${s.x}, ${s.y})`);
    }
  }
  for (const f of lon.slice(3)) {
    const nearest = Math.min(...[{ x: 146, y: 806 }, { x: 214, y: 832 }, { x: 146, y: 858 }].map((t) => dist(f, t)));
    assert.ok(nearest >= 15 && nearest <= 30, `Longevity in-box flower at (${f.x}, ${f.y}) must flank a trophy, 15–30 away (found ${nearest.toFixed(1)})`);
  }
  // Flowers themselves are smaller at full bloom: petal r 2.5.
  const flowerFn = helpers.slice(helpers.indexOf("function GardenMapFlower"), helpers.indexOf("function GardenMapBud"));
  assert.ok(flowerFn.includes('r="2.5"') && flowerFn.includes("3.8 * Math.cos"), "a full flower must be drawn smaller — petals at 3.8, r 2.5 — so full bloom does not crowd");
});

test("two-step flowers — a small bud at the next spot only, on a path that has started (Richard, 2026-11-28)", () => {
  assert.ok(helpers.includes("function GardenMapBud"), "the Map must have a GardenMapBud component for the next flower not yet bloomed");
  assert.ok(helpers.includes("function gardenMapBranchStarted"), "the Map must know whether a path has started, for the bud");
  const budFn = helpers.slice(helpers.indexOf("function GardenMapBud"), helpers.indexOf("function GardenMapPage"));
  // A bud is closed and smaller than a flower: one small
  // ellipse in the pathway colour, no five-petal ring.
  assert.ok(budFn.includes("<ellipse") && budFn.includes('rx="3.2"'), "a bud must be a small closed shape, smaller than a full flower");
  assert.ok(!budFn.includes("[0, 72, 144, 216, 288]"), "a bud must not draw the five petals of a full flower");
  assert.ok(budFn.includes("fill={colour}"), "a bud must be drawn in the pathway's own colour");
  // Started means: a quit-date path with a quit day set, even
  // with no milestone reached — or any other path with
  // something already true on it.
  assert.ok(helpers.includes("effectiveQuitDay != null"), "a quit-date path counts as started once its quit day is set");
  assert.ok(helpers.includes("stop.items.some((item) => checked.includes(item) || trophies.includes(item))"), "any other path counts as started once an item is ticked or its trophy earned");
  // The render draws the bud at the next spot only — flowers
  // up to the count, then one bud at flowers[count] — and
  // never at full bloom, never on a path not started.
  assert.ok(map.includes("branch.flowers.slice(0, count)"), "bloomed flowers must still be drawn up to the count");
  assert.ok(map.includes("branch.flowers[count]"), "the bud must sit at the next spot after the bloomed flowers");
  assert.ok(map.includes("mapBranchHasBud(stop) && next"), "the bud must render only when the path has a next spot to bloom");
  assert.ok(map.includes("if (mapBranchFlowers(stop) >= 6) return false;"), "there must be no bud at full bloom");
  assert.ok(map.includes("<GardenMapBud"), "the bud must be drawn with the GardenMapBud component");
  // Stones stay stones: the bud changes nothing about them.
  assert.ok(map.includes("Stepping stones along the Longevity pathway"), "the stones must still be drawn on the Longevity pathway");
});

test("the gazebo picture and My Log, My Path are untouched in this piece", () => {
  assert.ok(!helpers.includes("myLifeGardenGazebo"), "the Map-pretty helpers must not touch the gazebo picture");
  assert.ok(!map.includes("My Log, My Path"), "the Map piece must not build My Log, My Path — that is a separate piece");
});

test("the gazebo picture taps to enlarge — folks can be there (Richard, 2026-11-28)", () => {
  // The gazebo pic was a plain picture, not a tap target — the
  // caption below it did not block enlarging, it simply was
  // not wired up yet. Same pattern as the garden first pic.
  assert.ok(map.includes("const [gazeboZoomed, setGazeboZoomed] = useState(false)"), "the Map page must hold a gazebo enlarged state");
  assert.ok(map.includes('aria-label="The gazebo — tap to see it bigger"'), "the gazebo picture must be a tap target that says tap to see it bigger");
  assert.ok(map.includes("onClick={() => setGazeboZoomed(true)}"), "tapping the gazebo picture must open the enlarged view");
  assert.ok(map.includes('role="dialog" aria-label="The gazebo, enlarged"'), "the enlarged view must be a dialog labelled The gazebo, enlarged");
  assert.ok(map.includes('aria-label="Close the enlarged gazebo photo"'), "the enlarged view must have a close button");
  assert.ok(map.includes("onClick={() => setGazeboZoomed(false)}"), "tapping the enlarged view must close it");
  assert.ok(map.includes('alt="The gazebo — enlarged"'), "the enlarged view must show the gazebo pic big");
  assert.ok(map.includes("Tap the photo to see it bigger."), "the gazebo must say tap the photo to see it bigger");
  // Unchanged: the pic file, the caption wording, and the pic
  // first, before the stop button / heading.
  assert.ok(map.includes('src={myLifeGardenGazebo}'), "the enlarged view must use the same gazebo pic file");
  assert.ok(map.includes("The gazebo — a quiet place, off to the side of the path."), "the gazebo caption must stay exactly as it is");
  const gazeboFigure = map.indexOf("The gazebo — tap to see it bigger");
  const gazeboButton = map.indexOf('aria-expanded={open}', gazeboFigure);
  assert.ok(gazeboFigure !== -1 && gazeboButton !== -1 && gazeboFigure < gazeboButton, "the gazebo picture must still come first, before its stop button / heading");
});
