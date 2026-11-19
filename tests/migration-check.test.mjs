// Migration CHECK regression (Richard, 2026-11-18): the f45129d
// deploy (Happy Button sounds) failed at startup even though the
// build succeeded — "[server] database migration failed: error:
// check constraint \"points_action_check\" of relation \"points\" is
// violated by some row", process exited status 1, deploy failed,
// live site kept serving the previous commit.
// Root cause: drizzle/0001_public.sql runs on EVERY deploy
// (server.ts migrate() runs the whole file on boot), and it carried
// one historical widening block per feature. The 2026-11-11 block
// re-added points_action_check WITHOUT 'happyMoment'. That passed on
// the Happy Button deploy (8896bf9: no happyMoment rows existed in
// Neon yet), but the next deploy re-ran the file while happyMoment
// rows from Richard's taps existed in production, and Postgres
// re-validates every existing row when a CHECK is added — so the
// narrower intermediate constraint failed before the file ever
// reached the later block that allows happyMoment. Local tests
// missed it: pg-mem runs the migration once on a fresh, empty DB.
// These tests pin the invariant in the source instead (the repo's
// established pattern for things the in-memory DB cannot reproduce):
// the action/tab CHECK lists must never narrow, in file order, and
// the final list must equal exactly the actions/tabs the server can
// write. pg-mem cannot reproduce the live failure directly: it does
// not implement DROP CONSTRAINT, so re-running the migration there
// fails for an unrelated pg-mem reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { newDb } from "pg-mem";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(path.join(root, "drizzle", "0001_public.sql"), "utf8");
const schema = readFileSync(path.join(root, "server", "src", "schema.ts"), "utf8");
const actions = readFileSync(path.join(root, "server", "src", "actions.ts"), "utf8");

function quotedList(text) {
  // SQL uses single quotes, schema.ts / actions.ts use double quotes.
  return [...text.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
}

function checkLists(column) {
  const re = new RegExp(`CHECK\\s*\\(\\s*${column}\\s+IN\\s*\\(([^)]*)\\)\\)`, "g");
  return [...sql.matchAll(re)].map((m) => quotedList(m[1]));
}

function constList(source, name) {
  const m = source.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`, "s"));
  assert.ok(m, `${name} must be defined in schema.ts`);
  return quotedList(m[1]);
}

test("migration: points action CHECK must never narrow, in file order, and must end at the full server list", () => {
  const lists = checkLists("action");
  // CREATE TABLE list + exactly one widening ADD (the fix for the
  // 2026-11-18 incident removed the historical duplicate blocks).
  assert.equal(lists.length, 2, "there must be exactly two action CHECK lists: CREATE TABLE + one widening ADD");
  assert.equal((sql.match(/ADD CONSTRAINT points_action_check/g) ?? []).length, 1,
    "there must be exactly one ADD CONSTRAINT points_action_check — no historical duplicate widening blocks");
  const pointActions = constList(schema, "pointActions");
  const enumActions = quotedList(actions.match(/export const pointActionEnum = z\.enum\(\[([^\]]*)\]\)/s)[1]);
  assert.deepEqual(enumActions, pointActions, "server pointActionEnum must match schema pointActions");
  for (let i = 0; i < lists.length; i++) {
    assert.ok(lists[i].includes("happyMoment"),
      `action CHECK list ${i + 1} must allow 'happyMoment' — the offending value in the 2026-11-18 deploy failure`);
    if (i > 0) {
      for (const value of lists[i - 1]) {
        assert.ok(lists[i].includes(value),
          `action CHECK list ${i + 1} must not drop '${value}' from list ${i} — a narrower intermediate constraint fails on live rows`);
      }
    }
  }
  assert.deepEqual(lists[lists.length - 1], pointActions,
    "the final action CHECK list must equal exactly the actions the server can write");
});

test("migration: points tab CHECK must never narrow, in file order, and must end at the full server list", () => {
  const lists = checkLists("tab");
  assert.equal(lists.length, 2, "there must be exactly two tab CHECK lists: CREATE TABLE + one widening ADD");
  assert.equal((sql.match(/ADD CONSTRAINT points_tab_check/g) ?? []).length, 1,
    "there must be exactly one ADD CONSTRAINT points_tab_check — no historical duplicate widening blocks");
  const pointTabs = constList(schema, "pointTabs");
  for (let i = 1; i < lists.length; i++) {
    for (const value of lists[i - 1]) {
      assert.ok(lists[i].includes(value),
        `tab CHECK list ${i + 1} must not drop '${value}' from list ${i}`);
    }
  }
  assert.deepEqual(lists[lists.length - 1], pointTabs,
    "the final tab CHECK list must equal exactly the tabs the server can write");
});

test("migration: a fresh database accepts one row per action the server can write, including happyMoment", async () => {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const db = new Pool();
  await db.query(sql);
  const pointActions = constList(schema, "pointActions");
  const tabs = constList(schema, "pointTabs");
  for (let i = 0; i < pointActions.length; i++) {
    await db.query(
      `INSERT INTO points (device_id, tab, action, points, day) VALUES ($1, $2, $3, 10, NULL)`,
      ["00000000-0000-4000-8000-000000000001", tabs[i % tabs.length], pointActions[i]],
    );
  }
  const rows = await db.query("SELECT action FROM points ORDER BY id");
  assert.deepEqual(rows.rows.map((r) => r.action), pointActions,
    "every action the server can write must be storable after a fresh migrate");
  await db.end();
});
