# Richard's Resource — public build

**The best FREE self-help app EVER!** A free app to help people
stop drinking, smoking, gambling, or using drugs — plus codependency,
food, screens, feeling unwell, longevity (healthy living), and peace of mind (meditation, prayer, gratitude, mindfulness — generic, for any faith or none). No account,
no judgement, no name or email needed. *"We don't share your data. This is your personal journey."*

This is the standalone, portable codebase for publishing the app at
**RichardsResource.com**. It was re-platformed from the Muse-hosted
version (which cannot run outside Muse) into a plain Node + Postgres
app that Render can host for free.

## What is in here

- `client/` — React 19 + Vite + Tailwind v4 app (the same tabs, hooks,
  breathing, points, and Honest Slot Machine as the Muse version).
  Client-only tabs are untouched: Food (SCOFF), Screens, Feeling Unwell
  (PHQ-9 / GAD-7), and Longevity never save or send check-in answers.
  Food, Screens, and Feeling Unwell earn +5 per answered question;
  Longevity earns no points for its check-in ticks, by Richard's rule.
  Peace of Mind saves nothing at all: its only award is +10, self-claimed
  on your own word for "I took a quiet moment" (meditation / prayer),
  once per visit in the app and once a day on the server. Longevity
  keeps to the free basics only — no published studies, by Richard's
  rule (2026-11-12): this is the starter app.
- `server/` — Express server. Serves the built client, `GET /health`,
  and `POST /actions` (the 7 actions: `getState`, `awardPoints`,
  `awardTouches`, `awardFields`, `saveProfile`, `addLog`, `deleteLog`).
  Point values live on the server: welcome 10, touch 1, field 5,
  quitDate 50, daySuccess 100, relapse −100, screenOff 10,
  dailyCheckin 100 (Home "Today I..." check-in, once per day, 2026-11-11),
  quietMoment 10 (Peace of Mind "I took a quiet moment", self-claimed,
  once per day, 2026-11-12).
- `drizzle/0001_public.sql` — Postgres schema (Neon). Idempotent;
  run on every deploy.
- `DATA-PLAN.md` — the data/privacy plan carried over from the
  Muse version.

## Privacy — the mandatory fix in this build

The Muse version had one shared store for one user (Richard). This
build adds an **anonymous device id**: a UUID generated in the
visitor's own browser on first visit, stored in that browser's
localStorage only (`richards-resource:device-id:v1`). It is sent with
every action, and every row in `profiles`, `logs`, and `points` is
scoped by it (`device_id`). No visitor can see or overwrite another
visitor's plans, logs, or points. There is no account, no login, no
name, no email. Data is tied to that browser/device — a new phone, a
cleared browser, or a different browser starts fresh, exactly as the
app already tells users. Check-in answers (PHQ-9 / GAD-7 / SCOFF /
Screens / Longevity) are never saved or sent anywhere.

Existing Muse-hosted data does **not** migrate: it was 0 profiles,
0 logs, and ~158 unscoped point rows (Richard's own testing). The
public site starts fresh for everyone, Richard included (+10 welcome
on first visit, like everyone else). His downloaded backup JSON is
his own record; it is not importable, by design (see DATA-PLAN.md).

## Honest Slot Machine — the math

Pair payout $14 on a $10 spin; triples $250 / $120 / $60 / $40.
Expected return = ($550 + 90 × $14) / 216 = $8.38 per $10 spin =
**about 84¢ per $1**, as the headline says. Verified in
`tests/slot-math.test.mjs`. The bankroll still always ends at zero
in the long run — just over more spins, like a real machine.

## Run it locally

```bash
npm install
npm run build        # builds the client (client/dist) and server (dist-server)
npm start            # listens on $PORT (default 3000)
```

With no `DATABASE_URL` set, the server uses an **in-memory Postgres**
(pg-mem) through the exact same Drizzle queries — for local
development and verification only. Data disappears on restart.
Set `DATABASE_URL` to use a real Postgres (see below).

```bash
curl http://localhost:3000/health   # {"status":"ok"}
```

## Deploy — Render free + Neon free ($0 to start)

Do **not** enter any payment card for the free tiers. If a provider
asks for a card for a *free* plan, stop and check before entering
anything. Never put `DATABASE_URL` in the repo, in chat, or in a file
other than the Render dashboard / a local `.env` (gitignored).

1. **Git repo.** Push this folder to GitHub / GitLab / Bitbucket.
   Render deploys from a repo.
2. **Neon (neon.tech).** Create a free account (Richard does this
   himself — Muse cannot create accounts in his name). One project,
   one database, e.g. `richards-resource`. Copy the **pooled**
   connection string (`sslmode=require`). Run the schema once:
   `psql "$DATABASE_URL" -f drizzle/0001_public.sql` — or let the
   server run it on boot (it runs `drizzle/0001_public.sql` on
   startup; it is idempotent).
3. **Render (render.com).** Create a free account (again, Richard
   himself). New **Web Service**, Node runtime, from the repo:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment: `NODE_ENV=production`,
     `DATABASE_URL=<paste the Neon connection string here>`.
     Do **not** set `PORT` — Render injects it.
   - Region: pick once (US-Oregon is the usual default); it cannot
     be changed later without recreating the service.
   Free tier: 750 instance-hours/month, 512 MB, spins down after
   15 min idle — the first visitor after a quiet spell waits ~60 s.
   If it takes off: Render Starter $7/mo + paid Postgres from $6/mo
   = **$13/mo**, always on, no cold start.
4. **GoDaddy DNS — only after Render is live.** In Render:
   Settings → Custom Domains → add `richardsresource.com`, then
   `www.richardsresource.com`. Render shows the exact values — use
   exactly what it shows, do not invent an IP or hostname.
   In GoDaddy (Domain Portfolio → RichardsResource.com → DNS):
   delete/replace the parked-page A record, add
   `A | @ | <Render IP>` and `CNAME | www | <service>.onrender.com`.
   Do **not** change nameservers and do **not** use GoDaddy
   Forwarding (that would show the `.onrender.com` address).
   Verify in Render; free Let's Encrypt TLS auto-provisions.
   Propagation: minutes to an hour, up to 48 h.
   Phone script for GoDaddy support is in
   `~/workspace/research_notes/render-neon-deployment-plan-2026-11-10.md` §6.

## Donations

Donations are **optional, NOT tax-deductible, not a charity**. The
app says so, and the button says "Donations coming soon" — there is
**no payment flow** in this build. Payment processing is a later
step, after the LLC is restored. Do not add card fields or payment
links here.

## Add to Home Screen (RR)

The app is a website, not an app-store app. `client/public/manifest.webmanifest`
(name "Richard's Resource", short_name **"RR"** — Richard chose RR, not "Me")
plus the sunrise icons in `client/public/icons/` (192 / 512 PNG, maskable,
180 Apple touch icon, SVG favicon) let the browser offer "Add to Home Screen".
Home shows a short hint ("Add RR to your home screen — tap your browser menu,
then Add to Home Screen. RR opens full-screen, like an app, and updates
automatically."). No install-prompt JavaScript, no push, no tracking.

## Tests

```bash
npm test   # slot math (expected return ≈ 83.8%) + per-user isolation
           # + daily check-in (100 once/day) + Longevity tab source checks
           # + Peace of Mind tab checks and quietMoment (10 once/day),
           # over HTTP against a locally started server (in-memory DB)
```
