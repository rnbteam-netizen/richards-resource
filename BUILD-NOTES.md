# Build notes — re-platforming, 2026-11-10

Built from the plan in `~/workspace/research_notes/render-neon-deployment-plan-2026-11-10.md`.
Source app (unchanged): `~/workspace/ts-spaces/free-quit-help-app/`.

## What was built
Standalone Node/npm codebase in `~/workspace/richards-resource-public/`:
- Express server (`server/src/server.ts`): serves `client/dist/`,
  `GET /health`, `POST /actions` (7 actions, Zod-validated, point
  values server-side). Listens on `process.env.PORT`.
- Postgres schema (`server/src/schema.ts`, drizzle-orm/pg-core;
  `drizzle/0001_public.sql`, idempotent). `DATABASE_URL` env only.
- Anonymous device id: UUID in the browser's localStorage
  (`richards-resource:device-id:v1`), sent with every action; all
  rows scoped by `device_id` on profiles/logs/points.
- Client: React 19 + Vite + Tailwind v4, same `App.tsx` behaviour
  (tabs, hooks, breathing 4s/1s/6s, points, Honest Slot Machine
  ~84%, unlimited time except Screens step-up, privacy line verbatim,
  donations "coming soon" with no payment flow). No `@hatch/space-sdk`
  anywhere (verified by grep over source and built bundle).

## One deliberate deviation from the plan
The plan said to use Drizzle's query builder for execution. That
does not work with pg-mem, the only no-account Postgres available
for local verification: Drizzle's node-postgres driver issues
prepared queries with `rowMode: "array"`, which pg-mem rejects
("Not supported: pg rowMode"). So actions use parameterized raw SQL
against the pool — the exact same SQL and parameters against real
Neon Postgres and against pg-mem. Drizzle pg-core still defines the
tables (schema.ts) and the migration SQL. This is documented in
`server/src/db.ts` and `server/src/actions.ts`.

## Verified 2026-11-10 (local, in-memory Postgres fallback)
- `npm install` — 221 packages, clean.
- `npm run typecheck` — client + server, clean.
- `npm run build` — Vite client (383.98 kB JS) + tsc server, clean.
- `npm test` — **4/4 pass**: slot math (EV $8.38 per $10 spin =
  83.8%, ~84¢ per $1; old $4 pair payout = 42¢ guard), per-user
  isolation over HTTP (two device ids, welcome/profile/log/touches
  invisible across devices, cross-device delete blocked, quit-date
  dedupe per device per day).
- Live smoke: server starts, `GET /health` → `{"status":"ok"}`,
  `/` → 200, JS asset → 200, welcome award +10, `getState` shows it.
- Built bundle contains "84¢", the device-id key, and the privacy
  line; contains no Hatch SDK references and no `DATABASE_URL`.

## Post-review batch — built locally 2026-11-13, NOT pushed
Richard's review notes (2026-11-12) + Terms draft (2026-11-13), items 1–9,
in `~/workspace/goals/richard-s-resource-app/files/review-notes-2026-11-12.md`
and `terms-draft-2026-11-13.md`. Local commit only — no push, live site
still on 8daa67f until Richard says go.
- Crisis box on Home after the tabs, before the points box (same 988/911
  CrisisStrip as Feeling Unwell). True message first thing on Home:
  "We don't share your data. This is your personal journey... BUT YOU ARE
  NOT ALONE. Help is at your fingertips."
- UrgeSurf title is now simply "Ride out this urge" on all tabs.
- What's New: bigger "Got it — hide this" button + an ✕, both writing the
  same localStorage flag; banner never reappears after dismissal.
- Calm tone gain 0.05 → 0.22, plus a volume slider (0–0.4) in the
  breathing exercise; slot tones unchanged. Tone still off by default.
- Codependency: "Hear it read aloud" per boundary phrase, via the phone's
  own speechSynthesis (`client/src/speech.ts`), preferring a female voice
  where the phone offers one, tap-only, nothing recorded or sent.
- Screens look-away: 10 seconds first, "You did 10, try 30" as the next
  rung; spoken counting 1, 2, 3, then the last number, opt-in toggle off
  by default. No 60-second timer.
- Grammar: "None of these are new"; "doctors use" kept (no possessive).
- Terms: one-page TermsPage (arbitration in Grays Harbor County, WA;
  errors and omissions; minimal lawyerese), linked in the footer on every
  tab and on Help & Resources, plus a first-visit TermsNotice with a
  "Got it" button. Never a locked gate — tabs, breathing and crisis
  numbers are always open.
- Verified: typecheck clean, build clean (client 446.05 kB JS),
  `npm test` **42/42 pass** (incl. new `tests/post-review-batch.test.mjs`,
  11 tests), local smoke test: /health ok, built bundle contains the new
  wording, no "Ride out this urge —" remains. Existing copyright /
  disclaimer / tagline tests were updated only to match the new
  `MeadowFooter({ onTerms })` signature — no behaviour changed there.

## What remains (not done — needs Richard / an account)
1. **Git repo** — push this folder to GitHub/GitLab/Bitbucket.
   Render deploys from a repo. No repo was created.
2. **Neon account** — Richard creates it himself at neon.tech,
   creates project/database `richards-resource`, copies the pooled
   connection string (`sslmode=require`). No account created.
3. **Render account + Web Service** — Richard creates it himself
   at render.com. Build `npm install && npm run build`, start
   `npm start`, env `NODE_ENV=production` + `DATABASE_URL` from
   Neon. Do not set `PORT`. No account created, nothing deployed.
4. **GoDaddy DNS** — only after Render is live, using the exact
   values Render shows (A @ → Render IP, CNAME www →
   `<service>.onrender.com`). Phone script is in the plan §6.
   No DNS touched.
5. **No card handled.** Free tiers need no card; Richard was told
   not to send his debit card in chat. If a provider asks for one
   on a free tier, stop and check first.
6. **Real-Neon end-to-end test not possible yet** — no Neon
   account exists. The SQL is standard Postgres and was verified
   against pg-mem; run `psql "$DATABASE_URL" -f drizzle/0001_public.sql`
   once Neon exists, then smoke-test `/health` and one
   `awardPoints` call on the live Render URL.

## Existing data
Not migrated, by design: the Muse app had 0 profiles, 0 logs, and
~158 unscoped point rows (Richard's testing). The public site starts
fresh for everyone, Richard included.
