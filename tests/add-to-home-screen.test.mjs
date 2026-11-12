// Add to Home Screen (Richard, 2026-11-12) — source-level tests.
// The manifest + icons make the browser offer "Add to Home Screen";
// the Home hint tells people where to find it. Short name is "RR"
// (not "Me"), the icon is a sunrise, and there is no app-store
// claim, no push, no tracking — RR just opens full-screen and
// updates automatically, like the site itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
const html = readFileSync(path.join(root, "client", "index.html"), "utf8");
const manifest = JSON.parse(readFileSync(path.join(root, "client", "public", "manifest.webmanifest"), "utf8"));

test("manifest: name Richard's Resource, short_name RR, standalone, dawn colours", () => {
  assert.equal(manifest.name, "Richard's Resource", "manifest name must be Richard's Resource");
  assert.equal(manifest.short_name, "RR", "short name must be RR — Richard chose RR, not Me");
  assert.equal(manifest.display, "standalone", "RR must open full-screen, standalone");
  assert.equal(manifest.start_url, "/", "start URL must be the home page");
  assert.equal(manifest.scope, "/", "scope must be the whole site");
  assert.equal(manifest.theme_color, "#fdf4e3", "theme colour must match the dawn background");
  assert.equal(manifest.background_color, "#fdf4e3", "background colour must match the dawn background");
  assert.ok(!manifest.name.includes("Me") && manifest.short_name !== "Me", "short name must never be Me");
});

test("manifest icons: sunrise PNGs at 192 and 512, plus an SVG", () => {
  const bySize = new Map((manifest.icons ?? []).map((i) => [i.sizes, i]));
  assert.ok(bySize.has("192x192"), "manifest must list a 192x192 icon");
  assert.ok(bySize.has("512x512"), "manifest must list a 512x512 icon");
  const icon512 = bySize.get("512x512");
  assert.ok(icon512.purpose.includes("maskable"), "512 icon must be maskable so it survives the home-screen crop");
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith("/icons/"), `icon ${icon.src} must live under /icons/`);
    const file = path.join(root, "client", "public", icon.src);
    assert.ok(existsSync(file), `icon file must exist: ${icon.src}`);
  }
  // The PNGs must really be PNGs, not renamed SVGs or text.
  for (const name of ["icon-192.png", "icon-512.png", "icon-180.png"]) {
    const buf = readFileSync(path.join(root, "client", "public", "icons", name));
    assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${name} must start with the PNG magic bytes`);
    assert.ok(buf.length > 1000, `${name} must be a real image, not an empty file`);
  }
  const svg = readFileSync(path.join(root, "client", "public", "icons", "icon.svg"), "utf8");
  assert.ok(svg.includes("<svg") && svg.includes("sunrise"), "SVG icon must be a sunrise");
});

test("index.html links the manifest, the touch icon, and the theme colour", () => {
  assert.ok(html.includes('<link rel="manifest" href="/manifest.webmanifest"'), "page must link the manifest");
  assert.ok(html.includes('<link rel="apple-touch-icon" href="/icons/icon-180.png"'), "page must link the Apple touch icon");
  assert.ok(html.includes('<meta name="theme-color" content="#fdf4e3"'), "page must set the theme colour");
  assert.ok(html.includes('<meta name="apple-mobile-web-app-title" content="RR"'), "iOS home-screen title must be RR");
  assert.ok(html.includes('<link rel="icon" type="image/svg+xml" href="/icons/icon.svg"'), "favicon must be the sunrise SVG");
  assert.ok(!html.includes("ever created"), "meta description must use the current EVER! banner wording, not the old 'ever created'");
});

test("Home hint: Add RR to your home screen, full-screen, updates automatically — no app-store claim", () => {
  assert.ok(src.includes("function AddToHomeScreenHint()"), "the hint component must exist");
  assert.ok(src.includes("<AddToHomeScreenHint />"), "Home must render the hint");
  const home = src.slice(src.indexOf("function HomePage("), src.indexOf("function ResourcesPage("));
  assert.ok(home.includes("<AddToHomeScreenHint />"), "the hint must be on the Home page");
  assert.ok(src.includes("Add RR to your home screen"), "hint must say Add RR to your home screen");
  assert.ok(src.includes("Add to Home Screen"), "hint must name the browser menu item");
  assert.ok(src.includes("RR opens full-screen, like an app, and updates automatically."),
    "hint must say RR opens full-screen and updates automatically");
  // The hint is 2–3 lines of plain copy — no technical detail, and no
  // claim that RR is in an app store.
  const hint = src.slice(src.indexOf("function AddToHomeScreenHint()"), src.indexOf("function HomePage("));
  assert.ok(!hint.toLowerCase().includes("app store") && !hint.includes("Google Play"),
    "hint must not claim RR is in an app store");
  assert.ok(hint.includes("/icons/icon-192.png"), "hint must show the sunrise icon");
});

test("anonymity unchanged: manifest and hint add no tracking, no push, no personal data", () => {
  assert.ok(src.includes("We don't share your data. This is your personal journey."),
    "privacy line must be unchanged");
  assert.ok(!JSON.stringify(manifest).toLowerCase().includes("track"), "manifest must not mention tracking");
  assert.ok(!src.includes("beforeinstallprompt"), "no install-prompt JavaScript — the browser offers it, we just hint");
});
