// Tagline (Richard, 2026-11-12) — source-level tests.
// "Making the world 🌎 a happier place ❤️" sits on Home, right above the
// banner, and in the footer on every tab. Exact wording, no extra
// words, and the banner itself is untouched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");

const TAGLINE = "Making the world 🌎 a happier place ❤️";
const BANNER = "The best FREE self-help app EVER!";

test("tagline appears on Home above the banner, and in the footer", () => {
  const hits = src.split(TAGLINE).length - 1;
  assert.ok(hits >= 2, `tagline must appear at least twice (Home + footer), found ${hits}`);
  // On Home: the tagline must come before the banner text in the file.
  const firstTagline = src.indexOf(TAGLINE);
  const banner = src.indexOf(BANNER);
  assert.ok(firstTagline !== -1 && banner !== -1 && firstTagline < banner, "the Home tagline must sit above the banner");
  // In the footer: the tagline must sit inside MeadowFooter.
  const footerStart = src.indexOf("function MeadowFooter()");
  const footerEnd = src.indexOf("}", src.indexOf("</footer>", footerStart));
  assert.ok(footerStart !== -1, "MeadowFooter must exist");
  assert.ok(src.slice(footerStart, footerEnd).includes(TAGLINE), "the footer must carry the tagline");
});

test("banner wording is unchanged", () => {
  assert.ok(src.includes(BANNER), "banner must still read exactly 'The best FREE self-help app EVER!'");
  assert.ok(!src.includes("ever created"), "the old 'ever created' wording must not be back");
});
