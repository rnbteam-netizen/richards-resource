// Copyright (Richard, 2026-11-12) — source-level tests.
// "© 2026 Richard's Resource. All rights reserved." sits in the footer
// (MeadowFooter, on every tab) and on Help & Resources. Exact wording,
// small and unobtrusive, nothing else changed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");

const COPYRIGHT = "© 2026 Richard's Resource. All rights reserved.";

test("copyright appears in the footer and on Help & Resources", () => {
  const hits = src.split(COPYRIGHT).length - 1;
  assert.ok(hits >= 2, `copyright must appear at least twice (footer + Help & Resources), found ${hits}`);
  // In the footer: the line must sit inside MeadowFooter.
  const footerStart = src.indexOf("function MeadowFooter()");
  const footerEnd = src.indexOf("</footer>", footerStart);
  assert.ok(footerStart !== -1 && footerEnd !== -1, "MeadowFooter must exist");
  assert.ok(src.slice(footerStart, footerEnd).includes(COPYRIGHT), "the footer must carry the copyright");
  // On Help & Resources: the line must sit inside ResourcesPage.
  const resStart = src.indexOf("function ResourcesPage(");
  const resEnd = src.indexOf("/* ---------- root ---------- */", resStart);
  assert.ok(resStart !== -1 && resEnd !== -1, "ResourcesPage must exist");
  assert.ok(src.slice(resStart, resEnd).includes(COPYRIGHT), "Help & Resources must carry the copyright");
});

test("copyright is small and unobtrusive", () => {
  // Both renderings use the small text-xs class.
  const hits = src.split(COPYRIGHT).length - 1;
  const smallHits = (src.match(/text-xs[^>]*>© 2026 Richard's Resource\. All rights reserved\./g) || []).length;
  assert.equal(smallHits, hits, `every copyright rendering must use text-xs, found ${smallHits} of ${hits}`);
});
