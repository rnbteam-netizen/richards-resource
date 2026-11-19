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
