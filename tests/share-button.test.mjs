// Share button (Richard, 2026-11-19, Mission Possible): Home only.
// There was no share button in the app before this. One tap opens the
// phone's native share sheet with the Mission Possible cottage image +
// the link + the short text; if the phone has no share sheet, the
// fallback opens the visitor's own email app with a mailto: already
// filled in — email apps already contain Forward, so the visitor can
// send it on from there. Never any personal data, never any tracking,
// never a gate in front of help. Static source tests, like the
// Happy Button tests: the share logic is client-side, so the
// assertions read the source and the bundled asset.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const share = readFileSync(path.join(root, "client", "src", "share.ts"), "utf8");
const home = src.slice(
  src.indexOf("function HomePage("),
  src.indexOf("function ResourcesPage("),
);

test("Share button: the Mission Possible cottage image, JPG only — never the 4.2 MB PNG", () => {
  const jpg = path.join(root, "client", "src", "assets", "mission-possible-cottage-header.jpg");
  assert.ok(existsSync(jpg), "the Mission Possible cottage header JPG must be bundled in the app");
  const size = statSync(jpg).size;
  assert.ok(size > 100_000 && size < 1_000_000, `the bundled cottage JPG must be the ~872 KB emailer image, got ${size} bytes`);
  assert.ok(share.includes('from "./assets/mission-possible-cottage-header.jpg"'),
    "share.ts must import the Mission Possible cottage header JPG");
  assert.ok(!share.includes(".png") && !src.includes("mission-possible-cottage-header.png"),
    "the 4.2 MB PNG must never be bundled or referenced — it is too big for email and for the app");
  // Not all cottage images contain the link: only this most recent
  // header does, so the share must use this file and no other cottage.
  assert.ok(!share.includes("welcome-cottage.jpg"),
    "share.ts must not use the plain welcome cottage — it has no link in the picture");
});

test("Share button: the exact link, the exact text, no tracking, no personal data", () => {
  assert.ok(share.includes('SHARE_URL = "https://richardsresource.com"'),
    "the shared link must be exactly https://richardsresource.com");
  assert.ok(share.includes("Richard's Resource — a free self-help app. We are so Happy you are here. https://richardsresource.com"),
    "the shared text must be exactly the agreed wording with the link");
  // Check the shared values themselves, not the explanatory comments
  // (which mention shorteners and tracking only to forbid them).
  const urlLine = share.split("\n").find((l) => l.includes("SHARE_URL ="));
  assert.ok(urlLine && !urlLine.includes("?") && !urlLine.includes("utm_"),
    "the shared URL must be plain, with no query string and no tracking parameters");
  assert.ok(!share.includes("bit.ly") && !share.includes("utm_"),
    "the share must carry no tracking parameters and no link shortener");
  assert.ok(!share.includes("richardsresource3@gmail.com"),
    "the share must not hard-code a recipient — the visitor picks who to share with");
  assert.ok(!share.includes("award(") && !share.includes("happyMoment"),
    "sharing must earn no points and must not touch the points system");
  assert.ok(share.includes("no name, no points, nothing saved") || src.includes("no name, no points, nothing saved"),
    "the button must tell the visitor sharing sends nothing about them");
});

test("Share button: native share sheet first, mailto fallback, cancelling does nothing", () => {
  assert.ok(share.includes("navigator.share") && share.includes("canShare"),
    "share must try the phone's native share sheet and check canShare for the image file");
  assert.ok(share.includes("new File([blob]") && share.includes("richards-resource-cottage.jpg"),
    "the native share must attach the cottage image as a file when the phone allows it");
  assert.ok(share.includes("buildShareMailto") && share.includes("mailto:?subject="),
    "the fallback must open a mailto: with subject and body");
  assert.ok(share.includes("encodeURIComponent"),
    "the mailto subject and body must be URL-encoded");
  assert.ok(share.includes('AbortError') && share.includes('"cancelled"'),
    "closing the share sheet must be a cancel — it must never bounce the visitor into an email they did not ask for");
  assert.ok(share.includes("typeof nav.share") || share.includes("typeof navigator.share"),
    "the mailto fallback must trigger when navigator.share is unavailable");
});

test("Share button: Home only, after the Happy Button, before the rest of Home", () => {
  assert.ok(src.includes("function ShareButton()"), "a ShareButton component must exist");
  assert.ok(src.includes("Share Richard&apos;s Resource"), "the button must say “Share Richard's Resource”");
  assert.ok(home.includes("<ShareButton />"), "the Share button must be on Home");
  assert.equal(src.match(/<ShareButton \/>/g)?.length, 1, "there must be exactly one Share button in the app");
  const happyAt = home.indexOf("<HappyButton />");
  const shareAt = home.indexOf("<ShareButton />");
  const trueAt = home.indexOf("BUT YOU ARE NOT ALONE");
  const crisisAt = home.indexOf("<CrisisStrip />");
  assert.ok(happyAt > 0 && trueAt > 0 && trueAt < happyAt,
    "the true message and the Happy Button must still come first on Home");
  assert.ok(shareAt > happyAt, "the Share button must sit right after the Happy Button on Home");
  assert.ok(crisisAt > shareAt, "the crisis box must still be after the tabs on Home, untouched by the Share button");
  assert.ok(home.indexOf("WhatsNewBanner") > shareAt, "the Share button must sit before the rest of Home, not after it");
  // No second button anywhere else.
  const resources = src.slice(src.indexOf("function ResourcesPage("));
  assert.ok(!resources.includes("<ShareButton"), "Help & Resources must not have its own Share button");
  assert.ok(!src.slice(src.indexOf("function PeacePage("), src.indexOf("/* ---------- home & resources ---------- */")).includes("<ShareButton"),
    "Peace of Mind must not have its own Share button");
});
