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
  action TEXT NOT NULL CHECK (action IN ('welcome','touch','field','quitDate','daySuccess','relapse','pause','plan','log','screening','slotLesson','phoneFree','checkin','screenOff','dailyCheckin','quietMoment')),
  points INTEGER NOT NULL,
  day TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_device_tab_idx ON points (device_id, tab);
CREATE INDEX IF NOT EXISTS logs_device_category_idx ON logs (device_id, category, id DESC);
-- 2026-11-11: daily check-in adds 'dailyCheckin' (+100, once a day).
-- CREATE TABLE IF NOT EXISTS above does not touch an existing Neon
-- table, so widen its action CHECK here on every migrate, idempotently.
-- Postgres names the auto CHECK points_action_check; DROP IF EXISTS
-- is a no-op on a fresh database.
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_action_check;
ALTER TABLE points ADD CONSTRAINT points_action_check CHECK (action IN ('welcome','touch','field','quitDate','daySuccess','relapse','pause','plan','log','screening','slotLesson','phoneFree','checkin','screenOff','dailyCheckin','quietMoment'));
-- 2026-11-12: Longevity tab adds 'longevity' to the tab CHECK, so the
-- usual +1-per-tap points on that tab can save. Same idempotent widen:
-- CREATE TABLE IF NOT EXISTS above does not touch an existing Neon
-- table. Postgres names the auto CHECK points_tab_check.
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_tab_check;
ALTER TABLE points ADD CONSTRAINT points_tab_check CHECK (tab IN ('home','alcohol','smoking','gambling','drugs','codependency','food','screens','wellbeing','longevity','peace'));

-- 2026-11-12: Peace of Mind tab adds 'peace' to the tab CHECK and
-- 'quietMoment' (+10, self-claimed, once per day) to the action CHECK.
-- Same idempotent widen as above.
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_action_check;
ALTER TABLE points ADD CONSTRAINT points_action_check CHECK (action IN ('welcome','touch','field','quitDate','daySuccess','relapse','pause','plan','log','screening','slotLesson','phoneFree','checkin','screenOff','dailyCheckin','quietMoment'));
ALTER TABLE points DROP CONSTRAINT IF EXISTS points_tab_check;
ALTER TABLE points ADD CONSTRAINT points_tab_check CHECK (tab IN ('home','alcohol','smoking','gambling','drugs','codependency','food','screens','wellbeing','longevity','peace'));
