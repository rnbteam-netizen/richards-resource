-- Richard's Resource — public Postgres schema (Neon).
-- Idempotent: safe to run on every deploy (CREATE TABLE IF NOT EXISTS).
-- device_id is an anonymous UUID from the visitor's own browser.
-- Every row is scoped by it; no visitor can see another's data.
CREATE TABLE IF NOT EXISTS profiles (
  device_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('alcohol','smoking','gambling','drugs','codependency')),
  quit_date TEXT,
  daily_cost DOUBLE PRECISION,
  daily_amount TEXT,
  plan_text TEXT,
  support_name TEXT,
  support_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, category)
);
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('alcohol','smoking','gambling','drugs','codependency')),
  kind TEXT NOT NULL DEFAULT 'urge' CHECK (kind IN ('urge','boundary','note')),
  trigger TEXT,
  intensity INTEGER,
  note TEXT,
  rode_it_out BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS points (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  tab TEXT NOT NULL CHECK (tab IN ('home','alcohol','smoking','gambling','drugs','codependency','food','screens','wellbeing','longevity','peace')),
  action TEXT NOT NULL CHECK (action IN ('welcome','touch','field','quitDate','daySuccess','relapse','pause','plan','log','screening','slotLesson','phoneFree','checkin','screenOff','dailyCheckin','quietMoment','happyMoment')),
  points INTEGER NOT NULL,
  day TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_device_tab_idx ON points (device_id, tab);
CREATE INDEX IF NOT EXISTS logs_device_category_idx ON logs (device_id, category, id DESC);
-- Widening the points CHECKs (idempotent — this whole file runs on
-- EVERY deploy: server/src/server.ts migrate() runs it on boot, and
-- CREATE TABLE IF NOT EXISTS above does not touch an existing Neon
-- table, so these ALTERs are what actually change a live table).
-- Postgres re-validates EVERY existing row each time a constraint is
-- added, so a list here must never be narrower than any list that
-- came before it, and must contain every action/tab the app has
-- ever written.
-- 2026-11-18 incident: the file used to carry one historical
-- widening block per feature, and the 2026-11-11 block re-added
-- points_action_check WITHOUT 'happyMoment'. That passed on the
-- 2026-11-18 Happy Button deploy (no happyMoment rows existed yet),
-- but the next deploy (f45129d, Happy Button sounds) failed at
-- startup — "check constraint points_action_check of relation
-- points is violated by some row" — because happyMoment rows from
-- Richard's taps now existed in production, and the narrower
-- intermediate constraint failed before the file ever reached the
-- later block that allows happyMoment. The fix: exactly ONE
-- widening block per constraint, always the full current list.
-- Never add a second, narrower block; when a new action/tab is
-- added, extend the single list below (and pointActions/pointTabs
-- in server/src/schema.ts, which must match it exactly —
-- tests/migration-check.test.mjs pins this).
-- Full action list (17): welcome, touch, field, quitDate,
-- daySuccess, relapse, pause, plan, log, screening, slotLesson,
-- phoneFree, checkin, screenOff, dailyCheckin, quietMoment,
-- happyMoment (dailyCheckin 2026-11-11, quietMoment 2026-11-12,
-- happyMoment 2026-11-18, +10, up to 8 scored pushes per local
-- day, 80 max a day). Full tab list (11): home, alcohol, smoking,
-- gambling, drugs, codependency, food, screens, wellbeing,
-- longevity, peace.
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_action_check;
ALTER TABLE points ADD CONSTRAINT points_action_check CHECK (action IN ('welcome','touch','field','quitDate','daySuccess','relapse','pause','plan','log','screening','slotLesson','phoneFree','checkin','screenOff','dailyCheckin','quietMoment','happyMoment'));
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_tab_check;
ALTER TABLE points ADD CONSTRAINT points_tab_check CHECK (tab IN ('home','alcohol','smoking','gambling','drugs','codependency','food','screens','wellbeing','longevity','peace'));
-- Atomic once-a-day awards (001 security fix, 2026-11-19): the
-- server's exists() checks in actions.ts are a fast path only —
-- two simultaneous calls can both pass them, so the database
-- itself must reject the second award. That is these two partial
-- unique indexes, together the unique constraint on
-- (device_id, action, day) for the once-a-day awards:
--   * points_once_per_day_uidx: (device_id, tab, action, day)
--     for quitDate, dailyCheckin, quietMoment, daySuccess,
--     relapse. Tab is in the key because quitDate/daySuccess are
--     per-category (one quit date for alcohol and one for smoking
--     on the same day are two different awards).
--   * points_welcome_uidx: (device_id, action) for welcome,
--     whose day is NULL — Postgres treats NULLs as distinct in a
--     unique index, so welcome needs its own index.
-- Partial, not whole-table, on purpose: happyMoment legitimately
-- repeats up to 8 times a day for the same device/tab/day, and
-- touch/field rows have day NULL and repeat freely — a
-- non-partial unique index on (device_id, tab, action, day)
-- would break both. The server catches the 23505 the loser
-- gets and reports it as already-paid (see actions.ts).
-- Self-cleaning duplicates (001 security fix, 2026-11-19,
-- Boss 0075: "put the fix in" so nobody has to do a manual
-- Neon check first): CREATE UNIQUE INDEX fails if duplicate
-- rows already exist in live Neon (it re-validates every row,
-- like the CHECK in the 2026-11-18 incident) — so the
-- migration deletes duplicates itself BEFORE creating the
-- indexes, keeping the earliest row (lowest id) of each
-- duplicate group and nothing else. No manual Neon step is
-- needed before pushing; on a clean database both DELETEs
-- remove 0 rows, so they are safe to run on every boot.
-- happyMoment and touch/field rows are NOT in either DELETE's
-- action list, so repeated happyMoment taps and touches are
-- never cleaned up. Form note: the DELETEs use a self-join
-- inside IN (SELECT ...) rather than a correlated EXISTS or
-- NOT IN (SELECT MIN(id) ...) — both of those are valid
-- Postgres, but pg-mem (the local test database) cannot run
-- them, and this file must stay testable locally in pg-mem.
-- Self-cleaning duplicates — start
DELETE FROM points WHERE id IN (SELECT a.id FROM points a JOIN points b ON b.device_id = a.device_id AND b.tab = a.tab AND b.action = a.action AND b.day = a.day AND b.id < a.id WHERE a.day IS NOT NULL AND a.action IN ('quitDate','dailyCheckin','quietMoment','daySuccess','relapse'));
DELETE FROM points WHERE id IN (SELECT a.id FROM points a JOIN points b ON b.device_id = a.device_id AND b.action = a.action AND b.id < a.id WHERE a.action = 'welcome');
CREATE UNIQUE INDEX IF NOT EXISTS points_once_per_day_uidx ON points (device_id, tab, action, day) WHERE day IS NOT NULL AND action IN ('quitDate','dailyCheckin','quietMoment','daySuccess','relapse');
CREATE UNIQUE INDEX IF NOT EXISTS points_welcome_uidx ON points (device_id, action) WHERE action = 'welcome';
