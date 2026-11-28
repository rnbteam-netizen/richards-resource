import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { sounds, type CalmToneKind } from "./sound";
import { speakText, stopSpeaking } from "./speech";
import welcomeCottage from "./assets/welcome-cottage.jpg";
import myLifeGarden from "./assets/my-life-garden.webp";
import myLifeGardenGazebo from "./assets/my-life-garden-gazebo.webp";
import myLifeGardenCozyRoom from "./assets/my-life-garden-cozy-room.webp";
import { shareApp } from "./share";
import { searchApp, loadLastPlace, saveLastPlace, LAST_PLACE_LABELS } from "./search";
import { MY_MUSE_URL, RETURN_TO_MY_RR_URL } from "./my-muse";

type Category = "alcohol" | "smoking" | "gambling" | "drugs" | "codependency";
type Profile = ApiResponse<typeof api, "getState">["profiles"][number];
type LogEntry = ApiResponse<typeof api, "getState">["logs"][number];

type TabId = Category | "home" | "resources" | "wellbeing" | "food" | "screens" | "longevity" | "peace";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "alcohol", label: "Alcohol" },
  { id: "smoking", label: "Smoking" },
  { id: "gambling", label: "Gambling" },
  { id: "drugs", label: "Drugs" },
  { id: "codependency", label: "Codependency" },
  { id: "food", label: "Food" },
  { id: "screens", label: "Screens" },
  { id: "wellbeing", label: "Feeling Unwell?" },
  { id: "longevity", label: "Longevity" },
  { id: "peace", label: "Peace of Mind" },
  { id: "resources", label: "Help & Resources" },
];

// Pastel palette for the tabs — soft, hopeful colours in the sunrise
// spirit. Home is pastel green (not the old reddish "stop" colour);
// every other tab gets its own distinct pastel.
const TAB_PASTELS: Record<TabId, { activeBg: string; inactiveBg: string; border: string; activeBorder: string }> = {
  home:         { activeBg: "#b7e1a8", inactiveBg: "#e2f2da", border: "#a8d19a", activeBorder: "#6aa84f" },
  alcohol:      { activeBg: "#ffd9ad", inactiveBg: "#fdeeda", border: "#f2c48f", activeBorder: "#d99a4e" },
  smoking:      { activeBg: "#aed6ec", inactiveBg: "#dceef7", border: "#9cc6de", activeBorder: "#5b9bbf" },
  gambling:     { activeBg: "#f9de81", inactiveBg: "#fef3c7", border: "#ecd06f", activeBorder: "#c9a227" },
  drugs:        { activeBg: "#d3bdf0", inactiveBg: "#ece4f8", border: "#bfa8e0", activeBorder: "#8a6fc9" },
  codependency: { activeBg: "#f7b8d0", inactiveBg: "#fbe3ee", border: "#eda8c4", activeBorder: "#c95a8a" },
  food:         { activeBg: "#d7e589", inactiveBg: "#eef4cf", border: "#c3d470", activeBorder: "#7d9426" },
  screens:      { activeBg: "#b9cbdd", inactiveBg: "#e4ecf3", border: "#a5bcd2", activeBorder: "#6486a5" },
  wellbeing:    { activeBg: "#9fe0cb", inactiveBg: "#d3f2e6", border: "#86d3b8", activeBorder: "#3d9a78" },
  longevity:    { activeBg: "#8fd6cf", inactiveBg: "#dcf1ee", border: "#7cc4bd", activeBorder: "#2f8a80" },
  peace:        { activeBg: "#d8b4d4", inactiveBg: "#f3e2f0", border: "#c49cc0", activeBorder: "#9a5a90" },
  resources:    { activeBg: "#b3c8ee", inactiveBg: "#dde7f7", border: "#9db6e2", activeBorder: "#5f83c4" },
};

const CAT_LABEL: Record<Category, string> = {
  alcohol: "Alcohol",
  smoking: "Smoking",
  gambling: "Gambling",
  drugs: "Drugs",
  codependency: "Codependency",
};

/* ---------- points: Richard's system — no maximum, every touch counts ---------- */

// Points follow Richard's rules: there is no maximum total, and one
// running score grows across every tab. +10 for downloading the app
// (the welcome award, once), +1 for every finger touch anywhere in the
// app, +5 for filling in each data field, +50 for picking a quit date,
// +100 for every day after it that you stay on track — and −100 for a
// relapse, because a slip is part of recovery, not the end of it. The
// daily check-in on Home adds one more: +100 total, once per day, for
// completing "Today I... Exercised, Ate Well, Slept Well, Feel Better"
// (Richard, 2026-11-11) — not 100 per item. The
// Screens tab adds one more: +10 when you tap "I turned my screen off"
// — self-assessment on your own word, because an honest self-report is
// better than nothing. Peace of Mind adds the same idea: +10 when you tap
// "I took a quiet moment" — meditation or prayer, on your own word, once
// per visit in the app and once a day on the server, so a new day can
// count again. Home adds one more still: +10 when you tap the Happy
// Button — "I'm feeling happy", a happy moment noticed, on your own
// word, up to 8 scored pushes a day (80 max), one full thermometer's
// worth; after that the button still works and the thermometer still
// fills and pins, it just pays no more points that day. Home adds one
// more after that (Richard, 2026-11-21): +100, once ever, for getting
// your own Personal Muse Assistant — first tapping "Talk to My Muse". The app can't
// check whether you meditated or prayed, and it doesn't try. Values
// live on the server; the client only reports what happened. The older
// action names remain in the label map so past events still read well.
type PointTab = "home" | "alcohol" | "smoking" | "gambling" | "drugs" | "codependency" | "food" | "screens" | "wellbeing" | "longevity" | "peace";
type PointAction = "welcome" | "touch" | "field" | "quitDate" | "daySuccess" | "relapse" | "pause" | "plan" | "log" | "screening" | "slotLesson" | "phoneFree" | "checkin" | "screenOff" | "dailyCheckin" | "quietMoment" | "happyMoment" | "myMuse";
type PointEvent = ApiResponse<typeof api, "getState">["pointEvents"][number];
type DayMark = ApiResponse<typeof api, "getState">["dayMarks"][number];

const POINT_TAB_LABEL: Record<PointTab, string> = {
  home: "Home",
  alcohol: "Alcohol",
  smoking: "Smoking",
  gambling: "Gambling",
  drugs: "Drugs",
  codependency: "Codependency",
  food: "Food",
  screens: "Screens",
  wellbeing: "Feeling Unwell?",
  longevity: "Longevity",
  peace: "Peace of Mind",
};

const POINT_ACTION_LABEL: Record<PointAction, string> = {
  welcome: "Welcome — thanks for downloading the app",
  touch: "Taps and touches as you use the app",
  field: "Filled in a field",
  quitDate: "Picked a quit date",
  daySuccess: "A successful day",
  relapse: "A slip — logged honestly, and part of recovery",
  pause: "Finished a pause",
  plan: "Saved a plan",
  log: "Logged an urge or boundary moment",
  screening: "Completed a screening",
  slotLesson: "Played the Honest Slot Machine lesson",
  phoneFree: "Picked a phone-free change",
  checkin: "Completed the check-in",
  screenOff: "Turned my screen off",
  dailyCheckin: "Completed today's check-in",
  quietMoment: "Took a quiet moment — meditation / prayer",
  happyMoment: "Noticed a happy moment — Happy Button",
  myMuse: "Got your own Muse — your personal self-help assistant",
};

type PointsApi = {
  award: (tab: PointTab, action: PointAction, day?: string) => void;
  awardFields: (tab: PointTab, count: number) => void;
  byTab: Partial<Record<PointTab, number>>;
  total: number;
  lastAward: { tab: PointTab; action: PointAction; points: number; at: number } | null;
};

const PointsContext = createContext<PointsApi>({ award: () => {}, awardFields: () => {}, byTab: {}, total: 0, lastAward: null });
const usePoints = () => useContext(PointsContext);

function signedPoints(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

// The viewer's local calendar day as YYYY-MM-DD — quit dates and daily
// marks are counted in the user's own days, not the server's.
function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- your data: privacy, autosave, and save-to-phone ---------- */

// Richard asked (2026-11-10): "Yes, add save to phone. Auto save when
// exiting the app? Maybe a phrase that says we never share your data
// ever. I'm aware of HIPAA."
//
// Where data actually lives today (probed for this edit): quit plans,
// logs, quit dates and points are saved through the app's server actions
// (getState / saveProfile / addLog / award*) — there is no account, no
// login, and no other reader of those rows in the app. Check-in ANSWERS
// (PHQ-9 / GAD-7 / SCOFF / Screens / Longevity) are never saved or sent anywhere —
// only a count of answered questions can earn points. So the privacy
// wording below names exactly that, and is honest about the one limit:
// the saved copy is tied to this app on this phone / browser, so a new
// phone, a cleared browser, or a different browser starts fresh. That
// limit is exactly why the Save-to-phone file matters.
//
// Autosave, honestly: points already flush in batches and on
// visibilitychange; this edit adds a pagehide flush too, plus
// localStorage drafts for anything still being typed (a plan or a log
// entry you haven't pressed Save on yet) so leaving the app mid-thought
// doesn't lose it, and a localStorage mirror of the last server totals
// so the phone itself holds a recent copy. A visible save-status line
// says "Saving…" / "All changes saved" instead of staying silent.
//
// Save to phone: the backup is built entirely in the browser from the
// data getState already returns — profiles, logs (newest 100, as the
// app shows them), lifetime points totals by tab (summed server-side
// from every event; no maximum), day marks, and the 30 most recent
// point events. It contains NO screening answers, because those are
// never stored. There is deliberately NO Restore button: the existing
// actions can only add points and upsert profiles — nothing can clear
// or replace the points history — so a restore could not honestly put
// the app back to the backup equivalent. The file is the user's own
// copy to keep, not a promise the app can't keep.
const MIRROR_KEY = "richards-resource:mirror:v1";
const PROFILE_DRAFT_PREFIX = "richards-resource:draft:profile:";
const LOG_DRAFT_PREFIX = "richards-resource:draft:log:";

function safeLocalGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeLocalSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* storage full or blocked — the app still works without it */ }
}
function safeLocalRemove(key: string): void {
  try { window.localStorage.removeItem(key); } catch { /* nothing to do */ }
}

// The storage adapter the last-place helpers talk through — the
// safe localStorage wrappers above, so a blocked or full store can
// never break the app. Nothing stored through it leaves the phone.
const LOCAL_STORAGE_ADAPTER = { getItem: safeLocalGet, setItem: safeLocalSet };

/* ---------- what's new: a banner on Home, once per version ---------- */

// What's new (Richard, 2026-11-12): a short banner on Home listing
// what changed in this version — Longevity, Peace of Mind, icons,
// sounds, and the banner itself. It is shown once per version and
// then dismissed, and that is all it is: NO push notifications, NO
// email, NO phone calls, NO tracking. The only thing stored is one
// local version flag in the visitor's own browser localStorage
// ("seen version 1.1.0") — never sent to the server, never tied to
// identity, and the privacy line is unchanged. Bump
// WHATS_NEW_VERSION when a version ships something worth announcing;
// everyone sees the banner once for the new version, and never again
// until the next one. Dismissing it hides it and records the flag.
const WHATS_NEW_VERSION = "1.1.0";
const WHATS_NEW_KEY = "richards-resource:whats-new-seen";
const WHATS_NEW_ITEMS = [
  "New Longevity tab — healthy living, the free basics: sleep, walking, real food, friends, and purpose.",
  "New Peace of Mind tab — a quiet corner for meditation, prayer, gratitude, and mindfulness, for any faith or none.",
  "Icons on every tab button, so each tab is easier to spot.",
  "Optional sounds — slot machine sounds on the Gambling tab, and a calm tone for breathing — both off unless you turn them on.",
  "This What's new banner — it shows once per version, and never sends anything anywhere.",
];

function WhatsNewBanner() {
  // Shown only if this browser hasn't seen this version yet. The
  // initial state reads localStorage once; dismissing writes the flag.
  // Click-to-open (Richard, 2026-11-15, note 10): the full wordy list
  // is hidden until tapped, so Home stays short and easy to read.
  // It starts closed; tapping the header opens it, tapping again
  // closes it. Dismissing (X or "Got it") is unchanged: it writes
  // the seen-version flag, so it will not come back for this version.
  const [visible, setVisible] = useState(() => safeLocalGet(WHATS_NEW_KEY) !== WHATS_NEW_VERSION);
  const [open, setOpen] = useState(false);
  if (!visible) return null;
  const dismiss = () => {
    safeLocalSet(WHATS_NEW_KEY, WHATS_NEW_VERSION);
    setVisible(false);
  };
  return (
    <div className="felt-card mb-5 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--amber-soft)] p-5" role="region" aria-label="What's new in this version">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close what's new" : "Open what's new"} className="min-h-11 flex-1 rounded-[var(--radius)] text-left font-display text-lg font-bold text-[var(--text)]">
          ✨ What's new {open ? "— tap to close" : "— tap to open"}
        </button>
        <button type="button" onClick={dismiss} aria-label="Close what's new" className="min-h-11 min-w-11 shrink-0 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-3 text-lg font-bold text-[var(--text)]">
          ✕
        </button>
      </div>
      {!open && (
        <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">What&apos;s new in version {WHATS_NEW_VERSION} — tap to open and see.</p>
      )}
      {open && (
        <>
          <ul className="mt-2 space-y-1.5">
            {WHATS_NEW_ITEMS.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-[var(--text)]">
                <span aria-hidden className="mt-0.5 text-[var(--accent)]">•</span><span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-[var(--dim)]">
            No notifications, no emails — this banner is the only announcement, and it shows once per version.
          </p>
          <button type="button" onClick={dismiss} aria-label="Dismiss what's new" className="felt-btn mt-3 min-h-14 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 text-base font-bold text-white">
            Got it — hide this
          </button>
          <p className="mt-2 text-center text-sm text-[var(--dim)]">Tap “Got it” or ✕ above to hide this — it will not come back for this version.</p>
        </>
      )}
    </div>
  );
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// The short promise, shown on every tab under the points bar and again
// in the footer — Richard's exact words, kept verbatim.
function PrivacyStrip() {
  return (
    <div className="felt-soft mt-3 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-2.5 text-center">
      <p className="font-bold text-[var(--text)]">We don't share your data. This is your personal journey.</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">We can't share your personal information, because we don't ask for it.</p>
      <p className="mt-0.5 text-sm leading-relaxed text-[var(--text)]">
        Your plans, logs and points are saved in this app only for you. No account,
        no name or email needed — and your check-in answers are never saved at all.
      </p>
    </div>
  );
}

// A short one-line version, at the top of the most relevant tabs
// (Longevity, Feeling Unwell, Food, Peace of Mind).
function DisclaimerShort() {
  return (
    <p className="felt-soft mt-4 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm leading-relaxed text-[var(--text)]">
      This app is support, not medical advice — talk to your own doctor about exercise, diet, medicines, or mental health.
    </p>
  );
}

// Full version, in the footer on every tab and on Help & Resources —
// plain, kind language, not heavy legalese. Richard's rule, 2026-11-12:
// this is not medical advice, and professional help comes first.
function MedicalDisclaimer() {
  return (
    <div className="felt-soft rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-semibold text-[var(--text)]">Please read — this is not medical advice</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
        Richard&apos;s Resource is general information and support only. It is not medical advice, not a diagnosis,
        and not a treatment — and it is not a substitute for your own doctor, a counselor, or an addiction
        professional. What helps one person may not be right for another, so please use your own judgement, and
        get professional advice when you are unsure.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
        Before you start an exercise programme, change what you eat, or stop or change a medicine, talk to your
        own doctor first — especially if you have a health condition, such as a heart condition or diabetes, or
        you take regular medicines. The same goes for mental health: if you are struggling, please seek counseling
        or talk to your doctor. Reaching out is a strong step, not a weakness.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
        If you feel unsafe, or you have thoughts of harming yourself, please get help right away — call or text{" "}
        <a className="font-semibold underline" href="tel:988">988</a> (the Suicide &amp; Crisis Lifeline, US, free,
        24/7) or call <a className="font-semibold underline" href="tel:911">911</a>, or your local emergency
        number, right now.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
        For addiction, please seek professional help. Stopping alcohol suddenly can be dangerous, and alcohol
        withdrawal needs medical supervision — do not stop drinking heavily without a doctor&apos;s help. The same
        care applies to other drugs and medicines: a doctor or an addiction professional can help you stop safely.
      </p>
    </div>
  );
}

/* ---------- terms of use: one page, plain language, never a locked gate ---------- */

// Terms (Richard, 2026-11-13): a one-page Terms of Use for liability,
// in minimal lawyerese, from his draft of 2026-11-13. It is linked
// from the footer on every tab and on Help & Resources.
// Agree gate (Richard, 2026-11-23): "They need to agree or can't
// use the app." On first visit the app shows only the Terms and an
// Agree button — no tabs, no help content — until the visitor taps
// Agree. Agreement is recorded in localStorage only, per
// device/browser, nothing sent to the server, and never asked again
// on that device/browser. There is no way in without agreeing.
const TERMS_AGREED_KEY = "richards-resource:terms-agreed:v1";

function TermsPage({ onBack, onAgree }: { onBack?: () => void; onAgree?: () => void }) {
  return (
    <div>
      {onBack ? (
        <button type="button" onClick={onBack} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-semibold text-[var(--text)]">
          ← Back to the app
        </button>
      ) : null}
      <h1 className="font-display mt-5 text-2xl font-bold leading-snug text-[var(--text)]">Terms of Use — Richard&apos;s Resource</h1>
      <p className="mt-3 text-lg font-bold leading-relaxed text-[var(--text)]">We are here to help.</p>
      <p className="mt-3 leading-relaxed text-[var(--text)]">
        Please don&apos;t sue us for any reason, we are just here to help you. Thank you and we hope this app makes your World 🌍 A Happier Place ✌️❤️.
      </p>
      <p className="mt-1 text-lg font-bold leading-relaxed text-[var(--text)]">This is your personal journey... BUT YOU ARE NOT ALONE. Help is at your fingertips.</p>
      <p className="mt-3 leading-relaxed text-[var(--text)]">
        Richard&apos;s Resource is a free self-help app. We built it to help people who want to stop drinking, smoking,
        gambling, or using drugs, and for codependency, food, screens, and feeling unwell, and for healthy living and
        peace of mind. It is free, with no account, no name or email needed, and no judgement.
      </p>
      <p className="mt-3 leading-relaxed text-[var(--text)]">
        By using this app, you agree to these Terms. If you do not agree, please do not use the app.
      </p>
      <div className="mt-5 space-y-4">
        <section>
          <p className="font-semibold text-[var(--text)]">1. This is support, not medical advice.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            This app is general information and support only. It is not medical advice, diagnosis, or treatment, and it is
            not a substitute for your own doctor, counsellor, or addiction professional. Talk to your own doctor before
            starting an exercise programme, changing your diet, or stopping or changing any medicine, especially if you
            have a health condition or take medicines. For mental health, please seek counselling and talk to your doctor
            — reaching out is a strong step, not a weakness.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">2. In a crisis, get help now.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            If you feel unsafe, or have thoughts of harming yourself, call or text <a className="font-semibold underline" href="tel:988">988</a> in
            the United States, or call <a className="font-semibold underline" href="tel:911">911</a> or your local emergency number right away.
            Do not wait for this app. Stopping drinking heavily all at once can be dangerous — alcohol withdrawal needs
            medical supervision, so do not stop without a doctor&apos;s help.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">3. No guarantees.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            We do not promise that this app will help you stop, or that it will work for you. Everyone is different.
            What helps one person may not help another. Use the tools here as support, alongside real help from people
            you trust and professionals who know you.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">4. Your data.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            We don&apos;t share your data. This is your personal journey. Your plans, logs, and points are saved in this app
            only for you, under an anonymous device ID in your own browser. No account, no name, no email. Your check-in
            answers are never saved or sent. Your data is encrypted in transit. If you clear your browser, lose your phone,
            or someone else uses your phone, they may see what is on it, or it may be gone — please download a backup if
            that matters to you.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">5. Your responsibility.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            You are responsible for your own choices and for getting the medical help you need. Do not use this app as a
            reason to delay seeing a doctor, counsellor, or addiction professional. If a tool here does not feel right
            for you, stop using it.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">6. Donations.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            Donations are optional personal gifts to support Richard&apos;s Resource, made on Stripe&apos;s secure page. They are NOT tax
            deductible — Richard&apos;s Resource is not a charity or a tax-exempt organisation.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">7. The app as it is — errors and omissions.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            This app is provided “as it is”, without warranties of any kind. The information in it may contain errors or
            omissions, and it may be out of date. We do not promise that it is complete, accurate, or up to date, and we
            are not liable for any errors or omissions in it, or for any loss, harm, or damage that comes from using it,
            or from relying on it instead of professional help, to the fullest extent allowed by law. If you find an error,
            please tell us, and we will try to fix it.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">8. Arbitration in Grays Harbor County, Washington.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            If you have a dispute about this app, you agree to resolve it by binding arbitration in Grays Harbor County,
            Washington, under Washington law, instead of in court. You agree not to bring a class action. This clause is
            part of these Terms, and by using the app you agree to it.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">9. Changes.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            We may update these Terms and the app from time to time. The current version is the one on this page. Using
            the app after a change means you agree to the updated Terms.
          </p>
        </section>
        <section>
          <p className="font-semibold text-[var(--text)]">10. Contact.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">Richard&apos;s Resource, LLC — RichardsResource.com</p>
        </section>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[var(--dim)]">
        This is plain language, not legal advice. A lawyer should review it before it is relied on for liability.
      </p>
      {/* Contact (Richard, 2026-11-23): PO Box and email at the bottom of Terms. */}
      <address className="mt-5 text-sm not-italic leading-relaxed text-[var(--text)]">
        Richard&apos;s Resource
        <br />
        PO Box 31
        <br />
        Hoquiam, WA 98550
        <br />
        <a className="font-semibold text-[var(--accent)] underline" href="mailto:richardsresource3@gmail.com">richardsresource3@gmail.com</a>
      </address>
      {onAgree ? (
        <button type="button" onClick={onAgree} aria-label="I agree to these Terms" className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white">
          I agree to these Terms
        </button>
      ) : (
        <button type="button" onClick={onBack} className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white">
          Back to the app
        </button>
      )}
    </div>
  );
}

// Visible save status: never silent about whether work is saved.
function SaveStatusBar({ isError, lastSavedAt, pendingCount }: { isError: boolean; lastSavedAt: number | null; pendingCount: number }) {
  const mutating = useIsMutating();
  const saving = mutating > 0 || pendingCount > 0;
  return (
    <div className="felt-soft mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2.5" aria-live="polite">
      <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${isError ? "bg-[var(--crisis)]" : saving ? "bg-[var(--sun)]" : "bg-[var(--leaf)]"}`} />
      {isError ? (
        <span className="text-sm font-semibold text-[var(--text)]">Couldn't load your saved data — please check your connection and try again below.</span>
      ) : saving ? (
        <span className="text-sm font-semibold text-[var(--text)]">Saving…</span>
      ) : lastSavedAt != null ? (
        <span className="text-sm font-semibold text-[var(--text)]">All changes saved · Last saved {timeLabel(lastSavedAt)}</span>
      ) : (
        <span className="text-sm font-semibold text-[var(--text)]">All changes saved</span>
      )}
      <span className="text-sm text-[var(--dim)]">Points save automatically as you go — and again when you leave the app. Words you're still typing are kept on this phone until you save them.</span>
    </div>
  );
}

type BackupData = {
  profiles: Profile[];
  logs: LogEntry[];
  pointsByTab: { tab: PointTab; points: number }[];
  pointEvents: PointEvent[];
  dayMarks: DayMark[];
  total: number;
};

function buildBackup(data: BackupData) {
  const byTab: Partial<Record<PointTab, number>> = {};
  for (const row of data.pointsByTab) byTab[row.tab] = row.points;
  return {
    app: "Richard's Resource",
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    exportedDay: localDay(),
    note: "This file is your own copy of what you saved in Richard's Resource. We don't share your data. This is your personal journey. It contains only what the app saves: your quit plans, your logs, and your points. Your check-in answers (Feeling Unwell, Food, Screens, Longevity) are NOT in here, because the app never saves or sends them.",
    profiles: data.profiles,
    logs: data.logs,
    points: {
      total: data.total,
      byTab,
      dayMarks: data.dayMarks,
      recentEvents: data.pointEvents,
      note: "The total and the by-tab totals are your full lifetime totals — there is no maximum. recentEvents holds the 30 most recent point events, which is what the app itself keeps on hand to show you.",
    },
  };
}

function buildReadableCopy(data: BackupData): string {
  const lines: string[] = [];
  lines.push("Richard's Resource — my saved data");
  lines.push(`Saved on ${localDay()} at ${timeLabel(Date.now())}`);
  lines.push("");
  lines.push("We don't share your data. This is your personal journey. This copy is yours to keep on your phone.");
  lines.push("Check-in answers are not included — the app never saves them.");
  lines.push("");
  lines.push(`POINTS: ${data.total} total, across every tab (no maximum)`);
  for (const row of data.pointsByTab) lines.push(`  ${POINT_TAB_LABEL[row.tab]}: ${row.points}`);
  lines.push("");
  lines.push("MY PLANS");
  if (data.profiles.length === 0) lines.push("  No plans saved yet.");
  for (const p of data.profiles) {
    lines.push(`  ${CAT_LABEL[p.category]}:`);
    if (p.quitDate) lines.push(`    Quit / start date: ${p.quitDate}`);
    if (p.dailyCost != null) lines.push(`    Cost per day: $${p.dailyCost}`);
    if (p.dailyAmount) lines.push(`    How much per day: ${p.dailyAmount}`);
    if (p.planText) lines.push(`    My plan: ${p.planText}`);
    if (p.supportName) lines.push(`    Person I can call: ${p.supportName}${p.supportPhone ? ` — ${p.supportPhone}` : ""}`);
  }
  lines.push("");
  lines.push("MY LOG");
  if (data.logs.length === 0) lines.push("  Nothing logged yet.");
  for (const l of data.logs) {
    const when = new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    lines.push(`  ${when} · ${CAT_LABEL[l.category]} · ${l.kind}${l.trigger ? ` · ${l.trigger}` : ""}${l.intensity != null ? ` · ${l.intensity}/10` : ""}${l.rodeItOut != null ? (l.rodeItOut ? " · rode it out / held my boundary" : " · acted on it / boundary slipped") : ""}`);
    if (l.note) lines.push(`    ${l.note}`);
  }
  return lines.join("\n");
}

function downloadTextFile(filename: string, text: string, mime: string): boolean {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

// Save-to-phone + the full privacy / autosave explanation. Used on Home
// and on Help & Resources. Client-only: the file is built and downloaded
// in the browser; nothing new is sent anywhere.
function YourDataSection({ profiles, logs, pointEvents, dayMarks }: {
  profiles: Profile[];
  logs: LogEntry[];
  pointEvents: PointEvent[];
  dayMarks: DayMark[];
}) {
  const { byTab, total } = usePoints();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [fallback, setFallback] = useState<{ name: string; text: string } | null>(null);

  const currentData = (): BackupData => {
    const rows = (Object.keys(byTab) as PointTab[]).map((tab) => ({ tab, points: byTab[tab] ?? 0 })).filter((r) => r.points !== 0);
    return {
      profiles,
      logs,
      pointEvents,
      dayMarks,
      pointsByTab: rows,
      // The saved total is the sum of the saved by-tab totals, so the
      // file always adds up. (The big number at the top of the app can
      // be a few taps ahead for a few seconds — taps flush every few
      // seconds and again when you leave the app. `total` from context
      // is that live display number, kept for the heading below.)
      total: rows.reduce((s, r) => s + r.points, 0),
    };
  };
  void total;

  const saveJson = () => {
    const name = `richards-resource-backup-${localDay()}.json`;
    const text = JSON.stringify(buildBackup(currentData()), null, 2);
    if (downloadTextFile(name, text, "application/json")) {
      setFallback(null);
      setSavedMsg(`Saved — look for ${name} in your Downloads or Files. That file is yours to keep on this phone.`);
    } else {
      setSavedMsg(null);
      setFallback({ name, text });
    }
  };
  const saveTxt = () => {
    const name = `richards-resource-backup-${localDay()}.txt`;
    const text = buildReadableCopy(currentData());
    if (downloadTextFile(name, text, "text/plain")) {
      setFallback(null);
      setSavedMsg(`Saved — look for ${name} in your Downloads or Files. It's a plain, readable copy you can open anywhere.`);
    } else {
      setSavedMsg(null);
      setFallback({ name, text });
    }
  };

  return (
    <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--surface)] p-5">
      <h3 className="font-display text-xl font-bold text-[var(--text)]">Save my data to my phone</h3>
      <p className="mt-2 font-bold text-[var(--text)]">We don't share your data. This is your personal journey.</p>
      <p className="mt-1 leading-relaxed text-[var(--text)]">
        Not sold, not shared with advertisers, not sent to anyone else. Your quit plans, your logs, your quit dates
        and your points are saved in this app so they're here when you come back on this phone and this browser.
        There's no account and no sign-up — we never even ask your name or email.
      </p>
      <p className="mt-1 leading-relaxed text-[var(--text)]">Your data is encrypted in transit.</p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        Your check-in answers are private by design: the answers you give on Feeling Unwell (the PHQ-9 and GAD-7),
        Food (the SCOFF questions), Screens, and Longevity are <strong>never saved and never sent</strong> — they are worked out
        on your phone, in the moment, and they're not in the saved copy below either.
      </p>
      <div className="felt-soft mt-3 rounded-[var(--radius)] bg-[var(--surface-warm)] px-4 py-3">
        <p className="font-semibold text-[var(--text)]">About HIPAA — honestly</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
          HIPAA is the US health-privacy law, and it covers doctors, hospitals, clinics and health insurers. This
          app is none of those — it's a free self-help tool, not a medical service — so HIPAA does not legally apply
          here, and we won't pretend it does. What we do is follow its spirit: collect as little as we can, keep it
          only for you, and never share it.
        </p>
      </div>
      <p className="mt-3 font-semibold text-[var(--text)]">How saving works here</p>
      <ul className="mt-1.5 list-disc space-y-1.5 pl-5 leading-relaxed text-[var(--text)]">
        <li><strong>Points save automatically</strong> as you earn them — and again when you leave, close, or switch away from the app, so the last taps aren't lost.</li>
        <li><strong>Plans and logs</strong> save when you tap their Save / Log button — watch the “All changes saved” line at the top. Anything you're still typing is kept as a draft on this phone, so it's still there when you come back to finish it.</li>
        <li><strong>The honest limit:</strong> the app's saved copy lives with this app on this phone and browser. A new phone, a cleared browser, or a different browser can't find it — which is why this button matters.</li>
      </ul>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={saveJson} aria-label="Save my data to my phone as a backup file" className="felt-btn min-h-12 rounded-[var(--radius)] bg-[var(--leaf)] px-4 font-bold text-white">
          Save my data to my phone
        </button>
        <button type="button" onClick={saveTxt} aria-label="Save a readable copy of my data to my phone" className="felt-btn min-h-12 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--surface)] px-4 font-semibold text-[var(--text)]">
          Save a readable copy instead
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        The first button saves a backup file (JSON) with your plans, logs, points totals and day marks. The second
        saves the same thing as plain text you can read. Keep the file somewhere you'll find it — Downloads, Files,
        or email it to yourself.
      </p>
      {savedMsg && (
        <p className="felt-soft mt-3 rounded-[var(--radius)] bg-[var(--leaf-soft)] px-4 py-3 font-semibold text-[var(--text)]" aria-live="polite">
          {savedMsg}
        </p>
      )}
      {fallback && (
        <div className="mt-3" aria-live="polite">
          <p className="font-semibold text-[var(--text)]">
            Your phone wouldn't take the download, so here is your copy instead. Select all of it, copy it, and paste
            it somewhere safe on your phone:
          </p>
          <label className="mt-2 block text-sm font-medium text-[var(--text)]" htmlFor="backup-fallback-text">Your saved data — copy this</label>
          <textarea id="backup-fallback-text" readOnly rows={10} value={fallback.text} onFocus={(e) => e.target.select()} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]" />
        </div>
      )}
    </div>
  );
}

// Small chip shown at the top of each tab: points earned in this tab.
function TabPointsChip({ tab }: { tab: PointTab }) {
  const { byTab, lastAward } = usePoints();
  const n = byTab[tab] ?? 0;
  const recent = lastAward && lastAward.tab === tab && Date.now() - lastAward.at < 6000 ? lastAward : null;
  return (
    <div className="felt-soft mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius)] bg-[var(--amber-soft)] px-4 py-2.5" aria-live="polite">
      <span className="font-semibold text-[var(--text)]">★ {n} {n === 1 ? "point" : "points"} in this tab</span>
      {recent && recent.points > 0 && (
        <span className="text-sm font-semibold text-[var(--accent)]">+{recent.points} — {POINT_ACTION_LABEL[recent.action].toLowerCase()}. Nice work.</span>
      )}
      {recent && recent.points < 0 && (
        <span className="text-sm font-semibold text-[var(--accent)]">{recent.points} — a slip is part of recovery. You're still here, and that counts.</span>
      )}
      <span className="text-sm text-[var(--dim)]">Every tap +1 · each field you fill in +5 · a quit date +50 · each good day +100.</span>
    </div>
  );
}

/* ---------- shared helpers ---------- */

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const start = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-[var(--text)]">
        <FlowerIcon color="var(--bloom)" size={24} />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ResourceLink({ name, detail, phone, phoneLabel, href }: {
  name: string; detail: string; phone?: string; phoneLabel?: string; href?: string;
}) {
  return (
    <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-semibold text-[var(--text)]">{name}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">{detail}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {phone && (
          <a className="inline-flex min-h-9 items-center text-base font-semibold text-[var(--accent)] underline" href={`tel:${phone}`}>
            Call {phoneLabel ?? phone}
          </a>
        )}
        {href && (
          <a className="inline-flex min-h-9 items-center text-base font-semibold text-[var(--accent)] underline" href={href} target="_blank" rel="noreferrer">
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}

function CrisisStrip() {
  return (
    <div className="felt-soft rounded-[var(--radius)] bg-[var(--crisis-soft)] p-4">
      <p className="font-semibold text-[var(--text)]">In crisis right now?</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
        Call or text <a className="font-bold underline" href="tel:988">988</a> — the Suicide &amp; Crisis Lifeline, free and
        confidential, 24/7. If anyone is in immediate danger, call <a className="font-bold underline" href="tel:911">911</a>.
      </p>
    </div>
  );
}

/* ---------- sunrise & spring artwork ---------- */

// One spring flower: five petals around a golden centre, on a stem.
// Drawn inline so it stays crisp at any size and follows the theme colours.
function FlowerIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path d="M12 13v8" stroke="var(--leaf)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M12 18c-2.2 0-3.6-1.2-4-3 2 0 3.4 1 4 3zm0-1.4c.5-1.8 1.8-2.8 3.6-2.8-.3 1.7-1.6 2.7-3.6 2.8z" fill="var(--leaf)" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <circle key={deg} cx={12 + 3.4 * Math.sin((deg * Math.PI) / 180)} cy={8.6 - 3.4 * Math.cos((deg * Math.PI) / 180)} r="2.7" fill={color} />
      ))}
      <circle cx="12" cy="8.6" r="2" fill="var(--sun)" />
    </svg>
  );
}


// Small, clear icons for every tab button and Home tab card — simple
// inline SVG in the app's existing style, no new dependencies, no
// emoji. One icon per tab, same size and stroke throughout, so the
// buttons stay tidy on a phone. Colours come from the button itself
// (currentColor), so the icon works in light and dark mode.
function TabIcon({ id, size = 20 }: { id: TabId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "shrink-0",
  };
  switch (id) {
    case "home":
      // Sunrise over a house: a roof, walls, and the morning sun.
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <circle cx="17.5" cy="6.5" r="1.6" />
          <path d="M17.5 3.5v1M20 6.5h-1M15 6.5h1" />
        </svg>
      );
    case "alcohol":
      // A glass, crossed out — the drink, refused.
      return (
        <svg {...common}>
          <path d="M7 3h10l-1.2 6a4.5 4.5 0 0 1-7.6 0L7 3z" />
          <path d="M12 13.5V21M8.5 21h7" />
          <path d="M4.5 4.5l15 15" />
        </svg>
      );
    case "smoking":
      // A cigarette, crossed out — smoke included, then refused.
      return (
        <svg {...common}>
          <rect x="3" y="10" width="13" height="4.5" rx="1" />
          <path d="M16 10h5M3 10v4.5" />
          <path d="M7 6.5c0-1.2 1-1.2 1-2.4M11 6.5c0-1.2 1-1.2 1-2.4" />
          <path d="M4.5 4.5l15 15" />
        </svg>
      );
    case "gambling":
      // A die — chance, in your hand, not the machine's.
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
          <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "drugs":
      // A capsule, tilted — medicine, not a promise.
      return (
        <svg {...common}>
          <rect x="4.5" y="8.5" width="15" height="7" rx="3.5" transform="rotate(-45 12 12)" />
          <path d="M9.5 9.5l5 5" />
        </svg>
      );
    case "codependency":
      // Two hearts, overlapping — love, with a boundary between them.
      return (
        <svg {...common}>
          <path d="M8.5 20S3 15.5 3 10.8C3 8 5 6 7.4 6c1 0 1.9.5 2.6 1.3" />
          <path d="M15.5 20s5.5-4.5 5.5-9.2C21 8 19 6 16.6 6c-1 0-1.9.5-2.6 1.3" />
          <path d="M10 7.3C10.7 6.5 11.6 6 12.5 6c.9 0 1.8.5 2.5 1.3" />
        </svg>
      );
    case "food":
      // An apple with a leaf — real food, nothing counted.
      return (
        <svg {...common}>
          <path d="M12 8.5c-4.5-2-8.5.5-8.5 5 0 4 3 8.5 6 8.5 1.2 0 1.8-.6 2.5-.6s1.3.6 2.5.6c3 0 6-4.5 6-8.5 0-4.5-4-7-8.5-5z" />
          <path d="M12 8.5c0-2.5 1-4 3-4.8" />
          <path d="M12 7.5c.5-1.8 2-2.8 3.8-2.8-.3 1.7-1.6 2.7-3.8 2.8z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "screens":
      // A phone, upright — the thing this tab helps you put down.
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M10.5 5h3" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case "wellbeing":
      // A heart with a pulse — how you feel, measured honestly.
      return (
        <svg {...common}>
          <path d="M12 20.5S3.5 15.5 3.5 9.8C3.5 6.6 6 4.5 8.6 4.5c1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.6 0 5.1 2.1 5.1 5.3 0 5.7-8.5 10.7-8.5 10.7z" />
          <path d="M6.5 12h3l1.2-2.5 1.8 5 1.2-2.5h3.8" />
        </svg>
      );
    case "longevity":
      // A sprout under the sun — small, growing, alive. Hope, not hype.
      return (
        <svg {...common}>
          <path d="M12 21v-8" />
          <path d="M12 13c-4.5.3-7-1.8-7-5.5 3.5 0 6 1.5 7 5.5z" />
          <path d="M12 12c.8-3.5 3-5 6.5-5-.3 3.5-2.5 5-6.5 5z" />
          <circle cx="12" cy="4.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "peace":
      // A lotus — quiet, open, still. No one faith, no one way to be quiet.
      return (
        <svg {...common}>
          <path d="M12 4c2 2.5 2 5.5 0 8-2-2.5-2-5.5 0-8z" />
          <path d="M5.5 7.5c2.5.5 4.5 2 5.5 4.5-2.5-.5-4.5-2-5.5-4.5z" />
          <path d="M18.5 7.5c-2.5.5-4.5 2-5.5 4.5 2.5-.5 4.5-2 5.5-4.5z" />
          <path d="M4 16.5c2.5 2 5 3 8 3s5.5-1 8-3" />
        </svg>
      );
    case "resources":
      // A lifebuoy — help, thrown to you, free.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
        </svg>
      );
  }
}

// One top tab button — Home, Site Map, and every tab share this
// shape, so the Site Map is a real top button in its own right,
// not a conditional tucked inside the tab loop: Home first, Site
// Map first after Home, then the rest of the tabs, in order,
// always visible on a phone.
function NavTabButton({ active, onClick, bg, border, activeBg, activeBorder, ariaLabel, children }: {
  active: boolean;
  onClick: () => void;
  bg: string;
  border: string;
  activeBg: string;
  activeBorder: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        backgroundColor: active ? activeBg : bg,
        borderColor: active ? activeBorder : border,
      }}
      className={`felt-tab ${active ? "felt-tab-active" : ""} inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-bold text-[#2e2117]`}
    >
      {children}
    </button>
  );
}

const FLOWER_COLORS = ["#e5639e", "#f2a541", "#c2437b", "#7fb2c9", "#e8763a", "#8a63c9"];

// The Home hero scene: a sunrise over spring hills, with the sun just
// clearing the horizon and flowers scattered across the meadow. Hand-drawn
// inline SVG — no image files, nothing to load.
function SunriseHero() {
  const flowers: { x: number; y: number; color: string; s: number }[] = [
    { x: 52, y: 214, color: "#f2c41c", s: 1 },
    { x: 96, y: 204, color: "#e5639e", s: 1.1 },
    { x: 148, y: 216, color: "#ffffff", s: 0.9 },
    { x: 205, y: 206, color: "#f2c41c", s: 1.15 },
    { x: 272, y: 218, color: "#e8763a", s: 0.95 },
    { x: 338, y: 208, color: "#c2437b", s: 1 },
    { x: 402, y: 216, color: "#e5639e", s: 1.1 },
    { x: 466, y: 206, color: "#ffffff", s: 0.9 },
    { x: 528, y: 214, color: "#f2c41c", s: 1.05 },
    { x: 592, y: 204, color: "#e8763a", s: 0.95 },
    { x: 648, y: 214, color: "#e5639e", s: 1.1 },
    { x: 692, y: 206, color: "#ffffff", s: 0.9 },
  ];
  return (
    <svg viewBox="0 0 720 240" className="block h-auto w-full" role="img" aria-label="Sunrise over green spring hills dotted with flowers">
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#79aec7" />
          <stop offset="34%" stopColor="#a8cfe0" />
          <stop offset="62%" stopColor="#f3d9a4" />
          <stop offset="84%" stopColor="#f7b267" />
          <stop offset="100%" stopColor="#f0925f" />
        </linearGradient>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdf8a" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ffc95e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffc95e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="heroSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#f6a609" />
        </linearGradient>
      </defs>

      <rect width="720" height="240" fill="url(#heroSky)" />

      {/* soft morning clouds */}
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="150" cy="52" rx="52" ry="10" />
        <ellipse cx="182" cy="44" rx="34" ry="8" />
        <ellipse cx="618" cy="46" rx="46" ry="9" />
      </g>

      {/* distant birds */}
      <g fill="none" stroke="#5a4632" strokeWidth="2" strokeLinecap="round" opacity="0.75">
        <path d="M292 66q7-7 14 0q7-7 14 0" />
        <path d="M330 52q6-6 12 0q6-6 12 0" />
        <path d="M486 62q6-6 12 0q6-6 12 0" />
      </g>

      {/* the rising sun */}
      <g className="sunrise-rise">
        <circle cx="360" cy="182" r="98" fill="url(#heroGlow)" />
        <circle cx="360" cy="188" r="47" fill="url(#heroSun)" />
      </g>

      {/* rolling hills */}
      <path d="M0 170 Q 180 148 360 162 T 720 156 V240 H0 Z" fill="#93bd6d" />
      <path d="M0 198 Q 240 178 470 192 T 720 190 V240 H0 Z" fill="#5d8f4e" />

      {/* spring flowers across the front hill */}
      {flowers.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
          <path d="M0 0v10" stroke="#3e7d3a" strokeWidth="2" strokeLinecap="round" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={4.6 * Math.sin((a * Math.PI) / 180)} cy={-4.6 * Math.cos((a * Math.PI) / 180)} r="3.4" fill={f.color} />
          ))}
          <circle r="2.2" fill="#f6a609" />
        </g>
      ))}
    </svg>
  );
}

// A row of spring flowers along the bottom of the page.
function MeadowFooter({ onTerms }: { onTerms: () => void }) {
  return (
    <footer className="mt-12">
      <div className="flex items-end justify-between gap-1 px-1" aria-hidden="true">
        {FLOWER_COLORS.concat(FLOWER_COLORS).map((c, i) => (
          <FlowerIcon key={i} color={c} size={i % 3 === 0 ? 30 : 22} />
        ))}
      </div>
      <div className="border-t-4 border-[var(--leaf)] pt-3">
        <p className="text-center text-sm leading-relaxed text-[var(--dim)]">
          Every morning is a new beginning. One day, one urge, one honest moment at a time — brighter days grow from small starts.
        </p>
        <p className="mt-1 text-center font-display text-base font-bold text-[var(--accent)]">Making the world 🌎 a happier place ❤️</p>
        <p className="mt-1 text-center text-sm font-semibold text-[var(--dim)]">We don't share your data. This is your personal journey.</p>
        <div className="mt-2"><FeedbackContact /></div>
        <p className="mt-1 text-center text-xs text-[var(--dim)]">© 2026 Richard's Resource. All rights reserved.</p>
        <p className="mt-2 text-center">
          <button type="button" onClick={onTerms} className="text-sm font-semibold text-[var(--accent)] underline">Terms of Use</button>
        </p>
        <div className="mt-4 text-left"><MedicalDisclaimer /></div>
      </div>
    </footer>
  );
}

/* ---------- the pause: open-ended everywhere, step-up only on Screens ---------- */

// Sessions in this app are never cut short. Every pause except the Screens
// one is open-ended: it counts up, breathes with you, and ends only when
// you say so — nobody gets stopped mid-session, right before their aha
// moment. The Screens tab is the one deliberate exception: there, a
// 30-second step-up pause is the tool itself (30 seconds, then longer
// rungs only by choice), because the goal there is to put the phone down.
const PAUSE_STEPS = [30, 60, 120, 300] as const;

// Slow breathing for relaxation (Richard, 2026-11-10): in ~2–4 seconds,
// pause ~1 second, out ~3–6 seconds. Richard, 2026-11-14, after testing
// the live app ("the breathing is really off"): in 3, pause 1, out 4,
// pause 1 — a 9-second cycle, replacing the earlier 4 / 1 / 6 shape.
// The .breathe-circle animation in theme.css runs the same 3 / 1 / 4 / 1
// shape. Richard, 2026-11-16: the words inside the circle flashed too
// quickly once it was turned on (the 1s "pause" most of all), so while the
// breathing runs the circle shows no words at all — just the empty
// expanding/contracting circle. The caption below the circle still says
// the rhythm, and the idle words stay when it is not running.
const BREATH_IN_MS = 3000;
const BREATH_HOLD_MS = 1000;
const BREATH_OUT_MS = 4000;
const BREATH_PAUSE_MS = 1000;
const BREATH_CYCLE_MS = BREATH_IN_MS + BREATH_HOLD_MS + BREATH_OUT_MS + BREATH_PAUSE_MS;
type BreathPhase = "breathe in" | "pause" | "breathe out" | "rest";
function nextBreathPhase(p: BreathPhase): BreathPhase {
  return p === "breathe in" ? "pause" : p === "pause" ? "breathe out" : p === "breathe out" ? "rest" : "breathe in";
}
function breathPhaseMs(p: BreathPhase): number {
  return p === "breathe in" ? BREATH_IN_MS : p === "pause" ? BREATH_HOLD_MS : p === "breathe out" ? BREATH_OUT_MS : BREATH_PAUSE_MS;
}

function pauseLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds === 60) return "1 minute";
  return `${Math.round(seconds / 60)} minutes`;
}

function clockText(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function StepPause({ borderClass, buttonClass, title, hook, earlyMsg, midMsg, lateMsg, doneBody, stopLabel, onSettle, onProgress, completionExtra, mode = "open" }: {
  borderClass: string;
  buttonClass: string;
  title: string;
  hook: string;
  earlyMsg: string;
  midMsg: string;
  lateMsg: string;
  doneBody: string;
  stopLabel: string;
  onSettle?: (completedAny: boolean) => void;
  onProgress?: () => void;
  completionExtra?: ReactNode;
  mode?: "open" | "steps";
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const stepSeconds = PAUSE_STEPS[stepIdx] ?? 30;
  const [secondsLeft, setSecondsLeft] = useState<number>(PAUSE_STEPS[0] ?? 30);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("breathe in");
  const [finishedSecs, setFinishedSecs] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const [ended, setEnded] = useState(false);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (mode === "open") setElapsed((s) => s + 1);
      else setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  useEffect(() => {
    if (mode === "steps" && running && secondsLeft === 0) {
      setRunning(false);
      setBanked((b) => b + stepSeconds);
      setFinishedSecs(stepSeconds);
      progressRef.current?.();
    }
  }, [mode, running, secondsLeft, stepSeconds]);

  // Phase timing follows the same cycle as the circle: in 3s, pause
  // 1s, out 4s, pause 1s, repeat. A timeout per phase (not a fixed interval) so
  // each phase gets its own length. The circle itself shows no words while
  // running (see the note at BREATH_IN_MS) — only the idle words below.
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setPhase((p) => nextBreathPhase(p)), breathPhaseMs(phase));
    return () => clearTimeout(t);
  }, [running, phase]);

  const startStep = (idx: number) => {
    setStepIdx(idx);
    setSecondsLeft(PAUSE_STEPS[idx] ?? 30);
    setFinishedSecs(null);
    setRunning(true);
  };

  const endOpenPause = () => {
    setRunning(false);
    setEnded(true);
    if (elapsed >= 5) progressRef.current?.();
    if (onSettle) onSettle(elapsed > 0);
  };

  // Richard, 2026-11-16: while the circle is running it shows a static
  // 🛑 inside it — tap the circle to stop, the same stop as the button
  // below. Open mode ends the pause; steps mode stops the rung.
  const stopPause = () => {
    if (mode === "open") endOpenPause();
    else {
      setRunning(false);
      onSettle?.(banked > 0);
    }
  };

  const restartOpenPause = () => {
    setElapsed(0);
    setEnded(false);
    setRunning(true);
  };

  const frac = mode === "open"
    ? (elapsed < 45 ? 0.2 : elapsed < 180 ? 0.6 : 0.9)
    : (stepSeconds > 0 ? (stepSeconds - secondsLeft) / stepSeconds : 0);
  const message = frac < 0.4 ? earlyMsg : frac < 0.8 ? midMsg : lateMsg;
  const showHook = mode === "open"
    ? elapsed === 0 && !running && !ended
    : banked === 0 && finishedSecs == null && !running && secondsLeft === stepSeconds;
  const longerSteps = PAUSE_STEPS.map((secs, idx) => ({ secs, idx })).filter(({ idx }) => idx > stepIdx);

  return (
    <div className={`felt-card rounded-[var(--radius)] border-2 ${borderClass} bg-[var(--surface)] p-5 text-center`}>
      <p className="font-display text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--dim)]">
        {mode === "open"
          ? (ended
              ? `You stayed ${clockText(elapsed)} — exactly as long as you needed.`
              : "No time limit — this pause runs until you end it.")
          : <>This pause: {pauseLabel(stepSeconds)}{banked > 0 ? ` · banked so far: ${clockText(banked)}` : ""}</>}
      </p>
      {showHook && <p className="mx-auto mt-3 max-w-md font-medium leading-relaxed text-[var(--text)]">{hook}</p>}
      <div className="mx-auto mt-5 flex h-36 w-36 items-center justify-center">
        {running ? (
          <button type="button" aria-label="Stop breathing" onClick={stopPause} className="breathe-circle sun-glow flex h-32 w-32 cursor-pointer items-center justify-center rounded-full bg-[#ffd971]">
            <span aria-hidden="true" className="text-4xl">🛑</span>
          </button>
        ) : (
          <div className="breathe-circle sun-glow flex h-32 w-32 items-center justify-center rounded-full bg-[#ffd971] [animation-play-state:paused]">
            <span className="px-3 text-sm font-semibold text-[#7c2d12]">breathe with the circle</span>
          </div>
        )}
      </div>
      <p className="mb-4 mt-1 text-sm text-[var(--dim)]">Slow and easy: in… 2, 3 — pause — out… 2, 3, 4 — pause.</p>
      <p className="text-4xl font-bold tabular-nums text-[var(--text)]" aria-live="polite">
        {mode === "open" ? clockText(elapsed) : clockText(secondsLeft)}
      </p>

      {mode === "open" && !ended && (
        <>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--dim)]">{message}</p>
          {!running && (
            <button type="button" onClick={() => setRunning(true)} className={`felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] ${buttonClass} px-4 text-base font-semibold text-white`}>
              {elapsed === 0 ? "Begin — stay as long as you need" : `Keep going — ${clockText(elapsed)} so far`}
            </button>
          )}
          {!running && elapsed > 0 && (
            <button type="button" onClick={endOpenPause} className="mt-2 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)]">
              🛑 {stopLabel}
            </button>
          )}
          {running && (
            <button type="button" onClick={endOpenPause} className="mt-4 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)]">
              🛑 {stopLabel}
            </button>
          )}
        </>
      )}

      {mode === "open" && ended && (
        <div className="mt-3" aria-live="polite">
          <p className="font-display text-lg font-semibold text-[var(--accent)]">You stayed {clockText(elapsed)} — and you chose when to stop.</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--dim)]">{doneBody}</p>
          {completionExtra}
          <button type="button" onClick={restartOpenPause} className={`felt-btn mt-4 min-h-11 w-full rounded-[var(--radius)] ${buttonClass} px-4 font-semibold text-white`}>
            Begin again — no limit
          </button>
          {!onSettle && <p className="mt-3 text-sm text-[var(--dim)]">Leaving here is fine too. This counted — completely.</p>}
        </div>
      )}

      {mode === "steps" && finishedSecs == null && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--dim)]">{message}</p>}
      {mode === "steps" && !running && finishedSecs == null && secondsLeft > 0 && (
        <button type="button" onClick={() => setRunning(true)} className={`felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] ${buttonClass} px-4 text-base font-semibold text-white`}>
          {secondsLeft === stepSeconds ? `Start — ${pauseLabel(stepSeconds)}` : `Keep going — ${clockText(secondsLeft)} left`}
        </button>
      )}
      {mode === "steps" && running && (
        <button type="button" onClick={() => { setRunning(false); onSettle?.(banked > 0); }} className="mt-4 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)]">
          🛑 {stopLabel}
        </button>
      )}
      {mode === "steps" && finishedSecs != null && (
        <div className="mt-3" aria-live="polite">
          <p className="font-display text-lg font-semibold text-[var(--accent)]">{pauseLabel(finishedSecs)} — done.</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--dim)]">{doneBody}</p>
          {completionExtra}
          {longerSteps.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-[var(--text)]">Want to go further? Only if you choose to:</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {longerSteps.map(({ secs, idx }) => (
                  <button key={secs} type="button" onClick={() => startStep(idx)} className={`felt-btn min-h-11 rounded-[var(--radius)] ${buttonClass} px-4 font-semibold text-white`}>
                    Go further — {pauseLabel(secs)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => startStep(stepIdx)} className={`felt-btn mt-4 min-h-11 w-full rounded-[var(--radius)] ${buttonClass} px-4 font-semibold text-white`}>
              Run {pauseLabel(stepSeconds)} again
            </button>
          )}
          {onSettle ? (
            <button type="button" onClick={() => onSettle(true)} className="mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] px-4 font-semibold text-[var(--text)]">
              I'm done — log how it went
            </button>
          ) : (
            <p className="mt-3 text-sm text-[var(--dim)]">Or stop here. This counted — completely.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- calming breathing: on every tab ---------- */

// Richard (2026-11-10): every tab should have the calming breathing
// exercise — not hidden behind a pause or a button, but right there on
/* ---------- donations: free app, optional gift, not tax deductible ---------- */

// Richard asked for a donation option (2026-11-10) and was clear it is
// NOT tax deductible. Live since 2026-11-17: donations go through a
// Stripe Payment Link (live account "Richard's Resource", personal
// account in Richard Vessey's name; statement descriptor is
// "RICHARDS RESOURCE" — Stripe would not allow "RR Donation"). The link
// is "Customers choose what to pay", preset $10, so the visitor picks
// the amount on Stripe's own secure page — $5, $10, $25, or any amount.
// This section never asks for or collects card details here; the green
// button is a plain link to Stripe, opening in a new tab.
const DONATION_URL = "https://buy.stripe.com/aFa5kD8QD4eh974g8K0kE00";
function DonationSection() {
  return (
    <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--surface-warm)] p-5">
      <h3 className="flex items-center gap-2 font-display text-xl font-bold text-[var(--text)]">
        <FlowerIcon color="var(--bloom)" size={24} />
        Support Richard's Resource
      </h3>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        Richard's Resource is free — and it will stay free, whether or not you give. If it helped you, or helped
        someone you love, and you'd like to help keep it free and running for the next person, you can make a small
        donation as a gift toward its costs.
      </p>
      <div className="felt-soft mt-3 rounded-[var(--radius)] bg-[var(--amber-soft)] px-4 py-3">
        <p className="font-bold text-[var(--text)]">Please know: donations are NOT tax deductible.</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
          Richard's Resource is not a charity or a tax-exempt organization, so a donation here is a personal gift —
          not a charitable contribution you can deduct on your taxes.
        </p>
      </div>
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        You choose the amount on Stripe's secure page — $5, $10, $25, or any amount you like.
      </p>
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noreferrer"
        className="felt-btn mt-4 flex min-h-12 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--leaf)] px-4 text-center text-base font-bold text-white"
      >
        Donate securely with Stripe
      </a>
      <p className="mt-2 text-center text-sm text-[var(--dim)]">
        You'll pay on Stripe's secure page. We never ask for card details here, and your donation shows on your
        statement as RICHARDS RESOURCE.
      </p>
    </div>
  );
}

// the tab itself. This is that one shared exercise, on the same rhythm
// as everywhere else in the app: in 3 seconds, pause 1, out 4, pause 1.
// It runs for as many breaths as you want and ends only when you end
// it; nothing is saved and no points ride on finishing it (your taps
// still earn their +1 like everywhere in the app).
function CalmingBreathing() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("breathe in");
  const [breaths, setBreaths] = useState(0);
  const [finished, setFinished] = useState(false);
  // Calm tone (Richard, 2026-11-12): optional, OFF by default. "calm"
  // is two soft tones ~10 Hz apart, "sleepy" ~6 Hz apart, one per ear.
  // No medical claims — it doesn't change brainwaves or promise calm
  // or sleep; it's just a soft sound to breathe along with. It starts
  // only when the breathing starts (after a tap, never on load) and
  // stops the moment the breathing stops or you leave the tab.
  const [tone, setTone] = useState<CalmToneKind | "off">("off");
  // Calm-tone volume (Richard, 2026-11-13): the tone was a whisper at
  // gain 0.05 — it now plays at 0.22 by default, and this slider lets
  // the visitor set it from silent (0) to 0.4, in the app. The tone
  // is still off unless a tone is chosen, and sound still follows
  // the phone's volume and silent switch.
  const [toneVolume, setToneVolume] = useState(55);
  useEffect(() => {
    sounds.setCalmToneVolume((toneVolume / 100) * 0.4);
  }, [toneVolume]);

  useEffect(() => {
    if (!running || tone === "off") return;
    sounds.startCalmTone(tone);
    return () => sounds.stopCalmTone();
  }, [running, tone]);
  useEffect(() => () => sounds.stopCalmTone(), []);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (phase === "breathe out") setBreaths((b) => b + 1);
      setPhase((p) => nextBreathPhase(p));
    }, breathPhaseMs(phase));
    return () => clearTimeout(t);
  }, [running, phase]);

  const begin = () => {
    setPhase("breathe in");
    setFinished(false);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    setFinished(true);
  };

  return (
    <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-center">
      <p className="font-display text-lg font-semibold text-[var(--text)]">Breathe and settle</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--dim)]">
        A slow breath calms the body down, whatever this tab is asking of you. Breathe with the circle — no hurry, no goal, just this breath.
      </p>
      <div className="mx-auto mt-5 flex h-36 w-36 items-center justify-center">
        {running ? (
          <button type="button" aria-label="Stop breathing" onClick={stop} className="breathe-circle sun-glow flex h-32 w-32 cursor-pointer items-center justify-center rounded-full bg-[#ffd971]">
            <span aria-hidden="true" className="text-4xl">🛑</span>
          </button>
        ) : (
          <div className="breathe-circle sun-glow flex h-32 w-32 items-center justify-center rounded-full bg-[#ffd971] [animation-play-state:paused]">
            <span className="px-3 text-sm font-semibold text-[#7c2d12]">breathe with the circle</span>
          </div>
        )}
      </div>
      <p className="mb-4 mt-1 text-sm text-[var(--dim)]">Slow and easy: in… 2, 3 — pause — out… 2, 3, 4 — pause.</p>
      <div className="mx-auto mb-4 max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] px-3 py-3 text-left">
        <p className="text-sm font-semibold text-[var(--text)]">Calm tone — optional, off unless you choose it</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
          A soft tone in your ears while you breathe — two gentle notes, one per ear. It doesn&apos;t change your
          brainwaves and promises nothing medical; it&apos;s just a calm sound. It plays only while the breathing
          runs, and stops when it stops. It follows your phone&apos;s volume and silent switch.
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Calm tone for breathing">
          {([
            ["off", "Tone off"],
            ["calm", "Calm tone"],
            ["sleepy", "Sleepy tone"],
          ] as [CalmToneKind | "off", string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tone === value}
              aria-label={`${label} — ${value === "off" ? "no sound" : "soft tone while breathing"}`}
              onClick={() => setTone(value)}
              className={`min-h-11 rounded-[var(--radius)] px-3 text-sm font-semibold ${tone === value ? "felt-btn bg-[var(--accent)] text-white" : "border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tone !== "off" && !running && (
          <p className="mt-2 text-sm text-[var(--dim)]">Tone chosen — it will play when you begin breathing, and stop when you stop.</p>
        )}
        {tone !== "off" && running && (
          <p className="mt-2 text-sm font-medium text-[var(--text)]" aria-live="polite">Playing the {tone === "calm" ? "calm" : "sleepy"} tone — it stops when the breathing stops.</p>
        )}
        <div className="mt-3">
          <label htmlFor="calm-tone-volume" className="text-sm font-semibold text-[var(--text)]">Calm tone volume</label>
          <input
            id="calm-tone-volume"
            type="range"
            min={0}
            max={100}
            value={toneVolume}
            onChange={(e) => setToneVolume(Number(e.target.value))}
            aria-label="Calm tone volume"
            className="mt-1 w-full"
          />
          <p className="mt-1 text-sm text-[var(--dim)]">This is the tone&apos;s own volume, inside the app — sound still follows your phone&apos;s volume and silent switch.</p>
        </div>
      </div>
      {breaths > 0 && (
        <p className="mb-3 text-sm font-medium text-[var(--text)]" aria-live="polite">
          {breaths} slow {breaths === 1 ? "breath" : "breaths"} so far{finished ? " — nicely done." : "."}
        </p>
      )}
      {!running && !finished && (
        <button type="button" onClick={begin} aria-label="Begin calming breathing" className="felt-btn min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 text-base font-semibold text-white">
          Begin calming breathing
        </button>
      )}
      {running && (
        <button type="button" onClick={stop} aria-label="Stop calming breathing" className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)]">
          🛑 Stop here — I've settled enough
        </button>
      )}
      {!running && finished && (
        <div aria-live="polite">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--dim)]">
            That's the whole exercise: one slow breath at a time, and you can come back to it whenever this tab gets heavy.
          </p>
          <button type="button" onClick={begin} aria-label="Begin calming breathing again" className="felt-btn mt-3 min-h-11 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white">
            Breathe again
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- tab welcomes: the first thing each tab opens with ---------- */

// A welcome is what greets you the moment a tab opens — different in
// every tab, matched to that tab's struggle, and interactive on purpose:
// one small action you take right away, which makes the next step (the
// tools, the plan, the log below) feel worth taking. The goal is not
// decoration; it is to keep a person in the tab long enough to get well.
// Each welcome is brief, can be tucked away, and never blocks the help
// underneath it.
function HookShell({ pastelBg, pastelBorder, title, intro, children }: {
  pastelBg: string; pastelBorder: string; title: string; intro: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <div className="mb-5">
        <button type="button" onClick={() => setOpen(true)} className="min-h-10 text-sm font-semibold text-[var(--accent)] underline">
          Show this tab's welcome again
        </button>
      </div>
    );
  }
  return (
    <div className="felt-card mb-6 rounded-[var(--radius)] border-2 p-5" style={{ backgroundColor: pastelBg, borderColor: pastelBorder }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#6f5a44]">Start here</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Hide this welcome" className="min-h-9 shrink-0 px-2 text-sm font-medium text-[#6f5a44] underline">
          Skip for now
        </button>
      </div>
      <p className="font-display mt-1 text-2xl font-bold leading-snug text-[#2e2117]">{title}</p>
      <p className="mt-1 leading-relaxed text-[#4a3826]">{intro}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// Alcohol: the decision is made by the clear-headed morning self, not
// negotiated at 6pm. Picking today's decision is the welcome.
function AlcoholHook() {
  const options = [
    { id: "house", label: "Nothing in the house tonight", result: "Good call. If it isn't there at 6pm, 6pm-you doesn't have to win an argument — the decision is already made. That's not willpower; that's strategy." },
    { id: "ritual", label: "A different 6pm ritual, ready to go", result: "A walk, a shower, a meal, a call — whatever it is, having it ready beats improvising at the hardest hour of the day. Your clear-headed self just did 6pm-you a real favour." },
    { id: "person", label: "I'll tell my person today", result: "Secrecy is alcohol's best friend — and you just ended it for today. A craving that has to survive a phone call first is a much weaker craving." },
  ] as const;
  const [picked, setPicked] = useState<string | null>(null);
  const pickedResult = options.find((o) => o.id === picked)?.result;
  return (
    <HookShell pastelBg="#fdeeda" pastelBorder="#d99a4e" title="Decide now, while you're clear-headed" intro="Alcohol wins its arguments at 6pm, not at this moment. So make today's decision now — pick one, and let it stand all day.">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Pick today's alcohol decision">
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={picked === o.id} onClick={() => setPicked(o.id)}
            className={`min-h-12 rounded-xl px-3 font-semibold ${picked === o.id ? "felt-btn bg-[var(--accent)] text-white" : "felt-soft border-2 border-[#d99a4e] bg-white/70 text-[#2e2117]"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {pickedResult && (
        <div aria-live="polite">
          <p className="mt-3 leading-relaxed text-[#2e2117]">{pickedResult}</p>
          <button type="button" onClick={() => document.getElementById("plan-form-alcohol")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="felt-btn mt-3 min-h-11 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white">
            Lock it in — write it in my plan below ↓
          </button>
        </div>
      )}
    </HookShell>
  );
}

// Smoking: a cigarette promises a pause and a breath. Take the real one
// first — one slow breath, on the tab's own breathing circle.
function SmokingHook() {
  const [phase, setPhase] = useState<"idle" | "breathing" | "done">("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
  const start = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("breathing");
    // One full slow cycle on the shared rhythm — in 3, pause 1, out 4,
    // pause 1 — with the circle showing no words while it runs.
    timersRef.current.push(setTimeout(() => setPhase("done"), BREATH_CYCLE_MS));
  };
  // Richard, 2026-11-16: while the circle is breathing it shows a static
  // 🛑 inside it — tap the circle to stop, the same end as the cycle
  // finishing on its own (goes to "that's real air").
  const stopBreath = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("done");
  };
  return (
    <HookShell pastelBg="#dceef7" pastelBorder="#5b9bbf" title="Take the breath the cigarette promises you" intro="Most of what a cigarette sells is this: a pause, and one deep breath. That part was always free. Try it — breathe with the circle, slowly in, a short hold, then a long slow out, once through.">
      <div className="flex flex-col items-center">
        {phase === "breathing" ? (
          <button type="button" aria-label="Stop breathing" onClick={stopBreath} className="breathe-circle sun-glow flex h-28 w-28 cursor-pointer items-center justify-center rounded-full bg-[#ffd971]">
            <span aria-hidden="true" className="text-3xl">🛑</span>
          </button>
        ) : (
          <div className="breathe-circle sun-glow flex h-28 w-28 items-center justify-center rounded-full bg-[#ffd971] [animation-play-state:paused]" aria-hidden="true">
            <span className="px-3 text-center text-sm font-semibold text-[#7c2d12]">{phase === "done" ? "that's real air" : "one clean breath"}</span>
          </div>
        )}
        {phase === "idle" && (
          <button type="button" onClick={start} className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--sky-deep)] px-4 text-base font-semibold text-white">
            Breathe with me — one slow breath, about 9 seconds
          </button>
        )}
        {phase === "breathing" && <p className="mt-4 text-sm font-medium text-[#2e2117]" aria-live="polite">In as it grows… pause… out, slow and long, as it shrinks. Nothing to buy, nothing to light.</p>}
        {phase === "done" && (
          <div aria-live="polite" className="mt-4 text-center">
            <p className="leading-relaxed text-[#2e2117]">You just took the part of smoking that actually helps — the pause and the breath — and left the part that harms. Every craving below can be ridden out exactly this way.</p>
            <button type="button" onClick={start} className="mt-3 min-h-11 rounded-[var(--radius)] border-2 border-[#5b9bbf] px-4 font-semibold text-[#2e2117]">Breathe it again</button>
          </div>
        )}
      </div>
    </HookShell>
  );
}

// Gambling: Richard's welcome, exactly as he pictured it — a slot machine
// the user plays that lands on WINNER, three bars, each reading FREEDOM.
const FREEDOM_SPIN_WORDS = ["CHANCE", "LUCK", "CHASE", "ALMOST", "ONE MORE", "JACKPOT?", "NEAR MISS", "BORROWED"];
function GamblingHook() {
  const [display, setDisplay] = useState<string[]>(["?", "?", "?"]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef<Set<number>>(new Set());
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);
  const pull = () => {
    if (spinning) return;
    setWinner(false);
    setSpinning(true);
    stoppedRef.current = new Set();
    intervalRef.current = setInterval(() => {
      setDisplay((prev) => prev.map((_v, i) => (stoppedRef.current.has(i) ? "FREEDOM" : FREEDOM_SPIN_WORDS[Math.floor(Math.random() * FREEDOM_SPIN_WORDS.length)] ?? "CHASE")));
    }, 90);
    const stopAt = (idx: number, ms: number) => timersRef.current.push(setTimeout(() => {
      stoppedRef.current.add(idx);
      setDisplay((d) => d.map((v, i) => (stoppedRef.current.has(i) ? "FREEDOM" : v)));
      if (idx === 2) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplay(["FREEDOM", "FREEDOM", "FREEDOM"]);
        setSpinning(false);
        setWinner(true);
      }
    }, ms));
    stopAt(0, 1000); stopAt(1, 1500); stopAt(2, 2000);
  };
  return (
    <HookShell pastelBg="#fef3c7" pastelBorder="#c9a227" title="One machine in this tab pays out every time" intro="Go ahead — pull it. This is the spin the whole tab is about.">
      <div className="rounded-[var(--radius)] border-2 border-[#c9a227] bg-[#2e2117] p-4">
        {winner ? (
          <p className="text-center font-display text-3xl font-black tracking-wide text-[#ffd35c]" aria-live="polite">★ WINNER ★</p>
        ) : (
          <p className="text-center font-display text-lg font-bold tracking-wide text-[#f9de81]">{spinning ? "Spinning…" : "The Freedom Machine"}</p>
        )}
        <div className="mt-3 flex flex-col gap-2" aria-label={winner ? "Reels showing FREEDOM, FREEDOM, FREEDOM — winner" : "Freedom slot machine reels"}>
          {display.map((w, i) => (
            <div key={i} className={`flex min-h-12 w-full items-center justify-center rounded-lg px-3 py-3 text-center font-display text-base font-black tracking-[0.2em] sm:text-lg ${winner || w === "FREEDOM" ? "bg-[#ffd35c] text-[#2e2117]" : "bg-[#fef3c7] text-[#6b5310]"}`}>
              {w}
            </div>
          ))}
        </div>
        <button type="button" onClick={pull} disabled={spinning} aria-label="Pull the Freedom slot machine" className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[#c9a227] px-4 text-base font-bold text-white disabled:opacity-60">
          {spinning ? "…" : winner ? "Pull it again — it lands the same" : "Pull for freedom"}
        </button>
      </div>
      {winner && (
        <div aria-live="polite">
          <p className="mt-3 leading-relaxed text-[#2e2117]">
            <strong>FREEDOM · FREEDOM · FREEDOM.</strong> The only jackpot that keeps paying after you walk away — your money,
            your hours, and your peace of mind, back in your own pocket. No casino will ever line those three up for you.
            Now scroll down and try the Honest Slot Machine below: it shows you the math the real ones run on, and why
            this spin is the only sure thing in gambling.
          </p>
        </div>
      )}
    </HookShell>
  );
}

// Drugs: not "fix your life" — just name the one thing this hour needs.
function DrugsHook() {
  const needs = [
    { id: "safety", label: "To stay safe right now", result: "Then safety is the whole plan for this hour, and that's enough. If opioids are anywhere nearby: don't use alone, keep naloxone (Narcan) close, and know that 911 is a medical call. The overdose box at the top of this tab has the details — read it first." },
    { id: "craving", label: "To ride out a craving", result: "Cravings for most drugs crest and fall like a wave — brutal at the peak, gone faster than they promise. Use the open-ended pause below: it has no time limit and ends only when you end it. Then log what triggered it; patterns you can see are patterns you can dodge." },
    { id: "body", label: "Sleep, food, water — the basics", result: "Especially with stimulants, a crash can feel like a craving when it's really exhaustion and hunger. Eat something, drink water, and rest if you can before deciding anything. Your body has been carrying this — feed it first." },
    { id: "person", label: "A person, not a lecture", result: "Call SAMHSA at 1-800-662-4357 — free, confidential, 24/7, and they route to local help without judgment. Or call the person in your plan below. Saying 'this hour is hard' out loud makes the next hour easier." },
  ] as const;
  const [picked, setPicked] = useState<string | null>(null);
  const result = needs.find((n) => n.id === picked)?.result;
  return (
    <HookShell pastelBg="#ece4f8" pastelBorder="#8a6fc9" title="Forget the whole mountain. What does this hour need?" intro="Recovery isn't a lifetime decision remade every minute — it's this hour, handled. Tell the truth about which one this is:">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What do you need most this hour?">
        {needs.map((n) => (
          <button key={n.id} type="button" role="radio" aria-checked={picked === n.id} onClick={() => setPicked(n.id)}
            className={`min-h-12 rounded-xl px-3 font-semibold ${picked === n.id ? "felt-btn bg-[#6d4fa1] text-white" : "felt-soft border-2 border-[#8a6fc9] bg-white/70 text-[#2e2117]"}`}>
            {n.label}
          </button>
        ))}
      </div>
      {result && <p className="mt-3 leading-relaxed text-[#2e2117]" aria-live="polite">{result}</p>}
    </HookShell>
  );
}

// Codependency: a boundary you can hear. Cycle through real sentences
// that love without rescuing.
const BOUNDARY_EXAMPLES = [
  "“I love you, and I won't lend money for this. I will drive you to a meeting any time you ask.”",
  "“I can't call your boss for you again. What I can do is sit with you while you make the call.”",
  "“I'm going to my Al-Anon meeting tonight, and to bed on time — even if the evening goes sideways.”",
  "“Your recovery is yours, and I'm cheering for it. My job is my side of the street — and I'm going to work on it.”",
];
function CodependencyHook() {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  return (
    <HookShell pastelBg="#fbe3ee" pastelBorder="#c95a8a" title="Hear what a loving boundary actually sounds like" intro="Boundaries aren't walls or threats. They're one honest sentence about what you will do. Tap through a few — notice how each one loves the person and still lets go of the rescue.">
      {!seen ? (
        <button type="button" onClick={() => setSeen(true)} className="felt-btn min-h-12 w-full rounded-[var(--radius)] bg-[#c95a8a] px-4 text-base font-semibold text-white">
          Show me one
        </button>
      ) : (
        <div aria-live="polite">
          <p className="rounded-xl bg-white/70 p-4 font-display text-lg font-semibold leading-relaxed text-[#2e2117]">{BOUNDARY_EXAMPLES[idx]}</p>
          <button type="button" onClick={() => { const phrase = BOUNDARY_EXAMPLES[idx]; if (phrase) speakText(phrase); }} aria-label="Hear this boundary read aloud" className="felt-btn mt-3 min-h-11 w-full rounded-[var(--radius)] bg-[#c95a8a] px-4 font-semibold text-white">
            🔊 Hear it read aloud
          </button>
          <p className="mt-2 text-sm leading-relaxed text-[#2e2117]">
            Read aloud by your phone&apos;s own voice — tap to hear, nothing is recorded or sent. We ask for a soft
            female voice where your phone has one; if it doesn&apos;t, your phone uses its best voice instead.
          </p>
          <button type="button" onClick={() => { stopSpeaking(); setIdx((i) => (i + 1) % BOUNDARY_EXAMPLES.length); }} className="felt-btn mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[#c95a8a] bg-white/60 px-4 font-semibold text-[#2e2117]">
            Hear another ({idx + 1} of {BOUNDARY_EXAMPLES.length})
          </button>
          <p className="mt-3 leading-relaxed text-[#2e2117]">When one of these sounds like your situation, the boundary log below is where you practice your own version — in your words, one moment at a time.</p>
        </div>
      )}
    </HookShell>
  );
}

// Food: your body is not the enemy. Name one thing it did for you today.
function FoodHook() {
  const thanks = [
    { id: "heart", label: "It kept my heart beating", result: "All day, without being asked. That's not a body failing you — that's a body working for you, even in a hard season." },
    { id: "carried", label: "It carried me through today", result: "Everywhere you went, it went with you. It deserves fuel and kindness for that — not punishment." },
    { id: "healing", label: "It is trying to heal", result: "Given regular food, rest, and time, bodies are remarkably good at repair. Recovery is mostly letting it do that job, with support." },
    { id: "honest", label: "Honestly — it's hard to feel grateful", result: "That's completely okay, and very common. You don't have to love your body today. Neutral is enough: it's the body you have, and it deserves food, rest, and care either way. That's what this tab is for." },
  ] as const;
  const [picked, setPicked] = useState<string | null>(null);
  const result = thanks.find((t) => t.id === picked)?.result;
  return (
    <HookShell pastelBg="#eef4cf" pastelBorder="#7d9426" title="First, one thing your body did right today" intro="Before the check-in, before anything hard: this tab starts on your body's side. Pick the one that's true — even a little:">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="One thing your body did right today">
        {thanks.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={picked === t.id} onClick={() => setPicked(t.id)}
            className={`min-h-12 rounded-xl px-3 font-semibold ${picked === t.id ? "felt-btn bg-[var(--leaf)] text-white" : "felt-soft border-2 border-[#7d9426] bg-white/70 text-[#2e2117]"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {result && <p className="mt-3 leading-relaxed text-[#2e2117]" aria-live="polite">{result}</p>}
    </HookShell>
  );
}

// Screens: the welcome is looking up. Ten seconds of the real world,
// counted here, so the tab proves its point before it teaches anything.
// Then 30 seconds, the next rung (Richard, 2026-11-13): "You did 10,
// try 30" — progress you can feel, step by step. Sound only, Richard
// 2026-11-14: "Sound only on screen look away please." — no spoken
// counting (the voice was too variable), just a soft two-note sound
// when 10 or 30 seconds is up. No 60-second timer: the 60 was
// a mix-up with the breathing, and 30 is the rung Richard chose.
function ScreensHook() {
  const [left, setLeft] = useState<number | null>(null);
  const [doneLooking, setDoneLooking] = useState(false);
  const [doneDuration, setDoneDuration] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };
  useEffect(() => () => clearTimers(), []);
  const start = (seconds: 10 | 30) => {
    clearTimers();
    // Warm up the audio engine from this tap, so the "time's up"
    // sound at the end can actually be heard.
    sounds.prepareAudio();
    setDoneLooking(false);
    setDoneDuration(null);
    setLeft(seconds);
    intervalRef.current = setInterval(() => {
      setLeft((s) => {
        if (s == null || s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          sounds.playDoneSound();
          setDoneDuration(seconds);
          setDoneLooking(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };
  return (
    <HookShell pastelBg="#e4ecf3" pastelBorder="#6486a5" title="Quick test: can you look up?" intro="This is the one tab that wants less of your attention. Prove it works: tap the button, look up from the screen at the real room, the real sky. Ten seconds first, then 30 when you're ready.">
      <p className="mb-3 text-sm leading-relaxed text-[#2e2117]">A soft sound plays when your time is up — no counting out loud, just look up and listen for it.</p>
      {left == null && !doneLooking && (
        <button type="button" onClick={() => start(10)} className="felt-btn min-h-12 w-full rounded-[var(--radius)] bg-[#6486a5] px-4 text-base font-semibold text-white">
          Look up now — 10 seconds
        </button>
      )}
      {left != null && left > 0 && (
        <p className="text-center" aria-live="polite">
          <span className="font-display text-5xl font-black tabular-nums text-[#2e2117]">{left}</span>
          <span className="mt-1 block text-sm font-medium text-[#2e2117]">Eyes up — the room, a window, the light. I&apos;m still here.</span>
        </p>
      )}
      {doneLooking && (
        <div aria-live="polite" className="text-center">
          <p className="leading-relaxed text-[#2e2117]">
            {doneDuration === 30
              ? "Thirty seconds back — that was real life, and it was there the whole time. You did 10, then you did 30. That's progress you can feel."
              : "That was real life — it was there the whole time, and it didn't ask you to scroll it. Ten seconds back is how the rest comes back too. The short check-in below shows where your screen time is really going."}
          </p>
          {doneDuration === 10 && (
            <button type="button" onClick={() => start(30)} className="felt-btn mt-3 min-h-12 w-full rounded-[var(--radius)] bg-[#6486a5] px-4 text-base font-semibold text-white">
              You did 10, try 30
            </button>
          )}
          <button type="button" onClick={() => start(10)} className="mt-3 min-h-11 rounded-[var(--radius)] border-2 border-[#6486a5] px-4 font-semibold text-[#2e2117]">Look up again — 10 seconds</button>
        </div>
      )}
    </HookShell>
  );
}

// Feeling Unwell: name your inner weather — then measure it properly
// with the check-ins below. Weather is a moment, not a verdict.
function WellbeingHook() {
  const weather = [
    { id: "stormy", label: "Stormy", result: "Stormy is a reason to be gentle and to not weather this alone. Answer the check-ins below honestly — and if the storm includes thoughts of harming yourself, the 988 box right below them is there for exactly this moment." },
    { id: "rainy", label: "Rainy and low", result: "Low and heavy counts. The PHQ-9 below is the same check-in a doctor would hand you — a score gives this weather a name and a number you can act on." },
    { id: "cloudy", label: "Cloudy and on edge", result: "Grey and wired at once is very common — low mood and anxiety travel together. Both check-ins below are here for that exact mix; together they take about three minutes." },
    { id: "mixed", label: "Mixed — sun and cloud", result: "Good moments and hard ones in the same week can still be worth measuring. The check-ins below cover the last two weeks, good days included." },
    { id: "clear", label: "Mostly clear", result: "Glad to hear it. A clear-day score is still useful — it's a baseline. If the weather turns later, you'll know what changed, and so will your doctor." },
  ] as const;
  const [picked, setPicked] = useState<string | null>(null);
  const result = weather.find((w) => w.id === picked)?.result;
  return (
    <HookShell pastelBg="#d3f2e6" pastelBorder="#3d9a78" title="What's your inner weather right now?" intro="No wrong answer — this is just the honest sky report before we measure anything. Pick the closest one:">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your inner weather right now">
        {weather.map((w) => (
          <button key={w.id} type="button" role="radio" aria-checked={picked === w.id} onClick={() => setPicked(w.id)}
            className={`min-h-11 rounded-full px-4 font-semibold ${picked === w.id ? "felt-btn bg-[#2e7d5f] text-white" : "felt-soft border-2 border-[#3d9a78] bg-white/70 text-[#2e2117]"}`}>
            {w.label}
          </button>
        ))}
      </div>
      {result && (
        <div aria-live="polite">
          <p className="mt-3 leading-relaxed text-[#2e2117]">{result}</p>
          <p className="mt-2 font-medium text-[#2e2117]">Weather is a moment. The check-ins below measure the last two weeks — that's the part worth bringing to a doctor.</p>
        </div>
      )}
    </HookShell>
  );
}

function UrgeSurf({ onDone }: { onDone: (rodeItOut: boolean) => void }) {
  return (
    <StepPause
      borderClass="border-[var(--accent)]"
      buttonClass="bg-[var(--accent)]"
      title="Ride out this urge"
      hook="No clock on you here. This pause runs as long as you need — an urge can't outlast you if you give it room to rise, peak, and fall. Stay as long as it takes; stop whenever you're ready. Nothing here will cut you off mid-thought, right before it clicks."
      earlyMsg="The urge is loudest at the start. You don't have to obey it — just watch it."
      midMsg="You're on the wave now, not under it. Waves always come down."
      lateMsg="Notice it getting quieter — it always does. Stay as long as you like."
      doneBody="The urge spent its loudest moments on you, and you're still standing. That counts — completely."
      stopLabel="End the pause — log how it went"
      onSettle={onDone}
    />
  );
}

/* ---------- profile + log forms ---------- */

function ProfileForm({ category, profile }: { category: Category; profile: Profile | undefined }) {
  const queryClient = useQueryClient();
  const { award, awardFields } = usePoints();
  const [quitDate, setQuitDate] = useState(profile?.quitDate ?? "");
  const [dailyCost, setDailyCost] = useState(profile?.dailyCost != null ? String(profile.dailyCost) : "");
  const [dailyAmount, setDailyAmount] = useState(profile?.dailyAmount ?? "");
  const [planText, setPlanText] = useState(profile?.planText ?? "");
  const [supportName, setSupportName] = useState(profile?.supportName ?? "");
  const [supportPhone, setSupportPhone] = useState(profile?.supportPhone ?? "");
  const [saved, setSaved] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  // Draft autosave: load once per category — a draft kept on this phone
  // wins over the saved plan, so leaving mid-typing never loses words.
  // This deliberately does NOT re-run when the saved profile object is
  // refetched (points flushes refetch often), because that would discard
  // what the person is typing.
  const loadedCategoryRef = useRef<Category | null>(null);
  useEffect(() => {
    if (loadedCategoryRef.current === category) return;
    loadedCategoryRef.current = category;
    const raw = safeLocalGet(`${PROFILE_DRAFT_PREFIX}${category}`);
    if (raw) {
      try {
        const d = JSON.parse(raw) as { quitDate?: string; dailyCost?: string; dailyAmount?: string; planText?: string; supportName?: string; supportPhone?: string };
        setQuitDate(d.quitDate ?? "");
        setDailyCost(d.dailyCost ?? "");
        setDailyAmount(d.dailyAmount ?? "");
        setPlanText(d.planText ?? "");
        setSupportName(d.supportName ?? "");
        setSupportPhone(d.supportPhone ?? "");
        setDraftRestored(true);
        return;
      } catch { safeLocalRemove(`${PROFILE_DRAFT_PREFIX}${category}`); }
    }
    setQuitDate(profile?.quitDate ?? "");
    setDailyCost(profile?.dailyCost != null ? String(profile.dailyCost) : "");
    setDailyAmount(profile?.dailyAmount ?? "");
    setPlanText(profile?.planText ?? "");
    setSupportName(profile?.supportName ?? "");
    setSupportPhone(profile?.supportPhone ?? "");
    setDraftRestored(false);
    // Only the category switch should reload the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Keep the draft on this phone as they type; drop it when the form
  // matches the saved plan again (nothing unsaved left to keep).
  useEffect(() => {
    if (loadedCategoryRef.current !== category) return;
    const matchesSaved =
      quitDate === (profile?.quitDate ?? "") &&
      dailyCost === (profile?.dailyCost != null ? String(profile.dailyCost) : "") &&
      dailyAmount === (profile?.dailyAmount ?? "") &&
      planText === (profile?.planText ?? "") &&
      supportName === (profile?.supportName ?? "") &&
      supportPhone === (profile?.supportPhone ?? "");
    if (matchesSaved) safeLocalRemove(`${PROFILE_DRAFT_PREFIX}${category}`);
    else safeLocalSet(`${PROFILE_DRAFT_PREFIX}${category}`, JSON.stringify({ quitDate, dailyCost, dailyAmount, planText, supportName, supportPhone }));
  }, [category, quitDate, dailyCost, dailyAmount, planText, supportName, supportPhone, profile]);

  const save = useMutation({
    mutationFn: async () => await api.saveProfile({
      category,
      quitDate: quitDate || null,
      dailyCost: dailyCost.trim() === "" ? null : Number(dailyCost),
      dailyAmount: dailyAmount.trim() || null,
      planText: planText.trim() || null,
      supportName: supportName.trim() || null,
      supportPhone: supportPhone.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["state"] });
      // Richard's points: +5 for each field filled in for the first time
      // (it was empty in the saved plan, now it isn't), and +50 when a
      // quit date is picked — the server makes the quit date once-only
      // per date, so re-saving the same date never pays twice.
      let newFields = 0;
      if (profile?.dailyCost == null && dailyCost.trim() !== "") newFields += 1;
      if (!profile?.dailyAmount && dailyAmount.trim() !== "") newFields += 1;
      if (!profile?.planText && planText.trim() !== "") newFields += 1;
      if (!profile?.supportName && supportName.trim() !== "") newFields += 1;
      if (!profile?.supportPhone && supportPhone.trim() !== "") newFields += 1;
      if (newFields > 0) awardFields(category, newFields);
      if (quitDate && quitDate !== (profile?.quitDate ?? null)) award(category, "quitDate", quitDate);
      safeLocalRemove(`${PROFILE_DRAFT_PREFIX}${category}`);
      setDraftRestored(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const inputCls = "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text)]";
  const labelCls = "block text-sm font-medium text-[var(--text)]";

  return (
    <form id={`plan-form-${category}`} className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`quit-${category}`}>Quit / start date</label>
          <input id={`quit-${category}`} className={inputCls} type="date" value={quitDate} onChange={(e) => setQuitDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`cost-${category}`}>What it cost per day ($)</label>
          <input id={`cost-${category}`} className={inputCls} type="number" min="0" step="0.5" inputMode="decimal" placeholder="e.g. 15" value={dailyCost} onChange={(e) => setDailyCost(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <label className={labelCls} htmlFor={`amount-${category}`}>How much per day? (your words)</label>
        <input id={`amount-${category}`} className={inputCls} type="text" placeholder="e.g. a pack a day · 6 drinks · $100 at the casino" value={dailyAmount} onChange={(e) => setDailyAmount(e.target.value)} />
      </div>
      <div className="mt-4">
        <label className={labelCls} htmlFor={`plan-${category}`}>My plan, written while I'm clear-headed</label>
        <textarea id={`plan-${category}`} className={inputCls} rows={3} placeholder="When the urge hits at 6pm, I will… The people/places I'll avoid are… Instead I'll…" value={planText} onChange={(e) => setPlanText(e.target.value)} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`sname-${category}`}>Person I can call</label>
          <input id={`sname-${category}`} className={inputCls} type="text" placeholder="Name" value={supportName} onChange={(e) => setSupportName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor={`sphone-${category}`}>Their phone number</label>
          <input id={`sphone-${category}`} className={inputCls} type="tel" placeholder="Phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
        </div>
      </div>
      <button type="submit" disabled={save.isPending} className="felt-btn mt-4 min-h-11 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60">
        {save.isPending ? "Saving…" : saved ? "Saved ✓" : "Save my plan"}
      </button>
      {draftRestored && !saved && <p className="mt-2 text-sm text-[var(--dim)]" aria-live="polite">We kept what you were typing on this phone — it's back above, ready to save.</p>}
      {!draftRestored && <p className="mt-2 text-sm text-[var(--dim)]">As you type, a draft is kept on this phone automatically, so leaving the app won't lose it. Tap “Save my plan” to save it in the app.</p>}
      {save.isError && <p className="mt-2 text-sm text-[var(--crisis)]">Couldn't save — please try again. Your draft is still kept on this phone.</p>}
    </form>
  );
}

function ProgressCard({ profile, category }: { profile: Profile | undefined; category: Category }) {
  const days = daysSince(profile?.quitDate);
  if (days == null) {
    return (
      <div className="felt-soft rounded-[var(--radius)] bg-[var(--accent-soft)] p-4">
        <p className="text-[var(--text)]">Set your quit date below and this will track your days and the money you're keeping.</p>
      </div>
    );
  }
  const savedAmt = profile?.dailyCost != null ? profile.dailyCost * days : null;
  return (
    <div className="felt-soft rounded-[var(--radius)] bg-[var(--accent-soft)] p-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="text-4xl font-bold text-[var(--text)]">{days}</p>
          <p className="text-sm text-[var(--dim)]">{days === 1 ? "day" : "days"} since {profile?.quitDate}</p>
        </div>
        {savedAmt != null && (
          <div>
            <p className="text-4xl font-bold text-[var(--text)]">{money(savedAmt)}</p>
            <p className="text-sm text-[var(--dim)]">not spent on {CAT_LABEL[category].toLowerCase()}</p>
          </div>
        )}
        {profile?.dailyAmount && <p className="w-full text-sm text-[var(--dim)]">You were at: {profile.dailyAmount}</p>}
      </div>
      {profile?.supportName && (
        <p className="mt-3 text-sm text-[var(--text)]">
          Your person: <span className="font-semibold">{profile.supportName}</span>
          {profile.supportPhone && <> — <a className="font-semibold text-[var(--accent)] underline" href={`tel:${profile.supportPhone}`}>call them</a></>}
        </p>
      )}
      {profile?.planText && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dim)]">Your plan, in your words</p>
          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[var(--text)]">{profile.planText}</p>
        </div>
      )}
    </div>
  );
}

// Today's honest check-in for one quit category: +100 for a successful
// day after the quit date, −100 for a slip — once each per day, decided
// by the server from the saved marks. A slip always comes with the
// encouragement to try again, and the points total is never capped, so
// a slip knocks the score back without wiping out everything earned.
function TodayCard({ category, profile, dayMarks }: {
  category: Category;
  profile: Profile | undefined;
  dayMarks: DayMark[];
}) {
  const queryClient = useQueryClient();
  const [justMarked, setJustMarked] = useState<"success" | "relapse" | null>(null);
  const today = localDay();
  const days = daysSince(profile?.quitDate);
  const mark = useMutation({
    mutationFn: async (kind: "daySuccess" | "relapse") => await api.awardPoints({ tab: category, action: kind, day: today }),
    onSuccess: (_res, kind) => {
      queryClient.invalidateQueries({ queryKey: ["state"] });
      setJustMarked(kind === "daySuccess" ? "success" : "relapse");
    },
  });

  if (!profile?.quitDate || days == null) {
    return (
      <div className="felt-soft rounded-[var(--radius)] bg-[var(--amber-soft)] p-4">
        <p className="leading-relaxed text-[var(--text)]">
          Pick a quit date in your plan below — that's worth <strong>+50 points</strong> — and every day after it
          that you stay on track earns <strong>+100</strong>, right here.
        </p>
      </div>
    );
  }
  if (days < 0) {
    return (
      <div className="felt-soft rounded-[var(--radius)] bg-[var(--amber-soft)] p-4">
        <p className="leading-relaxed text-[var(--text)]">
          Your quit date, {profile.quitDate}, is coming up. When it arrives, come back here each day: a day on
          track is <strong>+100 points</strong>.
        </p>
      </div>
    );
  }

  const todaySuccess = dayMarks.some((m) => m.tab === category && m.day === today && m.action === "daySuccess");
  const todayRelapse = dayMarks.some((m) => m.tab === category && m.day === today && m.action === "relapse");
  const showRelapse = todayRelapse || justMarked === "relapse";
  const showSuccess = (todaySuccess || justMarked === "success") && !showRelapse;

  return (
    <div className="felt-soft rounded-[var(--radius)] bg-[var(--amber-soft)] p-5">
      <p className="font-display text-lg font-semibold text-[var(--text)]">Day {days} — how did today go?</p>
      {showSuccess && (
        <p className="mt-2 leading-relaxed text-[var(--text)]" aria-live="polite">
          ✓ <strong>Today counts — +100 points.</strong> Another sunrise, another day you chose yourself. Come back
          tomorrow and do it again.
        </p>
      )}
      {showRelapse && (
        <div className="mt-2" aria-live="polite">
          <p className="leading-relaxed text-[var(--text)]">
            <strong>Today was a slip (−100 points) — and it is not the end of anything.</strong> A relapse is sadly
            a part of recovery for very many people; it does not erase the days you did well, the plan you wrote,
            or everything you've learned.
          </p>
          <p className="mt-2 leading-relaxed text-[var(--text)]">
            And look at your total: with points for every tap, every field, and your quit date, you're hopefully
            not starting at zero — and neither is your progress. Be kind to yourself tonight, tell your person,
            and try again tomorrow. A new sunrise is coming, and so is another chance.
          </p>
        </div>
      )}
      {!showSuccess && !showRelapse && (
        <>
          <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
            Be honest — honesty is what makes the points mean something. A day on track is +100. A slip is −100,
            and logging it honestly is itself a step back toward recovery.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={mark.isPending} onClick={() => mark.mutate("daySuccess")} className="felt-btn min-h-12 rounded-[var(--radius)] bg-[var(--leaf)] px-4 font-semibold text-white disabled:opacity-60">
              I stayed on track today · +100
            </button>
            <button type="button" disabled={mark.isPending} onClick={() => mark.mutate("relapse")} className="felt-btn min-h-12 rounded-[var(--radius)] border-2 border-[var(--crisis)] bg-[var(--surface)] px-4 font-semibold text-[var(--text)] disabled:opacity-60">
              I slipped today · −100
            </button>
          </div>
          {mark.isError && <p className="mt-2 text-sm text-[var(--crisis)]">Couldn't save that — please try again.</p>}
        </>
      )}
      {showSuccess && !todayRelapse && (
        <div className="mt-3">
          <button type="button" disabled={mark.isPending} onClick={() => mark.mutate("relapse")} className="min-h-10 text-sm font-medium text-[var(--dim)] underline">
            Actually, I slipped later today — record it honestly (−100)
          </button>
        </div>
      )}
    </div>
  );
}

function LogForm({ category, kind }: { category: Category; kind: "urge" | "boundary" }) {
  const queryClient = useQueryClient();
  const { awardFields } = usePoints();
  const [trigger, setTrigger] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [rodeItOut, setRodeItOut] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftKey = `${LOG_DRAFT_PREFIX}${category}:${kind}`;
  const loadedLogRef = useRef<string | null>(null);
  useEffect(() => {
    if (loadedLogRef.current === draftKey) return;
    loadedLogRef.current = draftKey;
    const raw = safeLocalGet(draftKey);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as { trigger?: string; intensity?: number; note?: string; rodeItOut?: boolean };
      setTrigger(d.trigger ?? "");
      if (typeof d.intensity === "number") setIntensity(d.intensity);
      setNote(d.note ?? "");
      setRodeItOut(d.rodeItOut ?? true);
      setDraftRestored(true);
    } catch { safeLocalRemove(draftKey); }
  }, [draftKey]);
  useEffect(() => {
    if (loadedLogRef.current !== draftKey) return;
    if (trigger === "" && note === "" && intensity === 5 && rodeItOut) safeLocalRemove(draftKey);
    else safeLocalSet(draftKey, JSON.stringify({ trigger, intensity, note, rodeItOut }));
  }, [draftKey, trigger, intensity, note, rodeItOut]);

  const add = useMutation({
    mutationFn: async () => await api.addLog({
      category, kind,
      trigger: trigger.trim() || null,
      intensity,
      note: note.trim() || null,
      rodeItOut,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["state"] });
      // +5 for each field filled in on this entry (what happened, and
      // the note if one was written). The strength slider is a setting,
      // not a filled field, so it doesn't count.
      const filled = (trigger.trim() !== "" ? 1 : 0) + (note.trim() !== "" ? 1 : 0);
      if (filled > 0) awardFields(category, filled);
      safeLocalRemove(draftKey);
      setDraftRestored(false);
      setTrigger(""); setNote(""); setIntensity(5); setRodeItOut(true);
    },
  });

  const inputCls = "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text)]";
  return (
    <form className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--text)]" htmlFor={`trig-${category}-${kind}`}>
            {kind === "boundary" ? "What happened?" : "What triggered it?"}
          </label>
          <input id={`trig-${category}-${kind}`} className={inputCls} type="text" placeholder={kind === "boundary" ? "Asked to cover for them again" : "Bored · stressed · coffee · driving…"} value={trigger} onChange={(e) => setTrigger(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)]" htmlFor={`int-${category}-${kind}`}>
            {kind === "boundary" ? "How hard was it? " : "Urge strength "}({intensity}/10)
          </label>
          <input id={`int-${category}-${kind}`} className="mt-2 w-full" type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-sm font-medium text-[var(--text)]" htmlFor={`note-${category}-${kind}`}>Note (optional)</label>
        <textarea id={`note-${category}-${kind}`} className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "boundary" ? "What I said, and how it felt after…" : "What helped, what didn't…"} />
      </div>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-[var(--text)]">
        <input type="checkbox" className="h-5 w-5" checked={rodeItOut} onChange={(e) => setRodeItOut(e.target.checked)} />
        {kind === "boundary" ? "I held my boundary" : "I rode it out — I didn't act on it"}
      </label>
      <button type="submit" disabled={add.isPending} className="felt-btn mt-2 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--accent)] bg-[var(--surface)] px-4 font-semibold text-[var(--accent)] disabled:opacity-60">
        {add.isPending ? "Saving…" : kind === "boundary" ? "Log this boundary moment" : "Log this urge"}
      </button>
      {draftRestored && <p className="mt-2 text-sm text-[var(--dim)]" aria-live="polite">We kept the entry you were writing on this phone — it's back above, ready to log.</p>}
      {!draftRestored && <p className="mt-2 text-sm text-[var(--dim)]">As you type, a draft is kept on this phone automatically, so leaving the app won't lose it.</p>}
      {add.isError && <p className="mt-2 text-sm text-[var(--crisis)]">Couldn't save — please try again. Your draft is still kept on this phone.</p>}
    </form>
  );
}

function LogList({ logs }: { logs: LogEntry[] }) {
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: async (id: number) => await api.deleteLog({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["state"] }),
  });
  if (logs.length === 0) return <p className="text-sm text-[var(--dim)]">Nothing logged yet. Patterns only show up once you write a few down — that's the point of the log.</p>;
  return (
    <ul className="space-y-2">
      {logs.map((l) => (
        <li key={l.id} className="felt-soft flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text)]">
              {new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              {l.trigger ? ` · ${l.trigger}` : ""}
              {l.intensity != null ? ` · ${l.intensity}/10` : ""}
            </p>
            {l.note && <p className="mt-0.5 text-sm leading-relaxed text-[var(--dim)]">{l.note}</p>}
            <p className="mt-0.5 text-xs font-medium text-[var(--accent)]">
              {l.kind === "boundary" ? (l.rodeItOut ? "Boundary held" : "Boundary slipped — logged honestly") : (l.rodeItOut ? "Rode it out" : "Acted on it — logged honestly")}
            </p>
          </div>
          <button type="button" aria-label={`Delete log entry from ${new Date(l.createdAt).toLocaleDateString()}`} onClick={() => del.mutate(l.id)} className="min-h-9 shrink-0 px-2 text-sm text-[var(--dim)] underline">Delete</button>
        </li>
      ))}
    </ul>
  );
}

/* ---------- gambling simulator ---------- */

const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
const START_BANKROLL = 1000;
const BET = 10;
// Honest slot math: 3 reels × 6 symbols = 216 equally likely outcomes.
// Triples (6 outcomes): $250 + $120 + $60 + $40×3 = $550. Exactly one pair
// (90 outcomes) pays $14 = $1,260. All-distinct (120 outcomes) pays $0.
// Expected return = ($550 + $1,260) / 216 = $8.38 per $10 spin ≈ 84¢ per
// $1 bet — a typical machine's edge, shown openly.
function spinResult(): { reels: string[]; payout: number } {
  const reels = [0, 0, 0].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] ?? "🍒");
  const [a, b, c] = reels as [string, string, string];
  let payout = 0;
  if (a === b && b === c) payout = a === "7️⃣" ? 250 : a === "💎" ? 120 : a === "⭐" ? 60 : 40;
  else if (a === b || b === c || a === c) payout = 14;
  return { reels, payout };
}

function SlotSimulator() {
  const [bankroll, setBankroll] = useState(START_BANKROLL);
  // Slot sounds (Richard, 2026-11-12): optional, OFF by default. Small
  // tones made in the browser — a click on a spin, a chime on a win, a
  // low tone when the money runs out. No audio files, nothing plays on
  // load, and sound follows the phone's volume and silent switch.
  const [soundOn, setSoundOn] = useState(false);
  const [reels, setReels] = useState<string[]>(["🍒", "🍋", "🔔"]);
  const [spins, setSpins] = useState(0);
  const [totalBet, setTotalBet] = useState(0);
  const [totalBack, setTotalBack] = useState(0);
  const [biggestWin, setBiggestWin] = useState(0);
  const [lastMsg, setLastMsg] = useState("You start with $1,000 of pretend money. Every spin costs $10.");
  const [history, setHistory] = useState<number[]>([START_BANKROLL]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bankRef = useRef(START_BANKROLL);
  const histRef = useRef<number[]>([START_BANKROLL]);

  const stopAuto = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => stopAuto, []);

  const applyResult = (r: string[], payout: number, verbose: boolean) => {
    const next = bankRef.current - BET + payout;
    bankRef.current = next;
    histRef.current = [...histRef.current.slice(-119), next];
    setBankroll(next);
    setReels(r);
    setHistory(histRef.current);
    setSpins((s) => s + 1);
    setTotalBet((t) => t + BET);
    setTotalBack((t) => t + payout);
    setBiggestWin((w) => Math.max(w, payout));
    if (!verbose) return;
    if (payout >= 100) setLastMsg(`Big win — $${payout}! This is the moment the machine is designed around. Notice how much you want to keep going right now. That feeling is the product.`);
    else if (payout > BET) setLastMsg(`You won $${payout}. Feels like you're ahead — check the totals below. Small wins are how the machine keeps you seated.`);
    else if (payout > 0) setLastMsg(`$${payout} back on a $10 bet. The machine calls that a win. Your bankroll calls it losing $${BET - payout}.`);
    else if (r[0] === r[1] || r[1] === r[2]) setLastMsg("Two matched — a near-miss. Near-misses feel like 'almost won.' Mathematically, they're just losses wearing a costume.");
    else setLastMsg("Nothing. Most spins are this. The lights and sounds exist to make 'nothing' feel exciting.");
  };

  const spinOnce = () => {
    if (bankRef.current < BET) {
      if (soundOn) sounds.playSlotSound("low");
      setLastMsg("That's the end of the money. In a real casino, this is where the ATM, the credit card, and the regret come in."); return;
    }
    if (soundOn) sounds.playSlotSound("click");
    const { reels: r, payout } = spinResult();
    applyResult(r, payout, true);
    const nextBank = bankRef.current;
    if (soundOn) {
      if (payout > BET) sounds.playSlotSound("chime");
      else if (nextBank < BET) sounds.playSlotSound("low");
    }
  };
  const spinFast = (n: number) => {
    stopAuto();
    if (soundOn) sounds.playSlotSound("click");
    for (let i = 0; i < n && bankRef.current >= BET; i++) {
      const { reels: r, payout } = spinResult();
      applyResult(r, payout, false);
    }
    if (soundOn && bankRef.current < BET) sounds.playSlotSound("low");
    setLastMsg(bankRef.current < BET ? "Broke. It always ends here — the only question is how long it takes and how much went in." : "That's 25 spins in a blink — about how fast real money goes too. Check the totals.");
  };
  const autoPlay = () => {
    stopAuto();
    timerRef.current = setInterval(() => {
      if (bankRef.current < BET) { stopAuto(); if (soundOn) sounds.playSlotSound("low"); setLastMsg("Broke. It always ends here — the only question is how long it takes and how much went in."); return; }
      spinOnce();
    }, 350);
  };
  const reset = () => {
    stopAuto();
    bankRef.current = START_BANKROLL; histRef.current = [START_BANKROLL];
    setBankroll(START_BANKROLL); setSpins(0); setTotalBet(0); setTotalBack(0); setBiggestWin(0);
    setHistory([START_BANKROLL]); setReels(["🍒", "🍋", "🔔"]);
    setLastMsg("Fresh $1,000 of pretend money. Watch what happens — again.");
  };

  const maxH = Math.max(...history, START_BANKROLL);
  const minH = Math.min(...history, 0);
  const range = Math.max(1, maxH - minH);
  const points = history.map((v, i) => `${(i / Math.max(1, history.length - 1)) * 300},${108 - ((v - minH) / range) * 100}`).join(" ");
  const rtp = totalBet > 0 ? Math.round((totalBack / totalBet) * 100) : null;

  return (
    <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--amber)] bg-[var(--surface)] p-5">
      <h3 className="font-display text-xl font-semibold text-[var(--text)]">The Honest Slot Machine</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
        No real money. This machine pays back about 84¢ for every $1 played — that's a real slot machine's math, not a rigged
        demo. It will let you win. Watch what winning does to the total.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={soundOn}
          aria-label={soundOn ? "Slot sounds on — tap to turn sound off" : "Slot sounds off — tap to turn sound on"}
          onClick={() => setSoundOn((on) => !on)}
          className={`min-h-11 rounded-[var(--radius)] px-3 text-sm font-semibold ${soundOn ? "felt-btn bg-[var(--amber)] text-white" : "border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
        >
          {soundOn ? "🔊 Slot sounds: on" : "🔇 Slot sounds: off"}
        </button>
        <p className="text-sm text-[var(--dim)]">
          {soundOn
            ? "Sound on — a click on each spin, a chime on a win, a low tone when the money runs out. It follows your phone's volume and silent switch."
            : "Sound is off. Turn it on if you like — it only plays after you tap spin, never on its own."}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3" aria-label={`Reels showing ${reels.join(", ")}`}>
        {reels.map((s, i) => (
          <div key={i} className="felt-soft flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--amber-soft)] text-4xl">{s}</div>
        ))}
      </div>
      <p className="mt-3 min-h-10 text-center text-sm leading-relaxed text-[var(--text)]" aria-live="polite">{lastMsg}</p>
      <p className="text-center">
        <span className="text-3xl font-bold tabular-nums text-[var(--text)]">{money(bankroll)}</span>
        <span className="ml-2 text-sm text-[var(--dim)]">left of $1,000</span>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={spinOnce} disabled={bankroll < BET} className="felt-btn min-h-12 rounded-[var(--radius)] bg-[var(--amber)] px-3 font-semibold text-white disabled:opacity-50">Spin · $10</button>
        <button type="button" onClick={() => spinFast(25)} disabled={bankroll < BET} className="felt-btn min-h-12 rounded-[var(--radius)] border-2 border-[var(--amber)] bg-[var(--surface)] px-3 font-semibold text-[var(--text)] disabled:opacity-50">Play 25 fast</button>
        <button type="button" onClick={autoPlay} disabled={bankroll < BET} className="felt-btn min-h-12 rounded-[var(--radius)] border-2 border-[var(--amber)] bg-[var(--surface)] px-3 font-semibold text-[var(--text)] disabled:opacity-50">Auto-play</button>
        <button type="button" onClick={reset} className="felt-btn min-h-12 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 font-medium text-[var(--text)]">Start over</button>
      </div>
      {spins > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <svg viewBox="0 0 300 116" className="w-full" role="img" aria-label="Chart of your bankroll over time">
            <polyline points={points} fill="none" stroke="var(--amber)" strokeWidth="2" />
          </svg>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div><dt className="text-[var(--dim)]">Spins</dt><dd className="font-semibold text-[var(--text)]">{spins}</dd></div>
            <div><dt className="text-[var(--dim)]">Put in</dt><dd className="font-semibold text-[var(--text)]">{money(totalBet)}</dd></div>
            <div><dt className="text-[var(--dim)]">Got back</dt><dd className="font-semibold text-[var(--text)]">{money(totalBack)}{rtp != null ? ` (${rtp}%)` : ""}</dd></div>
            <div><dt className="text-[var(--dim)]">Biggest win</dt><dd className="font-semibold text-[var(--text)]">{money(biggestWin)}</dd></div>
          </dl>
          <p className="mt-3 leading-relaxed text-[var(--text)]">
            {bankroll <= 0
              ? "Broke — with pretend money, this time. The wins along the way were real feelings. The ending was always in the math."
              : spins >= 50
                ? `After ${spins} spins you've put in ${money(totalBet)} and gotten back ${money(totalBack)}. The wins were real — and you're still down ${money(totalBet - totalBack)}. That's not bad luck. That's the design: the machine doesn't need you to lose every spin, just a little more than you win, forever.`
                : "Keep going — or jump ahead with “Play 25 fast.” The pattern needs a few dozen spins to show itself."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- per-category content ---------- */

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2 leading-relaxed text-[var(--text)]">
          <span aria-hidden className="mt-1 text-[var(--accent)]">•</span><span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function CategoryPage({ category, profile, logs, dayMarks, onSurf }: {
  category: Category;
  profile: Profile | undefined;
  logs: LogEntry[];
  dayMarks: DayMark[];
  onSurf: (c: Category) => void;
}) {
  const catLogs = logs.filter((l) => l.category === category);
  const isCodep = category === "codependency";
  return (
    <div>
      <TabPointsChip tab={category} />
      {category === "alcohol" && (
        <>
          <div className="felt-soft rounded-[var(--radius)] bg-[var(--crisis-soft)] p-4">
            <p className="font-semibold text-[var(--text)]">Safety first — this one can be physical</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">
              If you drink heavily every day, stopping suddenly on your own can be dangerous — shaking, seizures, and
              delirium tremens are real. Talk to a doctor or call SAMHSA at{" "}
              <a className="font-semibold underline" href="tel:18006624357">1-800-662-4357</a> before quitting cold.
              Getting medical help to stop is not weakness; with alcohol it can be life-saving.
            </p>
          </div>
          <div className="mt-5"><AlcoholHook /></div>
          <Section title="How alcohol urges work">
            <p className="leading-relaxed text-[var(--text)]">
              Alcohol cravings tend to follow the clock and the setting: the end of work, the kitchen at 6pm, certain friends,
              certain chairs. And after the first drink, judgment is the first thing to go — which is why plans have to be
              made <em>before</em> the first drink, not negotiated after it.
            </p>
          </Section>
          <Section title="Levers that help">
            <BulletList items={[
              "Decide in the morning, in writing (your plan below), not at 6pm in the moment.",
              "Change the route and the routine: no alcohol in the house, a different end-of-day ritual ready to go.",
              "Eat, and don't get too Hungry, Angry, Lonely, or Tired — HALT is when cravings win.",
              "Tell one person. Secrecy is alcohol's best friend.",
            ]} />
          </Section>
          <Section title="Help, free and confidential">
            <div className="space-y-3">
              <ResourceLink name="SAMHSA National Helpline" detail="24/7 treatment referrals, English and Spanish. They'll find local help and won't ask for insurance." phone="18006624357" phoneLabel="1-800-662-4357" href="https://www.samhsa.gov/find-help/helplines/national-helpline" />
              <p className="text-sm text-[var(--dim)]">Alcoholics Anonymous — aa.org — free peer meetings in person and online, everywhere. SMART Recovery — smartrecovery.org — a science-based, non-12-step alternative.</p>
            </div>
          </Section>
        </>
      )}

      {category === "smoking" && (
        <>
          <SmokingHook />
          <Section title="The good news about nicotine urges">
            <p className="leading-relaxed text-[var(--text)]">
              A cigarette craving peaks at about 3 to 5 minutes and then fades — whether you smoke or not. The catch is
              frequency: coffee, driving, meals, breaks — the cues are everywhere, so you'll ride out a lot of small waves
              instead of a few big ones. Each one you ride out weakens that cue a little.
            </p>
          </Section>
          <Section title="Levers that help">
            <BulletList items={[
              "Delay + distract + drink water + deep breaths — the 4 D's. The pause has no time limit — stay with it until the wave passes.",
              "Break the cue pairs: different route, brush your teeth after meals, hold something in your smoking hand.",
              "Nicotine replacement (patch, gum, lozenge) and medicines like varenicline genuinely help — ask a doctor or pharmacist, and the quitline below can often help you get them.",
              "Make your car and home smoke-free zones. Friction works.",
            ]} />
          </Section>
          <Section title="Help, free and confidential">
            <div className="space-y-3">
              <ResourceLink name="National Quitline" detail="Free coaching from trained quit counselors — call and you'll reach your state's quitline. Text QUIT to 47848 for the SmokefreeTXT program." phone="18007848669" phoneLabel="1-800-QUIT-NOW" href="https://smokefree.gov/tips" />
            </div>
          </Section>
        </>
      )}

      {category === "gambling" && (
        <>
          <GamblingHook />
          <Section title="Why gambling hooks so hard">
            <p className="leading-relaxed text-[var(--text)]">
              Gambling runs on the strongest reinforcement pattern known: unpredictable rewards. Add near-misses that feel
              like almost winning, and boredom — a flat, under-stimulated brain looking for a jolt — and a phone that's also
              a casino, and willpower alone is outmatched. So don't rely on it. Use friction.
            </p>
          </Section>
          <Section title="Feel the math yourself">
            <SlotSimulator />
          </Section>
          <Section title="Friction that actually works">
            <BulletList items={[
              "Self-exclude: every state and most apps let you ban yourself. Do it while you're clear-headed, not after a loss.",
              "Move the money: savings in an account you can't reach instantly; hand the cards to someone you trust.",
              "Block the apps and sites (your phone has Screen Time / Digital Wellbeing controls), and leave cards home on casino trips you can't avoid.",
              "Fill the bored slot specifically: boredom was the trigger, so plan the replacement for the exact hours you'd have gone.",
              "Tell the truth about losses — out loud, to one person. Chasing losses thrives on secrecy.",
            ]} />
          </Section>
          <Section title="Help, free and confidential">
            <div className="space-y-3">
              <ResourceLink name="National Problem Gambling Helpline" detail="Run by the National Council on Problem Gambling. Call or text, 24/7, free and confidential. The previous number, 1-800-522-4700, also still works." phone="18006973738" phoneLabel="1-800-MY-RESET" href="https://www.ncpgambling.org/1-800-my-reset-national-problem-gambling-helpline-faq/" />
              <p className="text-sm text-[var(--dim)]">Gamblers Anonymous — gamblersanonymous.org — free peer meetings. Gam-Anon — for family members affected by someone else's gambling.</p>
            </div>
          </Section>
        </>
      )}

      {category === "drugs" && (
        <>
          <div className="felt-soft rounded-[var(--radius)] bg-[var(--crisis-soft)] p-4">
            <p className="font-semibold text-[var(--text)]">Overdose safety — read this first</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">
              If someone can't be woken, is breathing slowly or not at all, or has blue lips: call{" "}
              <a className="font-semibold underline" href="tel:911">911</a> immediately and give naloxone (Narcan) if you
              have it — it can reverse an opioid overdose and you can't hurt someone by giving it. Carry it if opioids are
              anywhere in your life; pharmacies stock it without a prescription in most states.
            </p>
          </div>
          <div className="mt-5"><DrugsHook /></div>
          <Section title="Different drugs, different quits">
            <BulletList items={[
              "Opioids: withdrawal is brutal but rarely dangerous; medicines (buprenorphine, methadone) are the most effective treatment we have — that's treatment, not 'trading one drug for another.'",
              "Stimulants (meth, cocaine): no approved medicine yet; sleep, food, and time repair a lot, and cravings come in waves tied to people and places.",
              "Cannabis: milder withdrawal — irritability, vivid dreams, poor sleep for a week or two — and 'it's just weed' can make the habit harder to take seriously.",
              "Benzos and alcohol together are the dangerous withdrawals — stopping suddenly can cause seizures. Get medical guidance first.",
              "After any break, tolerance drops. Going back to an old dose is how overdoses happen. If you use, don't use alone, and have naloxone nearby.",
            ]} />
          </Section>
          <Section title="Help, free and confidential">
            <div className="space-y-3">
              <ResourceLink name="SAMHSA National Helpline" detail="24/7 referrals to local treatment, including medication treatment for opioids. Free, confidential, English and Spanish. You can also search FindTreatment.gov for facilities near you." phone="18006624357" phoneLabel="1-800-662-4357" href="https://www.samhsa.gov/find-help/helplines/national-helpline" />
              <p className="text-sm text-[var(--dim)]">Narcotics Anonymous — na.org — free peer meetings. SMART Recovery — smartrecovery.org — science-based alternative. Never Use Alone (for people who use alone): 1-877-696-1996.</p>
            </div>
          </Section>
        </>
      )}

      {category === "codependency" && (
        <>
          <CodependencyHook />
          <Section title="Calming breathing — right here, up top">
            <p className="mb-3 leading-relaxed text-[var(--text)]">
              You don't have to scroll to find this — it's the first tool on this tab, on purpose. When someone
              else's choices are spinning in your head and your hands are already reaching to fix, soothe, or
              rescue: breathe first. One slow breath is often the whole distance between reacting and choosing.
            </p>
            <CalmingBreathing />
          </Section>
          <Section title="A different kind of pattern">
            <p className="leading-relaxed text-[var(--text)]">
              Codependency isn't a substance — it's a relationship pattern: rescuing, fixing, saying yes while resentment
              builds, feeling responsible for someone else's drinking, using, or mood. You can't control their choices.
              What you <em>can</em> change is your side of the pattern — and that starts with noticing it in the moment,
              which is what the boundary log below is for.
            </p>
          </Section>
          <Section title="Three questions before you rescue">
            <BulletList items={[
              "Is this actually mine to fix — or am I taking over something that belongs to them?",
              "Am I helping, or am I shielding them from a consequence that might teach what my words haven't?",
              "What do I need right now, in one honest sentence — and have I said it out loud?",
            ]} />
            <p className="mt-3 leading-relaxed text-[var(--text)]">
              A boundary isn't a threat or a punishment. It's one sentence about what <em>you</em> will do: “I love you, and
              I won't lend money for this. I'll drive you to a meeting anytime.” Then the hard part: letting it stand.
            </p>
          </Section>
          <Section title="Support for you, specifically">
            <div className="space-y-3">
              <ResourceLink name="SAMHSA National Helpline" detail="Also for family members — referrals to local family support and treatment, 24/7, free and confidential." phone="18006624357" phoneLabel="1-800-662-4357" href="https://www.samhsa.gov/find-help/helplines/national-helpline" />
              <p className="text-sm text-[var(--dim)]">Al-Anon Family Groups — al-anon.org — for friends and family of people with alcohol problems. Co-Dependents Anonymous (CoDA) — coda.org — meetings focused on healthy relationships. Nar-Anon — for families affected by drug use. Gam-Anon — for families affected by gambling.</p>
            </div>
          </Section>
        </>
      )}

      {!isCodep && (
        <Section title="Urge hitting right now?">
          <button type="button" onClick={() => onSurf(category)} className="felt-btn min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 text-base font-semibold text-white">
            Ride it out — no time limit, yours to end
          </button>
        </Section>
      )}

      {/* Codependency renders its breathing up top, right under its
          welcome, so it isn't buried — don't render a second copy. */}
      {!isCodep && (
        <Section title="Calming breathing">
          <CalmingBreathing />
        </Section>
      )}

      <Section title={isCodep ? "Your progress" : "Your days and dollars"}>
        <ProgressCard profile={profile} category={category} />
      </Section>

      <Section title="Today counts">
        <TodayCard category={category} profile={profile} dayMarks={dayMarks} />
      </Section>

      <Section title={isCodep ? "Set or update your details" : "Set or update your quit plan"}>
        <ProfileForm category={category} profile={profile} />
      </Section>

      <Section title={isCodep ? "Log a boundary moment" : "Log an urge"}>
        <LogForm category={category} kind={isCodep ? "boundary" : "urge"} />
      </Section>

      <Section title="Your log">
        <LogList logs={catLogs} />
      </Section>
    </div>
  );
}

/* ---------- feeling unwell: PHQ-9 + GAD-7 screeners ---------- */

// The PHQ-9 (depression) and GAD-7 (anxiety) are the standard screening
// questionnaires used in primary care, developed by Drs. Kroenke, Spitzer,
// and Williams. They are free for clinical and personal use. Wording below
// follows the published instruments; scores are computed on this screen only.
const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

const FREQ_OPTIONS = ["Not at all", "Several days", "More than half the days", "Nearly every day"] as const;

function scoreBand(kind: "phq9" | "gad7", score: number): { band: string; guidance: string } {
  if (kind === "phq9") {
    if (score <= 4) return { band: "Minimal symptoms", guidance: "Your answers suggest few or mild symptoms right now. That doesn't mean what you feel doesn't matter — if low mood keeps showing up, it's still worth mentioning to a doctor or someone you trust." };
    if (score <= 9) return { band: "Mild symptoms", guidance: "Your answers fall in the mild range. Many people watch and wait at this level, take care of sleep, movement, and connection — and check in again in a couple of weeks. If it lingers or worsens, bring it up with a doctor." };
    if (score <= 14) return { band: "Moderate symptoms", guidance: "Your answers fall in the moderate range. This is the level where doctors usually recommend a real conversation about treatment — therapy, medication, or both. Please consider booking that appointment, and consider writing this score and today's date down to show them." };
    if (score <= 19) return { band: "Moderately severe symptoms", guidance: "Your answers fall in the moderately severe range. Please talk with a doctor or mental health professional soon — treatment at this level usually helps, and you don't have to carry this alone. If getting an appointment is hard, SAMHSA below can help you find care." };
    return { band: "Severe symptoms", guidance: "Your answers fall in the severe range. Please reach out for professional help promptly — a doctor, an urgent care clinic, or SAMHSA below. If you ever feel you might act on thoughts of harming yourself, call or text 988 right away." };
  }
  if (score <= 4) return { band: "Minimal symptoms", guidance: "Your answers suggest little anxiety right now. If worry still interferes with your days, it's worth mentioning to a doctor anyway — you know your own baseline." };
  if (score <= 9) return { band: "Mild symptoms", guidance: "Your answers fall in the mild range. Sleep, movement, cutting back caffeine, and talking it out help many people at this level. Check in again in a couple of weeks, and see a doctor if it grows." };
  if (score <= 14) return { band: "Moderate symptoms", guidance: "Your answers fall in the moderate range — the level where doctors usually recommend a real conversation about treatment. Please consider booking that appointment, and consider writing this score and today's date down to show them." };
  return { band: "Severe symptoms", guidance: "Your answers fall in the severe range. Please talk with a doctor or mental health professional soon — anxiety at this level is treatable, and you don't have to just live with it. SAMHSA below can help you find care." };
}

function Screener({ title, subtitle, questions, answers, onAnswer }: {
  title: string;
  subtitle: string;
  questions: string[];
  answers: (number | null)[];
  onAnswer: (qIndex: number, value: number) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">{subtitle}</p>
      <ol className="mt-3 space-y-3">
        {questions.map((q, qi) => (
          <li key={qi} className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="leading-relaxed text-[var(--text)]"><span className="font-semibold">{qi + 1}.</span> {q}</p>
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={`Question ${qi + 1}: ${q}`}>
              {FREQ_OPTIONS.map((label, vi) => {
                const selected = answers[qi] === vi;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onAnswer(qi, vi)}
                    className={`min-h-11 rounded-xl px-3 text-sm font-medium ${selected ? "felt-btn bg-[var(--accent)] text-white" : "felt-soft border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScoreResult({ kind, title, score, max }: { kind: "phq9" | "gad7"; title: string; score: number; max: number }) {
  const { band, guidance } = scoreBand(kind, score);
  return (
    <div className="felt-soft rounded-[var(--radius)] bg-[var(--accent-soft)] p-5" aria-live="polite">
      <p className="text-sm font-medium text-[var(--dim)]">{title}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--text)]">{score} <span className="text-base font-medium text-[var(--dim)]">of {max} — {band}</span></p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">{guidance}</p>
    </div>
  );
}

function WellbeingPage() {
  const { awardFields } = usePoints();
  const [phq, setPhq] = useState<(number | null)[]>(() => PHQ9_QUESTIONS.map(() => null));
  const [gad, setGad] = useState<(number | null)[]>(() => GAD7_QUESTIONS.map(() => null));

  const setAnswer = (set: typeof setPhq) => (qi: number, v: number) =>
    set((prev) => prev.map((a, i) => (i === qi ? v : a)));

  const phqDone = phq.every((a) => a != null);
  const gadDone = gad.every((a) => a != null);
  const phqScore = phq.reduce<number>((s, a) => s + (a ?? 0), 0);
  const gadScore = gad.reduce<number>((s, a) => s + (a ?? 0), 0);
  const selfHarmFlag = (phq[8] ?? 0) > 0;
  const answeredCount = phq.filter((a) => a != null).length + gad.filter((a) => a != null).length;

  // Every answered question is a field filled in: +5 each, awarded once
  // per screener per visit when it's complete. The answers themselves
  // still never leave this screen — only the count is reported.
  const phqAwardedRef = useRef(false);
  const gadAwardedRef = useRef(false);
  useEffect(() => {
    if (phqDone && !phqAwardedRef.current) { phqAwardedRef.current = true; awardFields("wellbeing", PHQ9_QUESTIONS.length); }
  }, [phqDone, awardFields]);
  useEffect(() => {
    if (gadDone && !gadAwardedRef.current) { gadAwardedRef.current = true; awardFields("wellbeing", GAD7_QUESTIONS.length); }
  }, [gadDone, awardFields]);

  const startOver = () => {
    setPhq(PHQ9_QUESTIONS.map(() => null));
    setGad(GAD7_QUESTIONS.map(() => null));
  };

  return (
    <div>
      <TabPointsChip tab="wellbeing" />
      <WellbeingHook />
      <DisclaimerShort />
      <div className="mt-5"><CrisisStrip /></div>

      <Section title="Calming breathing — right here, up top">
        <p className="mb-3 leading-relaxed text-[var(--text)]">
          You don't have to scroll to find this — it's the first tool on this tab, on purpose. Before the
          questions — or after them, or both — take a minute to settle. Low mood and anxiety both live
          partly in the body, and a slow breath is one small, real way to turn the volume down.
        </p>
        <CalmingBreathing />
      </Section>

      <div className="sunrise-band mb-5 mt-8 flex items-center gap-3 rounded-[var(--radius)] px-4 py-3" aria-hidden="true">
        <svg width="40" height="28" viewBox="0 0 30 22" className="shrink-0">
          <path d="M3 19a12 12 0 0 1 24 0Z" fill="#ffd35c" stroke="#e8763a" strokeWidth="1.6" />
          <g stroke="#e8763a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 1.5v3" /><path d="M6.5 4.5l2 2.4" /><path d="M23.5 4.5l-2 2.4" />
          </g>
          <path d="M0 19.5h30" stroke="#5d8f4e" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="flex gap-1">
          {FLOWER_COLORS.slice(0, 5).map((c) => (
            <FlowerIcon key={c} color={c} size={24} />
          ))}
        </span>
      </div>
      <p className="font-display text-2xl font-semibold leading-snug text-[var(--text)]">
        Feeling unwell? Sad? Anxious?
      </p>
      <p className="mt-2 leading-relaxed text-[var(--dim)]">
        Sometimes it's not an urge — it's a heaviness, or a worry that won't switch off. Below are the same two short
        check-ins doctors use in the office: the PHQ-9 for low mood and depression symptoms, and the GAD-7 for anxiety.
        Together they take about three minutes.
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        This is a <strong>screening tool, not a diagnosis</strong>. Only a clinician who knows you can say what's going
        on. What a score <em>can</em> do is give you a concrete number to bring to that conversation — and a way to
        notice change over time. Your answers themselves are scored right here on this screen and never saved or
        sent anywhere — finishing a check-in earns points for each question you answered, and that's all that leaves this screen.
      </p>

      <p className="mt-6 leading-relaxed text-[var(--text)]">
        Over the <strong>last 2 weeks</strong>, how often have you been bothered by each of these?
      </p>

      <div className="mt-4">
        <Screener
          title="Am I depressed? — the PHQ-9"
          subtitle="Nine questions about mood, sleep, energy, and interest. Answer for the last 2 weeks, honestly — nobody sees this but you."
          questions={PHQ9_QUESTIONS}
          answers={phq}
          onAnswer={setAnswer(setPhq)}
        />
      </div>

      {selfHarmFlag && (
        <div className="felt-card mt-4 rounded-[var(--radius)] border-2 border-[var(--crisis)] bg-[var(--crisis-soft)] p-5" role="alert">
          <p className="text-lg font-bold text-[var(--text)]">Please read this — you matter</p>
          <p className="mt-1 leading-relaxed text-[var(--text)]">
            You answered that you've had thoughts of being better off dead, or of hurting yourself. Please don't sit
            with that alone. Call or text <a className="font-bold underline" href="tel:988">988</a> — the Suicide &amp;
            Crisis Lifeline — right now. It's free, confidential, and answered by people who take this seriously, 24/7.
            If you might act on these thoughts, call <a className="font-bold underline" href="tel:911">911</a>.
          </p>
          <a href="tel:988" className="felt-btn mt-3 flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-[var(--crisis)] px-4 text-base font-bold text-white">
            Call or text 988 now
          </a>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
            Prefer to type? Chat with a counselor at 988lifeline.org. You can also tell a doctor, a friend, or anyone
            you trust — saying it out loud is a strong first step, not a burden on them.
          </p>
        </div>
      )}

      {phqDone && (
        <div className="mt-4">
          <ScoreResult kind="phq9" title="Your PHQ-9 score (depression symptoms)" score={phqScore} max={27} />
        </div>
      )}

      <div className="mt-8">
        <Screener
          title="What about anxiety? — the GAD-7"
          subtitle="Seven questions about worry and tension, again for the last 2 weeks."
          questions={GAD7_QUESTIONS}
          answers={gad}
          onAnswer={setAnswer(setGad)}
        />
      </div>

      {gadDone && (
        <div className="mt-4">
          <ScoreResult kind="gad7" title="Your GAD-7 score (anxiety symptoms)" score={gadScore} max={21} />
        </div>
      )}

      {(phqDone || gadDone) && (
        <div className="felt-card mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="font-semibold text-[var(--text)]">What to do with these numbers</p>
          <ul className="mt-2 space-y-2">
            <li className="leading-relaxed text-[var(--text)]">Write the score(s) and today's date on paper — or say them to Muse — and bring them to your doctor. “My PHQ-9 was 14” starts a much better conversation than “I've been feeling off.”</li>
            <li className="leading-relaxed text-[var(--text)]">A score in the moderate range or higher is a good reason to book an appointment even if you feel you “should” be able to handle it.</li>
            <li className="leading-relaxed text-[var(--text)]">Low mood and anxiety often travel with drinking, smoking, gambling, and drug use — each makes the other harder. The other tabs in this app, and the help below, are for exactly that tangle.</li>
          </ul>
          <button type="button" onClick={startOver} className="felt-btn mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--accent)] bg-[var(--surface)] px-4 font-semibold text-[var(--accent)]">
            Start over
          </button>
          {answeredCount > 0 && <p className="mt-2 text-center text-xs text-[var(--dim)]">Answers live only on this screen — leaving this tab clears them.</p>}
        </div>
      )}

      <Section title="Help for low mood and anxiety">
        <div className="space-y-3">
          <ResourceLink name="988 Suicide & Crisis Lifeline" detail="Call or text 988 any time, for any emotional distress — you don't have to be in crisis to call. Chat at 988lifeline.org." phone="988" phoneLabel="988" />
          <ResourceLink name="SAMHSA National Helpline" detail="Also covers mental health, not just substances: 24/7 referrals to local treatment and support, free and confidential, English and Spanish." phone="18006624357" phoneLabel="1-800-662-4357" href="https://www.samhsa.gov/find-help/helplines/national-helpline" />
        </div>
      </Section>

      <p className="mt-8 text-sm leading-relaxed text-[var(--dim)]">
        About these check-ins: the PHQ-9 and GAD-7 were developed by Drs. Robert L. Spitzer, Janet B.W. Williams, and
        Kurt Kroenke, with colleagues, and are the standard screening instruments used in primary care. They are
        provided free for personal and clinical use. Screening is a first step — it is not a diagnosis, and a low
        score doesn't rule out something worth treating.
      </p>
    </div>
  );
}

/* ---------- food: eating-disorder support + SCOFF screener ---------- */

// The SCOFF is the five-question eating-disorder screener doctors use
// (Morgan, Reid & Lacey, BMJ 1999): one point per "yes", and two or more
// "yes" answers is the flag for a fuller conversation. It is screening,
// not a diagnosis, and it was designed around restricting and purging
// patterns — it can miss binge eating and other struggles.
// One deliberate adaptation: the original third question names a specific
// amount of weight lost. This tab uses no weight numbers, calories, or
// diet content at all, so that question is asked without the amount.
const SCOFF_QUESTIONS: { keyword: string; text: string }[] = [
  { keyword: "Sick", text: "Do you make yourself sick — throw up — because you feel uncomfortably full?" },
  { keyword: "Control", text: "Do you worry you have lost control over how much you eat?" },
  { keyword: "Over time", text: "Have you recently lost a noticeable amount of weight over a short time — a few months?" },
  { keyword: "Fat", text: "Do you believe yourself to be fat when other people say you are too thin?" },
  { keyword: "Food", text: "Would you say that food dominates your life?" },
];

type FoodMoment = "restrict" | "binge" | "purge";

const MOMENT_STEPS: Record<FoodMoment, { heading: string; steps: string[] }> = {
  restrict: {
    heading: "The urge to skip, shrink, or put off eating",
    steps: [
      "This urge often gets louder the longer it has been since you last ate. That is biology asking for fuel — not a failure of willpower, and not a sign you should wait longer.",
      "If you have regular eating times or a meal plan from your doctor, dietitian, or therapist, let the plan decide for the next hour — not the urge. Eating by the clock, even when feelings argue, is a real recovery tool.",
      "Eat with someone, or tell someone you are eating, if company makes it easier to get through the meal.",
      "Use the pause below, then have the next planned meal or snack. Skipping now often sets up a binge later — regular fuel protects you from both ends of the cycle.",
    ],
  },
  binge: {
    heading: "The urge to binge — or a binge has started",
    steps: [
      "Step out of the kitchen, or put some physical distance between you and the food for a few minutes. The pause matters more than perfection.",
      "Cold water on your face, or holding something cold, can help turn the volume down while the wave passes.",
      "If eating has already started, you can still stop partway. “Already ruined” is the eating disorder talking — it is not the truth, and stopping now is a real win.",
      "Afterwards: no punishment, and no skipping the next meal to “make up for it.” Shame and hunger are the fuel for the next binge. A normal next meal is how the cycle breaks.",
    ],
  },
  purge: {
    heading: "The urge to purge or “make up for” eating",
    steps: [
      "Urges to purge usually fade if you can get through the first stretch after eating — about twenty minutes for most people. Start the pause below, stay with people, and stay out of the bathroom if you can.",
      "Call or sit with someone. This urge is much stronger when you are alone with it.",
      "Say it out loud if it helps: one meal does not change your body. The discomfort peaks, and then it passes — the same way the urge does.",
      "If you have already purged, be gentle with yourself — it is a symptom, not a verdict. Rinse your mouth with water rather than brushing your teeth straight away; that is kinder to them.",
    ],
  },
};

function FoodPause() {
  return (
    <StepPause
      borderClass="border-[var(--leaf)]"
      buttonClass="bg-[var(--leaf)]"
      title="A pause — as long as you need"
      hook="No clock on you here. This pause runs until you end it — not three minutes, not forever-by-force, just as long as you need while the wave does its worst. It peaks, and then it passes, and you decide when you're done."
      earlyMsg="You don't have to decide anything about food while this wave is at its loudest. Just breathe."
      midMsg="Urges feel permanent. They aren't — they rise, they peak, and they come down."
      lateMsg="Whatever you choose next, you're choosing it a little more clearly than the urge wanted."
      doneBody="If the urge is still loud, begin again below — or call one of the people further down. Pausing again is always allowed."
      stopLabel="End the pause"
    />
  );
}

function FoodPage() {
  const { awardFields } = usePoints();
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => SCOFF_QUESTIONS.map(() => null));
  const [moment, setMoment] = useState<FoodMoment | null>(null);

  const done = answers.every((a) => a != null);
  const yesCount = answers.filter((a) => a === true).length;
  const flagged = done && yesCount >= 2;

  // Each answered question is a field filled in: +5 each, once per visit
  // when the check-in is complete. The answers themselves still never
  // leave this screen — only the count is reported.
  const scoffAwardedRef = useRef(false);
  useEffect(() => {
    if (done && !scoffAwardedRef.current) { scoffAwardedRef.current = true; awardFields("food", SCOFF_QUESTIONS.length); }
  }, [done, awardFields]);

  return (
    <div>
      <TabPointsChip tab="food" />
      <FoodHook />
      <div className="sunrise-band mb-5 flex items-center gap-3 rounded-[var(--radius)] px-4 py-3" aria-hidden="true">
        <svg width="40" height="28" viewBox="0 0 30 22" className="shrink-0">
          <path d="M3 19a12 12 0 0 1 24 0Z" fill="#ffd35c" stroke="#e8763a" strokeWidth="1.6" />
          <g stroke="#e8763a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 1.5v3" /><path d="M6.5 4.5l2 2.4" /><path d="M23.5 4.5l-2 2.4" />
          </g>
          <path d="M0 19.5h30" stroke="#5d8f4e" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="flex gap-1">
          {FLOWER_COLORS.slice(0, 5).map((c) => (
            <FlowerIcon key={c} color={c} size={24} />
          ))}
        </span>
      </div>

      <p className="font-display text-2xl font-semibold leading-snug text-[var(--text)]">
        Food, eating, and you — support first
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        If eating, not eating, or worrying about your body has started to run your life, you are in the right place —
        and you are not vain, weak, or alone in it. Eating disorders are real illnesses, a mix of biology, brain, and
        life circumstances. They are not a choice, they affect people of every body size, age, and gender, and recovery
        is real and common, especially with support.
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        This tab is kept free of weight numbers, calorie counts, and diet advice — on purpose. Those things don't help
        recovery, and they can make it harder. What you'll find here instead: a gentle check-in, help for the hard
        moment, and people who understand.
      </p>

      <DisclaimerShort />
      <div className="mt-5"><CrisisStrip /></div>

      <div className="felt-soft mt-5 rounded-[var(--radius)] bg-[var(--crisis-soft)] p-4">
        <p className="font-semibold text-[var(--text)]">When it's medical — get help today</p>
        <p className="mt-1 leading-relaxed text-[var(--text)]">
          Eating disorders can quietly strain the heart and body. Fainting or feeling faint, a heart that races,
          pounds, or skips, vomiting and not being able to keep fluids down, or feeling very weak or confused are
          reasons to seek urgent care or call <a className="font-semibold underline" href="tel:911">911</a> today —
          not someday. And if you ever feel you might hurt yourself, call or text{" "}
          <a className="font-semibold underline" href="tel:988">988</a> right away.
        </p>
      </div>

      <Section title="Calming breathing">
        <CalmingBreathing />
      </Section>

      <Section title="A gentle check-in — the SCOFF questions">
        <p className="leading-relaxed text-[var(--text)]">
          Doctors use a five-question check-in called the SCOFF to notice when eating may be becoming a problem.
          Answer honestly — nobody sees this but you. Your answers are scored right here on this screen and never
          saved or sent anywhere — finishing earns points for each question you answered, and that's all that leaves this screen.
        </p>
        <p className="mt-2 leading-relaxed text-[var(--text)]">
          This is <strong>screening, not a diagnosis</strong>. Only a clinician who knows you can say what's going on.
          What this can do is help you decide — and give you something concrete to bring to that conversation.
        </p>
        <ol className="mt-4 space-y-3">
          {SCOFF_QUESTIONS.map((q, qi) => (
            <li key={q.keyword} className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="leading-relaxed text-[var(--text)]">
                <span className="font-semibold">{qi + 1}. {q.keyword} — </span>{q.text}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={`Question ${qi + 1}: ${q.text}`}>
                {([true, false] as const).map((v) => {
                  const selected = answers[qi] === v;
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? v : a)))}
                      className={`min-h-11 rounded-xl px-3 text-sm font-medium ${selected ? "felt-btn bg-[var(--leaf)] text-white" : "felt-soft border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {done && (
          <div className="felt-soft mt-4 rounded-[var(--radius)] bg-[var(--accent-soft)] p-5" aria-live="polite">
            <p className="text-sm font-medium text-[var(--dim)]">Your SCOFF check-in</p>
            <p className="mt-1 text-3xl font-bold text-[var(--text)]">
              {yesCount} <span className="text-base font-medium text-[var(--dim)]">of 5 answered “yes”</span>
            </p>
            {flagged ? (
              <p className="mt-2 leading-relaxed text-[var(--text)]">
                Two or more “yes” answers is the point where doctors would want a fuller conversation about eating.
                That is not a diagnosis — it is a strong, kind reason to take the next step: tell your doctor (you can
                say “I answered yes to {yesCount} of the SCOFF questions”), or call ANAD below for support and help
                finding treatment. You deserve support with this, and earlier is easier than later.
              </p>
            ) : (
              <p className="mt-2 leading-relaxed text-[var(--text)]">
                That's below the SCOFF's flag of two or more “yes” answers. It does not rule anything out — the SCOFF
                was designed around restricting and purging, and it can miss binge eating and other struggles. If food,
                eating, or body worries are taking up space in your life, that alone is reason enough to talk to a
                doctor or call one of the helplines below.
              </p>
            )}
            <button type="button" onClick={() => setAnswers(SCOFF_QUESTIONS.map(() => null))} className="mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--accent)] px-4 font-semibold text-[var(--accent)]">
              Start over
            </button>
          </div>
        )}
      </Section>

      <Section title="In the hard moment">
        <p className="leading-relaxed text-[var(--text)]">
          An urge to restrict, binge, or purge feels urgent and permanent. It is neither — it is a wave, and waves
          come down. What's happening right now?
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What kind of urge is happening right now?">
          {([
            ["restrict", "Urge to restrict"],
            ["binge", "Urge to binge"],
            ["purge", "Urge to purge"],
          ] as [FoodMoment, string][]).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={moment === m}
              onClick={() => setMoment(m)}
              className={`min-h-12 rounded-[var(--radius)] px-3 font-semibold ${moment === m ? "felt-btn bg-[var(--leaf)] text-white" : "felt-soft border-2 border-[var(--leaf)] bg-[var(--surface)] text-[var(--text)]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {moment && (
          <div className="mt-4">
            <h3 className="font-display text-lg font-semibold text-[var(--text)]">{MOMENT_STEPS[moment].heading}</h3>
            <div className="mt-2"><BulletList items={MOMENT_STEPS[moment].steps} /></div>
          </div>
        )}

        <div className="mt-4"><FoodPause /></div>

        <div className="felt-card mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="font-semibold text-[var(--text)]">A person to talk to, right now</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
            You don't have to ride this out alone. A trusted person of your own, or one of these:
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <a href="tel:988" className="felt-btn flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-[var(--crisis)] px-4 text-base font-bold text-white">
              Call or text 988 — 24/7, for any distress
            </a>
            <a href="tel:18883757767" className="felt-btn flex min-h-12 items-center justify-center rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--surface)] px-4 text-base font-semibold text-[var(--text)]">
              Call ANAD — 1-888-375-7767 (Mon–Fri)
            </a>
            <p className="text-sm leading-relaxed text-[var(--dim)]">
              Prefer to type? Text <span className="font-semibold text-[var(--text)]">HOME</span> to{" "}
              <span className="font-semibold text-[var(--text)]">741741</span> for the Crisis Text Line — free, 24/7.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Worth knowing">
        <BulletList items={[
          "You cannot tell by looking. Eating disorders happen in every kind of body — and you do not have to look a certain way, or be “sick enough,” to deserve help.",
          "Restricting, bingeing, and purging often travel together in one cycle, and secrecy and shame keep it spinning. Saying it out loud to one safe person is how the cycle starts to break.",
          "For family and friends: comments about bodies, weight, or “just eat” almost never help. Asking “how can I support you at meals?” does.",
          "Recovery usually takes more than willpower: a doctor for the physical side, a therapist or dietitian who knows eating disorders, and people who understand. Needing that team is normal — it is how recovery works.",
        ]} />
      </Section>

      <Section title="Real help — free and confidential">
        <div className="space-y-3">
          <ResourceLink
            name="ANAD — Eating Disorders Helpline"
            detail="Free, peer-led support and treatment referrals from the National Association of Anorexia Nervosa and Associated Disorders — people who understand, for you or for someone you love. It isn't a crisis line; for crisis, use 988. Monday–Friday, 9am–9pm Central. ANAD also runs free virtual peer support groups."
            phone="18883757767"
            phoneLabel="1-888-375-7767"
            href="https://anad.org/eating-disorder-helpline/"
          />
          <ResourceLink
            name="National Alliance for Eating Disorders — Helpline"
            detail="A helpline staffed by licensed therapists, plus referrals to care and free support groups. Monday–Friday, 9am–7pm Eastern. Find them at allianceforeatingdisorders.com."
            phone="18666621235"
            phoneLabel="1-866-662-1235"
          />
          <ResourceLink
            name="NEDA — National Eating Disorders Association"
            detail="NEDA's website is its main door now: a free, confidential screening tool, a searchable finder for in-person and virtual treatment, and free and low-cost support options. One honest note: NEDA closed its old phone helpline in 2023, so for a person to talk to, call ANAD or the Alliance above — or 988 any time."
            href="https://www.nationaleatingdisorders.org/help-support/contact-helpline"
          />
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-semibold text-[var(--text)]">Your own doctor</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
              A regular doctor is a real first step, not a last resort. They can check the physical side — heart, blood
              pressure, blood tests — and refer you to eating-disorder care. Bring your SCOFF answers: “I answered yes
              to some of the eating check-in questions” is a complete way to start the conversation.
            </p>
          </div>
          <ResourceLink
            name="988 Suicide & Crisis Lifeline"
            detail="Call or text 988 any time, for any emotional distress — including feeling unsafe around food or urges to hurt yourself. You don't have to be in crisis to call. Chat at 988lifeline.org, or text HOME to 741741 for the Crisis Text Line."
            phone="988"
            phoneLabel="988"
          />
        </div>
      </Section>

      <p className="mt-8 text-sm leading-relaxed text-[var(--dim)]">
        About this check-in: the SCOFF questionnaire was developed by John F. Morgan, Fiona Reid, and J. Hubert Lacey
        (BMJ, 1999) and is the standard brief screener for eating disorders. One question is softened here — the
        original names a specific amount of weight, and this tab doesn't use weight numbers; if your weight has been
        changing quickly, that is worth telling a doctor either way. Screening is a first step — it is not a
        diagnosis, and a low score doesn't rule out something worth treating.
      </p>
    </div>
  );
}

/* ---------- screens: help for putting the screen down ---------- */

// This tab's check-in answers and phone-free picks are never saved or
// sent — a tab about screen addiction that hoarded your data would be
// missing its own point. Points work here like everywhere in the app:
// every tap earns +1, and each answered check-in question earns +5 —
// only those counts are ever reported, never the answers. This tab is
// also the one place the 30-second step-up pause stays — everywhere
// else, pauses are open-ended. This one's whole job is to help you put
// the phone down and go live your life.

const SCREEN_CHECKIN: { question: string; options: string[] }[] = [
  {
    question: "Yesterday, roughly how much time went to screens outside of work and real errands — scrolling, feeds, videos, games?",
    options: ["Under an hour", "1 to 3 hours", "3 to 5 hours", "More than 5 hours"],
  },
  {
    question: "How do you usually feel after a long session of scrolling?",
    options: ["Fine — rested or caught up", "Flat, drained, a bit empty", "Worse — restless, anxious, or low"],
  },
  {
    question: "Sleep: does the phone come to bed with you?",
    options: ["No — it sleeps somewhere else", "Sometimes — I scroll in bed now and then", "Nearly every night — it's the last thing I see"],
  },
  {
    question: "And your mood, over the past couple of weeks?",
    options: ["Pretty good, mostly", "Up and down", "Mostly low"],
  },
];

// The point of the pause ending: not another screen activity — a real one.
const REAL_THINGS: string[] = [
  "Step outside and look at the actual sky for a minute. Weather counts as content.",
  "Make a cup of tea or coffee, or a real snack, and have it away from any screen.",
  "Call or visit a real person. If you text them, put the phone down right after.",
  "Take a short walk — around the block is plenty. Leave the phone at home if you can.",
  "Do one small real-world thing you've been putting off: a dish, a drawer, a plant that needs water.",
  "Sit with a book, the radio, music, or a window for ten minutes. Boredom is not an emergency — it's where ideas come from.",
];

function ScreensPause() {
  return (
    <StepPause
      mode="steps"
      borderClass="border-[var(--leaf)]"
      buttonClass="bg-[var(--leaf)]"
      title="The pause — start with 30 seconds"
      hook="Thirty seconds. That's the whole ask. Five minutes is an eternity when the scroll is calling, so we never start there — thirty seconds of breathing, and then you decide what happens next."
      earlyMsg="The pull is loudest right now. You don't have to obey it — just let it talk while you breathe."
      midMsg="Notice: nothing bad is happening. The feed is not missing you. This quiet is the good stuff."
      lateMsg="Almost there. The itch to check is getting quieter — it always does when it isn't fed."
      doneBody="The urge had its say — and it passed, like they all do."
      stopLabel="Stop the pause"
      completionExtra={(
        <div className="mt-4 text-left">
          <p className="font-display text-lg font-semibold text-[var(--text)]">Now — go do the real thing instead:</p>
          <div className="mt-2"><BulletList items={REAL_THINGS} /></div>
        </div>
      )}
    />
  );
}

const PHONE_FREE_PLAN: { zone: string; intro: string; ideas: string[] }[] = [
  {
    zone: "Bedtime",
    intro: "The last hour of the day sets up the whole night's sleep.",
    ideas: [
      "Charge the phone outside the bedroom — or across the room, out of arm's reach.",
      "Last check an hour before bed. Whatever it is, it will still be there in the morning.",
      "Use a plain alarm clock, or the phone's alarm from across the room, so the phone isn't the last thing you touch at night.",
    ],
  },
  {
    zone: "Meals",
    intro: "Food tastes better, and people talk more, when the phone isn't at the table.",
    ideas: [
      "Phone in another room while you eat — not face-down on the table. Actually away.",
      "No scrolling through the first bites. Give the meal a few minutes to just be a meal.",
      "Eating with someone? Whoever reaches for their phone first makes the tea.",
    ],
  },
  {
    zone: "The first hour of the day",
    intro: "The first hour sets the day's thermostat. Don't hand it to a feed.",
    ideas: [
      "No phone until you've had water, daylight, and something to eat.",
      "Check the weather out the window first. Then decide whether you still need the app.",
      "Let the morning be yours before it's the world's — news and messages can wait one hour.",
    ],
  },
];

function ScreensPage() {
  const { award, awardFields } = usePoints();
  const [answers, setAnswers] = useState<(number | null)[]>(() => SCREEN_CHECKIN.map(() => null));
  const [picked, setPicked] = useState<string[]>([]);
  // "I turned my screen off" — worth +10, on the user's own word. The
  // app can't check whether a screen went off, and it doesn't pretend
  // to: this is self-assessment, and an honest self-report is better
  // than nothing. Once per visit to this tab (the tab remounts each
  // time it's opened), so each real screen-off moment can count.
  const [screenOff, setScreenOff] = useState(false);
  const claimScreenOff = () => {
    if (screenOff) return;
    setScreenOff(true);
    award("screens", "screenOff");
  };

  const done = answers.every((a) => a != null);
  const timeA = answers[0] ?? null;
  const feelA = answers[1] ?? null;
  const sleepA = answers[2] ?? null;
  const moodA = answers[3] ?? null;

  const reflection: string[] = [];
  if (done) {
    if (timeA === 3) reflection.push("More than five hours a day is a big share of a life — and you clearly already suspect it isn't giving that time back.");
    else if (timeA === 2) reflection.push("Three to five hours a day adds up to a full day every week. That's not a character flaw — feeds are engineered to take exactly that much. But it is worth taking some of it back.");
    else if (timeA === 1) reflection.push("One to three hours a day is moderate — the question that matters more is the next one: what those hours leave behind.");
    else if (timeA === 0) reflection.push("Under an hour a day — your time isn't the main issue. How it leaves you feeling matters more.");
    if (feelA === 2) reflection.push("And it leaves you feeling worse than before you picked it up. That is the clearest signal there is: the scroll is costing you, not resting you.");
    else if (feelA === 1) reflection.push("That flat, drained feeling afterwards is the tell. Real rest leaves you fuller; the scroll leaves you emptier. Your body already knows the difference.");
    if (sleepA === 2) reflection.push("The phone in bed is the highest-leverage one to change first. Scrolling in bed delays sleep and thins it out — and tired people scroll more the next day. The bedtime part of the plan below is aimed right at this.");
    else if (sleepA === 1) reflection.push("Scrolling in bed now and then is worth watching — it's the habit that most quietly grows.");
    if (moodA === 2) reflection.push("You said your mood has been mostly low. Screens can be a symptom as much as a cause — when life feels heavy, the scroll is an easy place to hide, and hiding can deepen it. The “Feeling Unwell?” tab has the same depression and anxiety check-ins doctors use, and a real conversation beats any feed.");
    reflection.push("You don't have to fix all of this. Pick one small change from the phone-free plan below — the smallest one — and start there tonight. Small beats heroic, every time.");
  }

  // Each answered question is a field filled in: +5 each, once per visit
  // when the check-in is complete. The answers themselves still never
  // leave this screen — only the count is reported.
  const checkinAwardedRef = useRef(false);
  useEffect(() => {
    if (done && !checkinAwardedRef.current) { checkinAwardedRef.current = true; awardFields("screens", SCREEN_CHECKIN.length); }
  }, [done, awardFields]);

  const togglePick = (idea: string) => {
    setPicked((prev) => (prev.includes(idea) ? prev.filter((x) => x !== idea) : [...prev, idea]));
  };

  return (
    <div>
      <TabPointsChip tab="screens" />
      <ScreensHook />
      <div className="sunrise-band mb-5 flex items-center gap-3 rounded-[var(--radius)] px-4 py-3" aria-hidden="true">
        <svg width="40" height="28" viewBox="0 0 30 22" className="shrink-0">
          <path d="M3 19a12 12 0 0 1 24 0Z" fill="#ffd35c" stroke="#e8763a" strokeWidth="1.6" />
          <g stroke="#e8763a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 1.5v3" /><path d="M6.5 4.5l2 2.4" /><path d="M23.5 4.5l-2 2.4" />
          </g>
          <path d="M0 19.5h30" stroke="#5d8f4e" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="flex gap-1">
          {FLOWER_COLORS.slice(0, 5).map((c) => (
            <FlowerIcon key={c} color={c} size={24} />
          ))}
        </span>
      </div>

      <p className="font-display text-2xl font-semibold leading-snug text-[var(--text)]">
        Screens — help for putting this one down
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        Yes, this tab lives on a screen. It knows. Think of it as the one corner of your phone that is on your side —
        its whole job is to help you close it and go do something real. The doomscroll, the “just one more video,” the
        phone in bed, the reach for the pocket every time life gets quiet for ten seconds: same craving circuit as the
        other tabs, wearing a glowing rectangle.
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        Your check-in answers and phone-free picks are never saved or sent anywhere — a tab about putting the
        screen down shouldn't be collecting you. (Points still work here like everywhere in the app — every tap
        earns +1, each answered question +5, and turning your screen off earns +10, on your own word, with the
        button at the bottom of this tab — and those counts are the only trace, and they're yours.) Answer the
        check-in, borrow what helps, and leave.
      </p>

      <div className="mt-5"><CrisisStrip /></div>

      <Section title="Calming breathing">
        <p className="mb-3 leading-relaxed text-[var(--text)]">
          Yes — a breathing exercise, on the screen, in the tab about putting the screen down. Take these few slow
          breaths, and then let the exercise be the last thing this screen asks of you for a while.
        </p>
        <CalmingBreathing />
      </Section>

      <Section title="A quick check-in">
        <p className="leading-relaxed text-[var(--text)]">
          Four honest questions — time, aftermath, sleep, and mood. Nobody sees the answers but you; they're weighed
          right here on this screen. Each answered question earns +5 points.
        </p>
        <ol className="mt-4 space-y-3">
          {SCREEN_CHECKIN.map((q, qi) => (
            <li key={q.question} className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="leading-relaxed text-[var(--text)]">
                <span className="font-semibold">{qi + 1}. </span>{q.question}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Question ${qi + 1}: ${q.question}`}>
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                      className={`min-h-11 rounded-xl px-3 text-left text-sm font-medium ${selected ? "felt-btn bg-[var(--leaf)] text-white" : "felt-soft border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {done && (
          <div className="felt-soft mt-4 rounded-[var(--radius)] bg-[var(--accent-soft)] p-5" aria-live="polite">
            <p className="text-sm font-medium text-[var(--dim)]">The honest picture you just painted</p>
            <div className="mt-2 space-y-2">
              {reflection.map((r) => (
                <p key={r} className="leading-relaxed text-[var(--text)]">{r}</p>
              ))}
            </div>
            <button type="button" onClick={() => setAnswers(SCREEN_CHECKIN.map(() => null))} className="mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--accent)] px-4 font-semibold text-[var(--accent)]">
              Start over
            </button>
          </div>
        )}
      </Section>

      <Section title="When the doomscroll pulls">
        <p className="leading-relaxed text-[var(--text)]">
          The urge to keep scrolling feels like curiosity. It usually isn't — and it fades the same way every urge in
          this app fades, if you give it a few minutes unfed.
        </p>
        <div className="mt-3">
          <BulletList items={[
            "Name what you're actually hunting for. News? Company? A laugh? Numbness? The feed almost never delivers it — go get the real version instead.",
            "Put distance between you and the phone: another room, a drawer, face-down across the room. Willpower is weak; distance is strong.",
            "Remember, there is no bottom. The feed is built to never say “you're all caught up” — so “just one more” is a door that never closes. Closing it mid-scroll is the win.",
            "Ask the question your check-in already answered: how will I feel in ten minutes if I keep going?",
            "Then start the pause below — it begins at just 30 seconds, and only grows if you ask it to. When it ends, go do the real thing instead of the next scroll.",
          ]} />
        </div>
        <div className="mt-4"><ScreensPause /></div>
      </Section>

      <Section title="Your phone-free plan">
        <p className="leading-relaxed text-[var(--text)]">
          Three times of day when the phone does its quietest damage: bedtime, meals, and the first hour. Tap the
          small changes you'd actually try — the picks themselves stay on this screen, and every tap earns its
          point like everywhere in the app. One is plenty to start.
        </p>
        <div className="mt-4 space-y-4">
          {PHONE_FREE_PLAN.map((z) => (
            <div key={z.zone} className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-display text-lg font-semibold text-[var(--text)]">{z.zone}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">{z.intro}</p>
              <div className="mt-3 space-y-2">
                {z.ideas.map((idea) => {
                  const on = picked.includes(idea);
                  return (
                    <button
                      key={idea}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => togglePick(idea)}
                      className={`flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm leading-relaxed ${on ? "felt-btn bg-[var(--leaf)] font-semibold text-white" : "felt-soft border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
                    >
                      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold ${on ? "border-white bg-white/20 text-white" : "border-[var(--dim)] text-transparent"}`}>✓</span>
                      <span>{idea}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {picked.length > 0 && (
          <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]" aria-live="polite">
            You've picked {picked.length} {picked.length === 1 ? "change" : "changes"}. Start with just one tonight —
            the smallest one. The rest will keep.
          </p>
        )}
      </Section>

      <Section title="The real win: screen off">
        <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-center">
          <p className="leading-relaxed text-[var(--text)]">
            Everything on this tab is just talk until the screen actually goes dark. So here's the deal, on the
            honour system: when you've turned your screen off — really off, phone face-down or in another room —
            say so, and take <strong>+10 points</strong>. We can't check, and we won't try. It's self-assessment:
            your word, your points. And self-assessment is better than nothing — the person you're reporting to
            is you.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
            Tap the button as you put the phone down — or first thing when you come back, if the moment already
            happened. Once per visit to this tab; every real screen-off moment can count.
          </p>
          {!screenOff ? (
            <button type="button" onClick={claimScreenOff} aria-label="I turned my screen off — claim 10 points" className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 text-base font-semibold text-white">
              I turned my screen off · +10 points
            </button>
          ) : (
            <div aria-live="polite">
              <p className="mt-4 font-display text-lg font-bold text-[var(--text)]">+10 points — screen off, on your word. ✓</p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--dim)]">
                That's the win this whole tab is for. Now go live it — we'll be here when you actually need us.
              </p>
            </div>
          )}
        </div>
      </Section>

      <div className="felt-card mt-10 rounded-[var(--radius)] border-4 border-[var(--sun)] bg-[var(--amber-soft)] px-5 py-6 text-center">
        <p className="font-display text-2xl font-black leading-snug text-[var(--text)] sm:text-3xl">
          You came here for help. You got it. Now go live it.
        </p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-[var(--text)]">
          Seriously — close this app, put the phone down somewhere it isn't, and go do one real thing. We'll be here
          if you need us again. That's the whole idea.
        </p>
      </div>
    </div>
  );
}

/* ---------- longevity: healthy living, hope and purpose ---------- */

// Longevity is not a quit tab and not a treatment. It is the other
// side of quitting: the small, free, everyday things that actually
// help people live longer and better — sleep, walking, real food,
// not smoking, drinking less, friends, and purpose. No miracle
// claims, no expensive tests or products, nothing for sale, and no
// diagnosis. The basics only — no published studies here, by
// Richard's rule (2026-11-12): this is the starter app, and not
// everyone is a science nerd.
const LONGEVITY_CHECKIN: { question: string; options: string[] }[] = [
  {
    question: "Over the past week, how has your sleep been?",
    options: ["Mostly 7–8 hours, and I wake up rested", "Often short or broken", "Rarely enough — I am often tired"],
  },
  {
    question: "How much do you move on most days?",
    options: ["I walk or move most days", "Some movement, most days", "Very little movement"],
  },
  {
    question: "How often do you eat real, home-cooked food?",
    options: ["Most meals", "About half my meals", "Rarely — mostly quick or packaged food"],
  },
  {
    question: "Do you have something that gives your days purpose?",
    options: ["Yes, most days", "Sometimes", "Hard to say right now"],
  },
];

// The hook: pick one small thing for today — not a life overhaul,
// one thing. No points ride on it; the point is the doing.
function LongevityHook() {
  const options = [
    { id: "walk", label: "A walk today", result: "Good choice — walking is the closest thing to a free longevity drug that exists, and it costs nothing. Ten minutes counts. Around the block is a walk." },
    { id: "sleep", label: "An earlier night tonight", result: "Sleep is when the body does its repair work. An earlier night, a dark room, and the phone charging somewhere else is a real longevity plan — and it is free." },
    { id: "friend", label: "Call or see a friend", result: "Loneliness shortens lives; connection lengthens them. One real conversation today is not small talk — it is one of the strongest healthy-living tools there is." },
    { id: "food", label: "One real meal today", result: "Not a diet, not a number — one real meal, cooked simply, eaten sitting down. Your body knows what to do with real food." },
  ] as const;
  const [picked, setPicked] = useState<string | null>(null);
  const result = options.find((o) => o.id === picked)?.result;
  return (
    <HookShell pastelBg="#dcf1ee" pastelBorder="#2f8a80" title="One small thing today, for the years ahead" intro="Longevity is not a pill or a purchase. It is small things, repeated, over years. Pick one for today — just one — and let the years take care of themselves.">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pick one small thing for today">
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={picked === o.id} onClick={() => setPicked(o.id)}
            className={`min-h-12 rounded-xl px-3 font-semibold ${picked === o.id ? "felt-btn bg-[#2f8a80] text-white" : "felt-soft border-2 border-[#2f8a80] bg-white/70 text-[#2e2117]"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {result && <p className="mt-3 leading-relaxed text-[#2e2117]" aria-live="polite">{result}</p>}
    </HookShell>
  );
}

function LongevityPage() {
  // Deliberately NO awardFields here. The check-in below is a gentle
  // reflection for you alone — Richard's rule for this tab is no
  // points for the ticks. Taps anywhere in the app still earn their
  // usual +1, like everywhere else. The answers are never saved or
  // sent anywhere; they are reflected on this screen only, and this
  // is screening, not a diagnosis.
  const [answers, setAnswers] = useState<(number | null)[]>(() => LONGEVITY_CHECKIN.map(() => null));
  const done = answers.every((a) => a != null);

  const reflection: string[] = [];
  if (done) {
    const [sleepA, moveA, foodA, purposeA] = answers;
    if (sleepA === 2) reflection.push("Sleep is the one to start with. Short, broken sleep makes everything else harder — mood, appetite, willpower, even the urge to move. An earlier night and a phone that charges outside the bedroom are the cheapest fix there is.");
    else if (sleepA === 1) reflection.push("Your sleep is often short or broken. That is common, and it is worth protecting: a regular bedtime, daylight in the morning, and no scrolling in bed are small changes with a large payoff.");
    else reflection.push("Good sleep is already working for you — protect it. It is the foundation the rest of this tab builds on.");
    if (moveA === 2) reflection.push("Very little movement is the easiest place to gain ground. You do not need a gym or a programme — a ten-minute walk, most days, is a real start, and it counts from the first one.");
    else if (moveA === 1) reflection.push("You already move some, most days. A little more, a little more often — one longer walk, or a walk after a meal — is enough. Small beats heroic, every time.");
    else reflection.push("Moving most days is already a longevity habit. Keep it, and let it be the anchor for the rest.");
    if (foodA === 2) reflection.push("Real food is mostly a matter of access and time, not willpower. One home-cooked meal a day — simple, sitting down — is a fine place to start; the rest can follow.");
    else if (foodA === 1) reflection.push("About half your meals are real food. That is a solid middle — one more real meal a day, when you can, is progress without a diet or a number in sight.");
    else reflection.push("Mostly real, home-cooked food is already doing a lot of quiet work for you. No counting, no dieting — just keep it.");
    if (purposeA === 2) reflection.push("Purpose is hard to name right now — and that is honest, not a failure. This app itself was built on one person's purpose: helping one person. Yours can be small too — a person, a place, a project, a morning walk with a reason. If low mood is part of it, the “Feeling Unwell?” tab has the check-ins doctors use.");
    else if (purposeA === 1) reflection.push("Purpose comes and goes — that is normal. Notice what gives the good days their shape, and do a little more of that. Purpose is often found in the doing, not the thinking.");
    else reflection.push("Having something that gives your days purpose, most days, is one of the strongest predictors of a long, good life. Hold onto it — and share it, if you can. Purpose shared is purpose doubled.");
    reflection.push("You do not have to fix all of this. Pick the smallest change above — the one that feels almost too easy — and start there tonight. That is how years are built: one small, easy thing, repeated.");
  }

  return (
    <div>
      <TabPointsChip tab="longevity" />
      <LongevityHook />
      <div className="sunrise-band mb-5 flex items-center gap-3 rounded-[var(--radius)] px-4 py-3" aria-hidden="true">
        <svg width="40" height="28" viewBox="0 0 30 22" className="shrink-0">
          <path d="M3 19a12 12 0 0 1 24 0Z" fill="#ffd35c" stroke="#e8763a" strokeWidth="1.6" />
          <g stroke="#e8763a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 1.5v3" /><path d="M6.5 4.5l2 2.4" /><path d="M23.5 4.5l-2 2.4" />
          </g>
          <path d="M0 19.5h30" stroke="#5d8f4e" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="flex gap-1">
          {FLOWER_COLORS.slice(0, 5).map((c) => (
            <FlowerIcon key={c} color={c} size={24} />
          ))}
        </span>
      </div>

      <p className="font-display text-2xl font-semibold leading-snug text-[var(--text)]">
        Longevity — live longer, live better, start today
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        This tab is not about stopping something. It is about building something: a longer, healthier life, one
        ordinary day at a time. The honest news is that the things that help most are also the most ordinary —
        and the most free. Sleep, walking, real food, not smoking, drinking less, friends, and a reason to get
        up in the morning. No pill, no test, no programme for sale can replace them, and nobody here will try
        to sell you one.
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        If you came here from a quit tab, you are already doing longevity work: every day without a drink, a
        cigarette, or a bet is a day your body gets to repair itself. This tab is the other half of that —
        what to build, now that you have room.
      </p>

      <DisclaimerShort />
      <div className="mt-5"><CrisisStrip /></div>

      <div className="felt-soft mt-5 rounded-[var(--radius)] bg-[var(--crisis-soft)] p-4">
        <p className="font-semibold text-[var(--text)]">When it's medical — get help today</p>
        <p className="mt-1 leading-relaxed text-[var(--text)]">
          Chest pain or pressure, breathlessness, fainting or feeling faint, a heart that races, pounds, or
          skips, sudden weakness, or feeling very weak or confused are reasons to seek urgent care or call{" "}
          <a className="font-semibold underline" href="tel:911">911</a> today — not someday. And if you ever
          feel you might hurt yourself, call or text <a className="font-semibold underline" href="tel:988">988</a>{" "}
          right away. Starting to exercise, changing what you eat, or stopping a medicine is also worth a word
          with your own doctor first — especially if you have a heart condition, diabetes, or take regular
          medicines. A doctor is a real first step, not a last resort.
        </p>
      </div>

      <Section title="Calming breathing">
        <CalmingBreathing />
      </Section>

      <Section title="Vitamin D — one more free, cheap basics idea">
        <p className="leading-relaxed text-[var(--text)]">
          One more free, cheap basics idea — right up there with food, sleep, and movement. Ask your own
          doctor about checking your vitamin D — a simple blood test for 25(OH)D. In winter, in many
          northern climates, it is hard to get enough vitamin D naturally from the sun alone. Sunshine is
          the natural way our bodies make vitamin D — a little daylight
          outside most days helps, especially morning daylight. Vitamin D helps your immune system work, and
          practically every immune cell has a receptor for it. Your doctor can tell you what your level
          means for you, and whether any supplement is right for you — don&apos;t guess a dose on your own.
        </p>
      </Section>

      <Section title="A gentle check-in — sleep, movement, food, purpose">
        <p className="leading-relaxed text-[var(--text)]">
          Four honest questions about the past week. Nobody sees the answers but you; they are reflected right
          here on this screen and never saved or sent anywhere — and there are <strong>no points for these
          ticks</strong>. They are just for you, to see where you stand and where one small change might help
          most.
        </p>
        <p className="mt-2 leading-relaxed text-[var(--text)]">
          This is <strong>screening, not a diagnosis</strong> — and it is not a validated test, just a gentle
          reflection. Only a clinician who knows you can say what is going on with your health. What this can
          do is help you pick one small step, and give you something concrete to bring to a conversation with
          your doctor.
        </p>
        <ol className="mt-4 space-y-3">
          {LONGEVITY_CHECKIN.map((q, qi) => (
            <li key={q.question} className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="leading-relaxed text-[var(--text)]">
                <span className="font-semibold">{qi + 1}. </span>{q.question}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Question ${qi + 1}: ${q.question}`}>
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                      className={`min-h-11 rounded-xl px-3 text-left text-sm font-medium ${selected ? "felt-btn bg-[#2f8a80] text-white" : "felt-soft border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {done && (
          <div className="felt-soft mt-4 rounded-[var(--radius)] bg-[var(--accent-soft)] p-5" aria-live="polite">
            <p className="text-sm font-medium text-[var(--dim)]">Your gentle check-in — for your eyes only</p>
            <div className="mt-2 space-y-2">
              {reflection.map((r) => (
                <p key={r} className="leading-relaxed text-[var(--text)]">{r}</p>
              ))}
            </div>
            <button type="button" onClick={() => setAnswers(LONGEVITY_CHECKIN.map(() => null))} className="mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--accent)] px-4 font-semibold text-[var(--accent)]">
              Start over
            </button>
          </div>
        )}
      </Section>

      <Section title="The basics that actually help">
        <p className="leading-relaxed text-[var(--text)]">
          None of these are new, and none of them is for sale. That is the point: the strongest evidence in
          healthy living is for ordinary, free things, done most days, for years.
        </p>
        <div className="mt-4 space-y-3">
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Sleep — the repair shift</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Most adults need around 7–8 hours. Sleep is when the body repairs tissue, consolidates memory, and clears the day's wear. A regular bedtime, daylight in the morning, a cool dark room, and a phone that charges outside the bedroom do more than any supplement.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Movement — walking is enough to start</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">You do not need a gym, a programme, or special clothes. Walking most days — ten minutes to start, longer when you can — helps the heart, the mood, the sleep, and the waistline, all at once. If you can, walk with someone: movement and friendship in the same half hour.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Real food — no numbers, no diet</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Food cooked simply, eaten sitting down, mostly plants, with enough protein to keep you strong. This tab has no weight numbers, no calorie counting, and no diet tips — on purpose, like the Food tab. If eating is a struggle, the Food tab and its helplines are the right place, not a diet.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Not smoking, drinking less</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Stopping smoking is the single biggest longevity step most people can take, at any age — the body starts repairing within days. Drinking less helps sleep, mood, blood pressure, and the liver. Both have their own tabs in this app, with real help, free.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Friends — connection is medicine</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Loneliness is hard on the body, and on the mood. One real conversation, one shared meal, one walk with a friend — these are not extras. They are part of the plan.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Purpose — a reason to get up</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">A sense of purpose gives your days a shape — and purpose does not have to be grand. A person to care for, a garden, a project, a morning walk with a reason, helping one person: if it gives your day a shape, it counts. This app was built on exactly that kind of purpose.</p>
          </div>
        </div>
      </Section>

      <Section title="Real help — free and confidential">
        <div className="space-y-3">
          <ResourceLink
            name="Your own doctor"
            detail="A regular doctor is a real first step, not a last resort. They can check blood pressure, blood sugar, cholesterol, and the physical side of sleep, mood, and movement — and help you start exercising or changing what you eat safely, especially if you have a heart condition, diabetes, or take regular medicines. Bring your check-in answers above: “my sleep has been short most nights” is a complete way to start the conversation."
          />
          <ResourceLink
            name="SAMHSA National Helpline — 1-800-662-HELP (4357)"
            detail="Free, confidential, 24/7 — for alcohol, drugs, gambling, and mental health, for you or your family. If drinking, smoking, or low mood is standing between you and healthy living, this is the door."
            phone="18006624357"
            phoneLabel="1-800-662-4357"
            href="https://www.samhsa.gov/find-help/helplines/national-helpline"
          />
          <ResourceLink
            name="Smoking — National Quitline"
            detail="1-800-QUIT-NOW connects you to your state's quitline for free coaching. Stopping smoking is the single biggest longevity step most people can take, at any age."
            phone="18007848669"
            phoneLabel="1-800-QUIT-NOW"
            href="https://smokefree.gov/tips"
          />
          <ResourceLink
            name="988 Suicide & Crisis Lifeline"
            detail="Call or text 988 any time, for any emotional distress — you don't have to be in crisis to call. Chat at 988lifeline.org."
            phone="988"
            phoneLabel="988"
          />
        </div>
      </Section>

      <p className="mt-8 text-sm leading-relaxed text-[var(--dim)]">
        About this check-in: it is a gentle reflection the app put together from the basics above — sleep,
        movement, food, and purpose. It is not a validated screener, not a medical test, and not a diagnosis.
        Screening is a first step — it is not a diagnosis, and feeling fine on this check-in does not rule
        out something worth talking to a doctor about. This app sells nothing.
      </p>
    </div>
  );
}

/* ---------- peace of mind: spirituality, generic and optional ---------- */

// Peace of Mind is a quiet corner, not a doctrine. A lot of people use
// spirituality for wellbeing — meditation, prayer, gratitude, quiet
// time — and it is a touchy subject, so this tab names no one religion
// as the way, preaches nothing, and is always optional. Mindfulness is
// central: a short, plain-language moment — notice your breath, notice
// your body, notice one sound, no judgement. Nothing here is saved or
// sent. The one point award is self-claimed, on your own word, like the
// Screens tab's screen-off award: +10 for "I took a quiet moment",
// once per visit in the app (the button goes away after you tap it)
// and once a day on the server, so a new day can count again. The app
// can't check whether you meditated or prayed, and it doesn't try.
function PeaceHook() {
  const options = [
    { id: "quiet", label: "A minute of quiet", result: "One minute is enough. Sit down, put the phone aside, and let the minute be quiet. You don't have to feel calm for it to count — you just have to stop for a minute." },
    { id: "prayer", label: "A prayer, in my own words", result: "No set words needed. Say what you need to say, in your own words, to whoever you pray to — out loud, in your head, or written down. Your words are enough." },
    { id: "grateful", label: "One thing I'm grateful for", result: "One thing, big or small — a person, a meal, a morning, a roof. Name it, and let yourself feel it for a moment. Gratitude is a quiet kind of strength." },
    { id: "walk", label: "A slow walk outside", result: "Slow is the point. Notice the sky, the trees, the air on your face. A walk can be a prayer, a meditation, or just a walk — all three count." },
  ] as const;
  const [picked, setPicked] = useState<string | null>(null);
  const result = options.find((o) => o.id === picked)?.result;
  return (
    <HookShell pastelBg="#f3e2f0" pastelBorder="#9a5a90" title="A quiet moment, your way" intro="This is a quiet corner — meditation, prayer, gratitude, or just sitting still. There is no one right way to be quiet, and no one faith named here as the way. Pick one for today, or skip this tab entirely. It is always your choice.">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pick one quiet thing for today">
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={picked === o.id} onClick={() => setPicked(o.id)}
            className={`min-h-12 rounded-xl px-3 font-semibold ${picked === o.id ? "felt-btn bg-[#9a5a90] text-white" : "felt-soft border-2 border-[#9a5a90] bg-white/70 text-[#2e2117]"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {result && <p className="mt-3 leading-relaxed text-[#2e2117]" aria-live="polite">{result}</p>}
    </HookShell>
  );
}

function PeacePage({ onGoHome }: { onGoHome?: () => void }) {
  const { award } = usePoints();
  // "I took a quiet moment" — +10, on your own word. The app can't
  // check whether you meditated or prayed, and it doesn't pretend to:
  // this is self-assessment, and an honest self-report is better than
  // nothing. Once per visit to this tab (the tab remounts each time
  // it's opened), and the server counts it once a day.
  const [quietClaimed, setQuietClaimed] = useState(false);
  const claimQuiet = () => {
    if (quietClaimed) return;
    setQuietClaimed(true);
    award("peace", "quietMoment", localDay());
  };

  return (
    <div>
      <TabPointsChip tab="peace" />
      <PeaceHook />
      <div className="sunrise-band mb-5 flex items-center gap-3 rounded-[var(--radius)] px-4 py-3" aria-hidden="true">
        <svg width="40" height="28" viewBox="0 0 30 22" className="shrink-0">
          <path d="M3 19a12 12 0 0 1 24 0Z" fill="#ffd35c" stroke="#e8763a" strokeWidth="1.6" />
          <g stroke="#e8763a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 1.5v3" /><path d="M6.5 4.5l2 2.4" /><path d="M23.5 4.5l-2 2.4" />
          </g>
          <path d="M0 19.5h30" stroke="#5d8f4e" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="flex gap-1">
          {FLOWER_COLORS.slice(0, 5).map((c) => (
            <FlowerIcon key={c} color={c} size={24} />
          ))}
        </span>
      </div>

      <p className="font-display text-2xl font-semibold leading-snug text-[var(--text)]">
        Peace of Mind — a quiet corner, for any faith or none
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        A lot of people lean on spirituality to get through hard times — meditation, prayer, gratitude, quiet
        time, a walk outside, a hand held. This tab is for that, and it is deliberately generic: no doctrine,
        no preaching, no one religion named as the way. If you pray, pray in your own words. If you meditate,
        meditate your way. If you believe in nothing in particular, the quiet still works. And if none of this
        is your thing, skip the tab — it will still be here, and nothing here is required.
      </p>
      <p className="mt-2 leading-relaxed text-[var(--text)]">
        Nothing on this tab is saved or sent anywhere. There is no check-in, no score, and no one watching.
        The only thing the app keeps is the one point award below, and only if you tap it, on your own word.
      </p>

      <DisclaimerShort />
      <div className="mt-5"><CrisisStrip /></div>

      <Section title="Calming breathing">
        <CalmingBreathing />
      </Section>

      <Section title="A mindfulness moment — notice, don't judge">
        <p className="leading-relaxed text-[var(--text)]">
          Mindfulness is just paying attention, on purpose, without judging what you find. A minute is enough.
          Try it now, or come back to it later — there is no right way to do it, and no way to fail it.
        </p>
        <ol className="mt-4 space-y-3">
          <li className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="leading-relaxed text-[var(--text)]"><span className="font-semibold">1. Notice your breath. </span> Breathe in, breathe out — just as you are, no need to change it. Feel the air come in and go out. That is all.</p>
          </li>
          <li className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="leading-relaxed text-[var(--text)]"><span className="font-semibold">2. Notice your body. </span> Where are you tense? Where are you comfortable? Your shoulders, your hands, your jaw. Just notice — don't fix anything.</p>
          </li>
          <li className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="leading-relaxed text-[var(--text)]"><span className="font-semibold">3. Notice one sound. </span> Near or far — a clock, a bird, traffic, your own breathing. Just listen to it for a few seconds.</p>
          </li>
          <li className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="leading-relaxed text-[var(--text)]"><span className="font-semibold">4. Stop and look around. </span> Look around your environment, wherever you are — outdoors in a forest, or sitting in a chair in your home. Just look, and notice what is there.</p>
          </li>
          <li className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="leading-relaxed text-[var(--text)]"><span className="font-semibold">5. When your mind wanders, that's normal. </span> It will wander — to the shopping, to the worry, to the phone. Notice it wandering, without judging yourself for it, and gently come back to your breath. That coming back <em>is</em> the practice.</p>
          </li>
        </ol>
        <p className="mt-3 leading-relaxed text-[var(--text)]">
          No judgement — not of your thoughts, not of yourself, not of how quiet you managed to be. A wandering
          mind is a normal mind. A minute of noticing is a real quiet moment.
        </p>
        <p className="mt-3 leading-relaxed text-[var(--text)]">
          If you&apos;re feeling happy, the button is all yours —{" "}
          <button type="button" onClick={onGoHome} className="font-semibold text-[var(--accent)] underline">
            go back to Home and press it
          </button>
          .
        </p>
      </Section>

      <Section title="Ways to be quiet — pick what fits you">
        <p className="leading-relaxed text-[var(--text)]">
          These are offered as choices, not instructions. Take the one that fits you, leave the rest.
        </p>
        <div className="mt-4 space-y-3">
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Meditation — sit quietly, follow your breath</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Sit comfortably, feet on the floor, and follow your breath in and out. A minute counts. Five minutes counts more. There is no empty mind to achieve — just noticing, and coming back.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Prayer — in your own words</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Say what you need to say, in your own words, to whoever you pray to — out loud, in your head, or written down. Ask for help, say thank you, or just sit in the quiet. Your words are enough, and no one here will tell you what they should be.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Gratitude — one thing, named</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">One thing, big or small — a person, a meal, a morning, a roof, a phone call. Name it, and let yourself feel it for a moment. Gratitude is a quiet kind of strength, and it costs nothing.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Quiet time — a few minutes with nothing on</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">No phone, no television, no music, no noise — just a few minutes of quiet, with a cup of something warm if you like. Quiet is not empty time. It is where a lot of people hear themselves think.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">A walk in nature — slow, and noticing</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">Slow is the point. Notice the sky, the trees, the air on your face, the ground under your feet. A walk can be a prayer, a meditation, or just a walk — all three count.</p>
          </div>
          <div className="felt-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-display text-lg font-semibold text-[var(--text)]">Reaching out to someone — quiet can be shared</p>
            <p className="mt-1 leading-relaxed text-[var(--text)]">A kind word, a phone call, a visit, a shared meal. Quiet does not have to mean alone. Sometimes the most peaceful thing you can do is be with someone, without needing to fix anything.</p>
          </div>
        </div>
      </Section>

      <Section title="One prayer many people know — an example, only">
        <p className="leading-relaxed text-[var(--text)]">
          Richard keeps this prayer on his wall, and a lot of people in recovery know it by heart. It is here
          as an example only — use it if it helps, skip it if it doesn't. It is not a requirement, and it is
          not the app telling you what to believe.
        </p>
        <div className="felt-card mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
          <p className="font-display text-lg italic leading-relaxed text-[var(--text)]">
            “God, grant me the serenity to accept the things I cannot change, courage to change the things I
            can, and wisdom to know the difference.”
          </p>
          <p className="mt-2 text-sm text-[var(--dim)]">— the Serenity Prayer</p>
        </div>
        <p className="mt-3 leading-relaxed text-[var(--text)]">
          Accept what you cannot change, find the courage to change what you can, and the wisdom to know the
          difference — that is the whole prayer, and it is a good way to live whether you pray it or not.
        </p>
      </Section>

      <Section title="A quiet moment, on your word">
        <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-center">
          <p className="leading-relaxed text-[var(--text)]">
            If you took a quiet moment — meditation, prayer, gratitude, a mindful minute, a slow walk — say so,
            and take <strong>+10 points</strong>. We can't check, and we won't try. It's self-assessment: your
            word, your points. And self-assessment is better than nothing — the person you're reporting to
            is you.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
            Tap it once per visit to this tab. The app counts it once a day, so a new day is a new quiet moment.
          </p>
          {!quietClaimed ? (
            <button type="button" onClick={claimQuiet} aria-label="I took a quiet moment — claim 10 points" className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 text-base font-semibold text-white">
              I took a quiet moment — meditation / prayer · +10 points
            </button>
          ) : (
            <div aria-live="polite">
              <p className="mt-4 font-display text-lg font-bold text-[var(--text)]">+10 points — a quiet moment, on your word. ✓</p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--dim)]">
                That's the win this tab is for. Carry the quiet with you — we'll be here when you need us again.
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Real help — free and confidential">
        <div className="space-y-3">
          <ResourceLink
            name="988 Suicide & Crisis Lifeline"
            detail="Call or text 988 any time, for any emotional distress — you don't have to be in crisis to call. Chat at 988lifeline.org."
            phone="988"
            phoneLabel="988"
          />
          <ResourceLink
            name="SAMHSA National Helpline — 1-800-662-HELP (4357)"
            detail="Free, confidential, 24/7 — for alcohol, drugs, gambling, and mental health, for you or your family."
            phone="18006624357"
            phoneLabel="1-800-662-4357"
            href="https://www.samhsa.gov/find-help/helplines/national-helpline"
          />
          <ResourceLink
            name="Feeling low or worried?"
            detail="If low mood or worry is the main thing, the “Feeling Unwell?” tab has the same depression and anxiety check-ins doctors use (PHQ-9 and GAD-7) — and a real conversation beats any quiet moment alone."
          />
        </div>
      </Section>

      <p className="mt-8 text-sm leading-relaxed text-[var(--dim)]">
        About this tab: it is a quiet corner, not a treatment, not a diagnosis, and not a doctrine. Nothing
        here is saved or sent — no answers, no scores, no record of what you prayed, meditated on, or felt.
        The only thing kept is the point award, and only if you tap it, on your own word.
      </p>
    </div>
  );
}

/* ---------- home & resources ---------- */

// Daily check-in (Richard's "extra credit", 2026-11-11): "Today I...
// Exercised, Ate Well, Slept Well, Feel Better" — +100 points total,
// once per day, for completing it. Not 100 per item, and a successful
// quit day is also +100, so it stays fair. The ticks are never saved
// or sent anywhere — only the one award event (Home, today) is stored,
// so the server can enforce once-a-day. Done is read from the saved
// point events, so it stays done after a reload, on this device.
const DAILY_CHECKIN_ITEMS = [
  { id: "exercised", label: "Exercised" },
  { id: "ateWell", label: "Ate Well" },
  { id: "sleptWell", label: "Slept Well" },
  { id: "feelBetter", label: "Feel Better" },
] as const;

function DailyCheckin({ pointEvents }: { pointEvents: PointEvent[] }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [justDone, setJustDone] = useState(false);
  const today = localDay();
  const doneToday = justDone || pointEvents.some((e) => e.action === "dailyCheckin" && e.day === today);
  const claim = useMutation({
    mutationFn: async () => await api.awardPoints({ tab: "home", action: "dailyCheckin", day: today }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["state"] });
      if (!res.already) setJustDone(true);
      else setJustDone(true);
    },
  });
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className="felt-soft rounded-[var(--radius)] bg-[var(--amber-soft)] p-5">
      <p className="font-display text-lg font-semibold text-[var(--text)]">Today I…</p>
      {doneToday ? (
        <p className="mt-2 leading-relaxed text-[var(--text)]" aria-live="polite">
          ✓ <strong>Checked in for today — +100 points.</strong> Come back tomorrow and do it again.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
            Tick what is true today, then tap Done for <strong>+100 points, once a day</strong>. Your ticks are not
            saved or sent — only that you checked in today, for your points.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DAILY_CHECKIN_ITEMS.map((item) => {
              const on = selected.includes(item.id);
              return (
                <button key={item.id} type="button" aria-pressed={on} onClick={() => toggle(item.id)} className={`felt-btn min-h-12 rounded-[var(--radius)] px-4 font-semibold ${on ? "bg-[var(--leaf)] text-white" : "border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}>
                  {on ? "✓ " : ""}{item.label}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={selected.length === 0 || claim.isPending} onClick={() => claim.mutate()} className="felt-btn mt-3 min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white disabled:opacity-60">
            Done — claim my 100 points
          </button>
          {selected.length === 0 && <p className="mt-2 text-sm text-[var(--dim)]">Tick at least one to claim today&apos;s 100 points.</p>}
          {claim.isError && <p className="mt-2 text-sm text-[var(--crisis)]">Couldn't save that — please try again.</p>}
        </>
      )}
    </div>
  );
}

// Add to Home Screen (Richard, 2026-11-12): a short hint on Home so
// people can put RR on their phone like an app. The manifest
// (client/public/manifest.webmanifest, short_name "RR", cottage icon)
// makes the browser offer "Add to Home Screen" / "Install"; this hint
// just tells them where to find it. No app store, no download, no
// tracking — RR opens full-screen from the home screen and updates
// automatically, like the site itself.
function AddToHomeScreenHint() {
  return (
    <div className="felt-soft mb-5 flex gap-3 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--surface)] p-4" role="region" aria-label="Add RR to your home screen">
      <img src="/icons/icon-192.png" alt="" aria-hidden="true" className="h-12 w-12 shrink-0 rounded-xl" />
      <div>
        <p className="font-display text-base font-bold text-[var(--text)]">Add RR to your home screen</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--text)]">
          It takes a few taps, not one touch: in Chrome, tap the three dots, then <strong>Add to Home Screen</strong>, then <strong>Add</strong>. RR opens full-screen, like an app, and updates automatically.
        </p>
      </div>
    </div>
  );
}

// Contact for feedback (Richard, 2026-11-15, note 20): a small
// tap-to-email link, in Help & Resources and in the footer. Nothing
// required, no account, no form, no gate in front of help.
const CONTACT_EMAIL = "richardsresource3@gmail.com";

function FeedbackContact() {
  return (
    <p className="text-center text-sm leading-relaxed text-[var(--text)]">
      Questions or feedback? Email{" "}
      <a className="font-semibold text-[var(--accent)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    </p>
  );
}

// Warm Welcome intro (Richard, 2026-11-15, notes 13, 21, 22, 24;
// full cover page, Richard, 2026-11-16):
// a cottage in the sunrise field, slightly elevated porch, wooden
// front door, a welcome mat that says WELCOME, and a stepping-stone
// pathway. On first open the cottage is ALL you see — a full-screen
// cover, no tab buttons, no Home content underneath it. One tap on
// the door / sign / image opens the first page and begins the
// journey. It is NOT a gate in front of help: a small
// "I need help right now — skip the welcome" button on the cover
// itself goes straight in. Once you have come in, the full cover
// does not show again — a localStorage flag, like What's New —
// but a smaller cottage banner stays on Home above the choose line
// (Richard, 2026-11-16). The next screen says, in Richard's words:
// "please feel free to choose any option,
// you may choose as many as you like".
const WELCOME_KEY = "richards-resource:welcome-seen";
const WELCOME_CHOOSE_TEXT = "please feel free to choose any option, you may choose as many as you like";

function WelcomeCover({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="felt-page flex min-h-dvh flex-col bg-[var(--bg)]" role="region" aria-label="Welcome to Richard's Resource">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6">
        <button type="button" onClick={onEnter} aria-label="Open the door and begin — tap the cottage to enter Richard's Resource" className="felt-card block w-full cursor-pointer overflow-hidden rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--surface)] p-0 text-left">
          <img src={welcomeCottage} alt="A cottage in a sunrise field with a wooden front door, a welcome mat that says WELCOME, and a stepping-stone pathway. Tap the door to come in." className="block h-auto w-full" />
          <span className="block px-4 py-3 text-center font-display text-lg font-bold text-[var(--text)]">Welcome — tap the door to come in</span>
          <span className="block px-4 pb-4 text-center text-sm leading-relaxed text-[var(--dim)]">“open please come in” — one tap on the door, and you are in.</span>
        </button>
        {/* "We are so Happy you are here" (Richard, 2026-11-18): the
            welcome line, on the cover under the cottage. */}
        <p className="mt-4 text-center font-display text-xl font-bold text-[var(--accent)]">We are so Happy you are here</p>
        <button type="button" onClick={onEnter} className="mt-4 min-h-11 w-full cursor-pointer rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)]">
          I need help right now — skip the welcome
        </button>
      </main>
    </div>
  );
}

// After first entry, Home shows the cottage again — the FULL image,
// uncropped (h-auto, no object-cover), just above the choose line,
// on every Home visit (Richard, 2026-11-16: the cropped banner hid
// the stepping-stone pathway and the background scenery). It is the
// same WELCOME-mat image, not the full cover again, and it is not a
// button — the cover stays the only tap-to-enter version, for
// first-time visitors. The choose line follows it, in Richard's
// words (note 24, 'choose' not 'use'/'select').
function WelcomeIntro() {
  return (
    <div className="mb-5">
      <img src={welcomeCottage} alt="A cottage in a sunrise field with a wooden front door, a welcome mat that says WELCOME, and a stepping-stone pathway." className="block h-auto w-full rounded-[var(--radius)] border-2 border-[var(--sun)]" />
      <p className="felt-soft mt-3 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-3 text-center font-bold leading-relaxed text-[var(--text)]" role="note">
        {WELCOME_CHOOSE_TEXT}
      </p>
    </div>
  );
}

/* ---------- the Happy Button (Richard, 2026-11-18) ---------- */

// The Happy Button — one button only, on Home, one step down
// from the true message, after the Share button (moved
// 2026-11-23; button, wording and points all unchanged).
// No scale, no numbers, no test: a mindfulness moment —
// you stop, you notice "I'm feeling happy", and you tap it. Each
// tap raises the thermometer a clear, visible step; 8 happy moments
// fill one thermometer, it pins itself to your personal cork board
// as a little trophy, and a fresh one starts. The button is round,
// pale blue with pink lettering, and the thermometer fills with
// spring pastels (lavender, pink, butter yellow, mint, pale blue) —
// spring only, no fall colours. The card says only "I'm feeling
// happy" on top, and "Feeling Happy" above the button — no scoring
// explanation in the card itself. Points are awarded through the
// server's happyMoment action and show up in the points box below,
// like every other award.
// The thermometer and cork board live in this browser's localStorage
// only — the same pattern as the welcome flag — so clearing browser
// data or switching phones starts the cork board empty again, while
// the points survive on the server (there is no account, so there is
// no other way to keep a board). The cork board is collapsed under
// the button, tap to open, with small pinned cards so there is room
// for many more. Sound (Richard, 2026-11-18): the live button was
// silent at first — the mock-up's sound never carried over. Now it
// has its own toggle, OFF by default, like the slot sounds: one
// fixed tap tone, the same on every tap (a moment, not a degree —
// it never rises in pitch or loudness as the thermometer fills),
// and a big carnival bell when a thermometer fills and pins. Web
// Audio only, no audio files, tap-only, never on its own, and it
// follows the phone's volume and silent switch. The app's other
// calm tones are untouched — Richard says they are just right.
const HAPPY_BUTTON_KEY = "richards-resource:happy-button:v1";
const HAPPY_THERMOMETER_CAPACITY = 8;
const HAPPY_SPRING_FILL = "linear-gradient(180deg, #cdb4f0 0%, #f7a8c8 30%, #fde9a8 58%, #a8dcc0 80%, #8ec9ee 100%)";

type HappyButtonState = { current: number; pinned: number };

function loadHappyButtonState(): HappyButtonState {
  try {
    const raw = window.localStorage.getItem(HAPPY_BUTTON_KEY);
    if (!raw) return { current: 0, pinned: 0 };
    const parsed = JSON.parse(raw) as Partial<HappyButtonState>;
    const current = typeof parsed.current === "number" ? Math.max(0, Math.min(HAPPY_THERMOMETER_CAPACITY, Math.floor(parsed.current))) : 0;
    const pinned = typeof parsed.pinned === "number" ? Math.max(0, Math.floor(parsed.pinned)) : 0;
    return { current, pinned };
  } catch {
    return { current: 0, pinned: 0 };
  }
}

function HappyButton() {
  const { award } = usePoints();
  const [state, setState] = useState<HappyButtonState>(loadHappyButtonState);
  const [boardOpen, setBoardOpen] = useState(false);
  const [moment, setMoment] = useState<"idle" | "full" | "pinned">("idle");
  // Happy Button sounds (Richard, 2026-11-18): optional, OFF by
  // default, its own toggle below — the same pattern as the slot
  // sounds. Nothing plays on load; sound only ever comes from a tap.
  const [soundOn, setSoundOn] = useState(false);
  const busyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const today = localDay();

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  const save = (next: HappyButtonState) => {
    setState(next);
    safeLocalSet(HAPPY_BUTTON_KEY, JSON.stringify(next));
  };

  const push = () => {
    if (busyRef.current) return;
    // Sound first, from this tap (a user gesture, so the audio
    // engine can wake): the same tap tone every time, whatever the
    // thermometer shows — a moment, not a degree. On the tap that
    // fills the thermometer, the tap tone still plays, and the big
    // carnival bell rings with it, for the fill and the pin.
    if (soundOn) sounds.playHappySound("tap");
    // Points first: the server decides whether this push still
    // scores (up to 8 a day) — the thermometer moves either way.
    award("home", "happyMoment", today);
    const nextCurrent = state.current + 1;
    if (nextCurrent >= HAPPY_THERMOMETER_CAPACITY) {
      if (soundOn) sounds.playHappySound("bell");
      busyRef.current = true;
      setMoment("full");
      save({ current: HAPPY_THERMOMETER_CAPACITY, pinned: state.pinned });
      const pinned = state.pinned + 1;
      timerRef.current = window.setTimeout(() => {
        save({ current: 0, pinned });
        setMoment("pinned");
        busyRef.current = false;
      }, 1400);
    } else {
      setMoment("idle");
      save({ current: nextCurrent, pinned: state.pinned });
    }
  };

  const t = state.current / HAPPY_THERMOMETER_CAPACITY;
  const fillPct = Math.max(4, t * 100);
  const isFull = state.current >= HAPPY_THERMOMETER_CAPACITY;

  return (
    <div className="felt-card mb-5 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--surface)] p-5" role="region" aria-label="Happy Button">
      <p className="text-center font-display text-2xl font-bold leading-snug text-[var(--text)]">
        I&apos;m feeling <em style={{ color: "#be2a68" }}>happy</em>
      </p>
      <div className="mt-4 flex items-stretch justify-center gap-4">
        {/* Thermometer — no numbers, no scale. The sun climbs as it fills. */}
        <div className="relative flex w-[120px] shrink-0 flex-col items-center pt-1" aria-hidden="true">
          <div
            style={{
              position: "absolute", top: 0, left: "50%", width: 64, height: 64, marginLeft: -32, borderRadius: "50%",
              background: "radial-gradient(circle at 42% 38%, #fff6c9 0%, #fde9a8 55%, #f7a8c8 100%)",
              boxShadow: "0 0 0 8px rgba(253, 233, 168, .22), 0 0 32px rgba(247, 168, 200, .5)",
              transform: `translateY(${28 - t * 30}px) scale(${0.72 + t * 0.38})`,
              opacity: 0.45 + t * 0.55,
              transition: "transform 1s cubic-bezier(.22, 1, .36, 1), opacity 1s ease",
            }}
          />
          <div className="relative z-[1] mt-[44px] flex flex-col items-center">
            <div
              style={{
                position: "relative", width: 48, height: 168, borderRadius: "24px 24px 6px 6px",
                background: "color-mix(in srgb, var(--surface) 55%, #dceefb)",
                border: "3px solid color-mix(in srgb, var(--text) 55%, transparent)",
                overflow: "hidden", boxShadow: "inset 0 0 0 4px rgba(255,255,255,.35)",
              }}
            >
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${fillPct}%`, background: HAPPY_SPRING_FILL, transition: "height 1s cubic-bezier(.22, 1, .36, 1)" }} />
              <div style={{ position: "absolute", top: 8, bottom: 8, left: 8, width: 8, borderRadius: 6, background: "rgba(255,255,255,.5)", zIndex: 3 }} />
            </div>
            <div
              style={{
                position: "relative", zIndex: 2, width: 76, height: 76, marginTop: -12, borderRadius: "50%",
                border: "3px solid color-mix(in srgb, var(--text) 55%, transparent)",
                background: "radial-gradient(circle at 40% 34%, #bfe3f7 0%, #f7a8c8 58%, #cdb4f0 115%)",
                boxShadow: isFull
                  ? "inset -8px -10px 18px rgba(90,90,160,.22), inset 6px 8px 14px rgba(255,255,255,.5), 0 0 0 10px rgba(191,227,247,.35), 0 0 40px rgba(247,168,200,.7)"
                  : "inset -8px -10px 18px rgba(90, 90, 160, .22), inset 6px 8px 14px rgba(255,255,255,.45), 0 8px 18px rgba(140, 170, 220, .3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transform: isFull ? "scale(1.07)" : undefined, transition: "box-shadow .6s ease, transform .6s ease",
              }}
            >
              <svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="#fff7e0" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="24" cy="24" r="8.5" fill="#fff7e0" stroke="none" />
                <path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.5 11.5l3.5 3.5M33 33l3.5 3.5M36.5 11.5L33 15M15 33l-3.5 3.5" />
              </svg>
            </div>
          </div>
        </div>
        {/* The button itself — round, pale blue, pink lettering. */}
        <div className="flex min-w-[170px] flex-1 flex-col items-center justify-center text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: "#be2a68" }}>Feeling Happy</p>
          <button
            type="button"
            onClick={push}
            aria-label="Happy Button — I'm feeling happy"
            aria-describedby="happy-moment-line"
            style={{
              marginTop: 10, width: 148, height: 148, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "radial-gradient(circle at 36% 30%, #e6f5fd 0%, #bfe3f7 52%, #8ec9ee 100%)",
              color: "#be2a68", fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.55rem", lineHeight: 1.05,
              boxShadow: "0 8px 0 #7fb8dd, 0 18px 34px rgba(120, 180, 225, .38)",
              display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation", userSelect: "none",
            }}
          >
            Happy<br />Button
          </button>
        </div>
      </div>
      <p id="happy-moment-line" className="mt-4 min-h-[1.6em] text-center text-lg font-extrabold leading-snug text-[var(--text)]" aria-live="polite">
        {moment === "full" ? (
          <span style={{ color: "#be2a68" }}>Full!</span>
        ) : moment === "pinned" ? (
          <span style={{ color: "#be2a68" }}>Pinned!</span>
        ) : (
          <>I&apos;m feeling <span style={{ color: "#be2a68" }}>happy</span></>
        )}
      </p>
      {/* Happy Button sounds (Richard, 2026-11-18): off by default,
          its own toggle. Turning it on warms up the audio from that
          tap and plays the same tap tone once, so you know what it
          sounds like. After that, the tone plays only when you tap
          the button — the same tone every tap — and the big bell
          only when a thermometer fills. It follows your phone's
          volume and silent switch, and never plays on its own. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          aria-pressed={soundOn}
          aria-label={soundOn ? "Happy Button sounds on — tap to turn sound off" : "Happy Button sounds off — tap to turn sound on"}
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            if (next) {
              sounds.prepareAudio();
              sounds.playHappySound("tap");
            }
          }}
          className={`min-h-11 rounded-[var(--radius)] px-3 text-sm font-semibold ${soundOn ? "felt-btn bg-[var(--amber)] text-white" : "border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
        >
          {soundOn ? "🔊 Happy Button sounds: on" : "🔇 Happy Button sounds: off"}
        </button>
        <p className="text-sm text-[var(--dim)]">
          {soundOn
            ? "Sound on — the same tone on every tap, and a big bell when a thermometer fills. It follows your phone's volume and silent switch."
            : "Sound is off. Turn it on if you like — it only plays after you tap, never on its own."}
        </p>
      </div>
      {/* Cork board — collapsed, tap to open; pinned cards small, so
          there is room for many more happy cards. */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setBoardOpen((o) => !o)}
          aria-expanded={boardOpen}
          className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface-warm)] px-4 font-semibold text-[var(--text)]"
        >
          Your cork board {state.pinned > 0 ? `(${state.pinned})` : ""} {boardOpen ? "— tap to close" : "— tap to open"}
        </button>
        {boardOpen && (
          <div className="mt-3 rounded-[14px] p-3.5" style={{ background: "linear-gradient(180deg, #c9a87c 0%, #b08d5e 100%)", boxShadow: "inset 0 2px 3px rgba(255,255,255,.25)" }}>
            <div
              className="flex min-h-[300px] flex-wrap content-start items-start justify-center gap-x-3 gap-y-4 rounded-lg px-4 py-5"
              style={{ background: "linear-gradient(160deg, #e8c9a8 0%, #d9b48c 100%)" }}
            >
              {state.pinned === 0 ? (
                <p className="w-full py-24 text-center font-bold leading-relaxed" style={{ color: "#5b4632" }}>
                  <span className="block font-display text-xl">Nothing pinned yet</span>
                  Fill a thermometer and it will pin itself here.
                </p>
              ) : (
                Array.from({ length: state.pinned }, (_, i) => (
                  <div
                    key={i}
                    role="img"
                    aria-label={`Full thermometer number ${i + 1}`}
                    className="relative flex w-[54px] flex-col items-center rounded bg-[#fffdf6] px-0 pb-1.5 pt-2 shadow-md"
                    style={{ transform: `rotate(${i % 2 === 0 ? -2.2 : 2.2}deg)` }}
                  >
                    <span className="absolute -top-[5px] left-1/2 z-[2] -ml-[5px] h-[10px] w-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #ff9d9d 0%, #e0332e 55%, #a31616 100%)", boxShadow: "0 2px 3px rgba(60, 10, 0, .45)" }} aria-hidden="true" />
                    <div className="relative h-9 w-3 overflow-hidden rounded-t-lg border-[1.5px] border-[rgba(44,42,51,.55)] bg-[#eef4f8]" aria-hidden="true">
                      <div className="absolute inset-x-0 bottom-0 h-full" style={{ background: HAPPY_SPRING_FILL }} />
                    </div>
                    <div className="mt-[-4px] h-5 w-5 rounded-full border-[1.5px] border-[rgba(44,42,51,.55)]" style={{ background: "radial-gradient(circle at 40% 34%, #bfe3f7, #f7a8c8 60%, #cdb4f0 120%)" }} aria-hidden="true" />
                    <p className="mt-1 text-center text-[0.58rem] font-black leading-tight text-[#4a4234]">Full!</p>
                    <p className="text-center text-[0.52rem] font-bold leading-tight text-[#8a7c62]">No. {i + 1}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Share button (Richard, 2026-11-19, Mission Possible) ---------- */

// The Share button — Home only, one button, right after the Happy
// Button, so the order on Home stays cottage → welcome line → true
// message → Happy Button → Share → the rest of Home. It does not
// move or obscure the true message, the Happy Button, or the crisis
// box (which stays after the tabs, before the points box). Warm and
// gentle, spring palette like the rest of Home: leaf-green border,
// soft surface, no shouting.
//
// One tap opens the phone's native share sheet with the Mission
// Possible cottage image + the link + the short text (see share.ts);
// if the phone has no share sheet, it opens the visitor's own email
// app with a mailto: already filled in — email apps already contain
// Forward, so the visitor can send it on from there. Sharing sends
// nothing about the visitor — no name, no points, nothing saved —
// and it earns no points. It never gates help.
function ShareButton() {
  const [status, setStatus] = useState<"idle" | "shared" | "emailed">("idle");
  const share = async () => {
    const result = await shareApp();
    if (result === "shared") setStatus("shared");
    else if (result === "emailed") setStatus("emailed");
  };
  return (
    <div className="felt-card mb-5 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--surface)] p-5" role="region" aria-label="Share Richard's Resource">
      <p className="text-center font-display text-xl font-bold text-[var(--text)]">Share it with someone who could use it</p>
      <p className="mt-2 text-center text-sm leading-relaxed text-[var(--dim)]">
        Know someone who could use a little help? Share the cottage — free, no account, no fuss. Sharing sends nothing about you: no name, no points, nothing saved.
      </p>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={share}
          aria-label="Share Richard's Resource"
          className="felt-btn min-h-12 cursor-pointer rounded-[var(--radius)] bg-[var(--leaf)] px-6 text-lg font-bold text-white"
        >
          Share Richard&apos;s Resource
        </button>
      </div>
      {status === "shared" && (
        <p className="mt-3 text-center text-sm font-semibold text-[var(--leaf)]" aria-live="polite">
          Thank you for sharing — that is how the word spreads.
        </p>
      )}
      {status === "emailed" && (
        <p className="mt-3 text-center text-sm font-semibold text-[var(--leaf)]" aria-live="polite">
          Your email app is open — send it, or forward it on, whenever you are ready.
        </p>
      )}
    </div>
  );
}

/* ---------- search + My RR (Richard, 2026-11-21) ---------- */

// Search (Richard, 2026-11-21): the app is about 24,000 words and
// there was no way to find anything in it. One big search box —
// 🔍 Search the app — that runs entirely on the phone over the
// small index in search.ts (tab headings, tools, helplines). Tapping
// a result jumps straight to that tab. Nothing typed here is sent
// anywhere; the box says so, right under it. It lives in the App
// root, above the points strip, so it is visible on Home and on
// every tab, not hidden inside one of them.
//
// Returning to where you left off (Richard, 2026-11-21): the
// app remembers the last tab in this browser's localStorage
// only, like the welcome flag and the Happy Button cork board —
// never sent to the server, never tied to an account, because
// there is no account — and defaults to it on return, with a
// "Welcome back" banner. The My RR card that used to show this
// on Home was deleted 2026-11-23; the returning itself stays.
function SearchBox({ onGo, onOpenSiteMap, onOpenCozyRoom }: { onGo: (t: TabId) => void; onOpenSiteMap?: () => void; onOpenCozyRoom?: () => void }) {
  const [query, setQuery] = useState("");
  const results = searchApp(query);
  const open = (r: { tab: TabId; openSiteMap?: boolean; openCozyRoom?: boolean }) => {
    // The Site Map is not a tab: its result opens the trail map
    // itself, at the top, instead of jumping to a tab.
    if (r.openSiteMap && onOpenSiteMap) {
      onOpenSiteMap();
      setQuery("");
      if (typeof window !== "undefined") window.scrollTo(0, 0);
      return;
    }
    // The Cozy Room is not a tab either: its result opens the
    // inside view of the cottage, at the top, instead of jumping
    // to a tab.
    if (r.openCozyRoom && onOpenCozyRoom) {
      onOpenCozyRoom();
      setQuery("");
      if (typeof window !== "undefined") window.scrollTo(0, 0);
      return;
    }
    onGo(r.tab);
    setQuery("");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  return (
    <div className="felt-card mb-4 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--surface)] p-4" role="search" aria-label="Search the app">
      <label htmlFor="app-search" className="flex items-center gap-2 font-display text-lg font-bold text-[var(--text)]">
        <span aria-hidden>🔍</span> Search the app
      </label>
      <input
        id="app-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try “quit date”, “breathing”, “988”…"
        aria-label="Search the app"
        className="mt-2 min-h-14 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-white px-4 text-lg text-[var(--text)]"
      />
      <p className="mt-2 text-sm text-[var(--dim)]">Search stays on your phone — nothing you type is sent anywhere.</p>
      {query.trim() !== "" && results.length === 0 && (
        <p className="mt-3 text-sm font-semibold text-[var(--text)]">Nothing found for “{query.trim()}” — try another word, like “breathing” or “points”.</p>
      )}
      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => open(r)} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--amber-soft)] p-3 text-left">
                <span className="block font-bold text-[var(--text)]">{r.title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-[var(--dim)]">{r.snippet}</span>
                <span className="mt-1 block text-xs font-bold uppercase tracking-widest text-[var(--accent)]">{r.openCozyRoom ? "Cozy Room →" : r.openSiteMap ? "Trail map →" : `${LAST_PLACE_LABELS[r.tab]} tab →`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- My Muse (Richard, 2026-11-21) ---------- */

// My RR is gone (Richard, 2026-11-23): the card was deleted
// from Home entirely — no card, no explanation, no Continue
// button. The automatic return is untouched and lives in the
// App itself, not in a card: the last tab is still saved to
// localStorage whenever it changes (saveLastPlace), the app
// still defaults to that tab on return, with the "Welcome
// back — you're on the X tab, where you left off" banner and
// "Go to Home instead". Nothing about saving or returning
// was deleted, only the Home card.

// My Muse — your personal self-help assistant, built into a
// personal self-help app. Muse only, no other Personal Muse Assistants, no choice
// of Personal Muse Assistants: Richard is bombarded by Gemini and everybody else,
// and this is his and Muse's app. It is Home only, right after
// the Happy Button, and it adds to the warm greeting, it does not replace
// any of it.
//
// Simplified (Richard, 2026-11-23): one simple question —
// "Would you like to chat with Muse?" — with "Yes, chat with
// Muse" and "Maybe later". No starter message, no copy-starter
// button, no home-screen or download instructions: guiding the
// visitor with Muse instructions is too much, and it must not
// look like a trick to get an AI. It is Self Help, not
// Muse-help. The app cannot put words into Muse anyway —
// muse.ai has no public prompt deep-link and no public API.
//
// Tapping "Yes, chat with Muse" opens Muse in a new tab —
// https://muse.ai/ — and awards +100 points, once ever per
// device, for having the good sense to get your own Personal Muse Assistant. The
// award is self-claimed on the visitor's own word, like the
// welcome points: the server cannot verify that the visitor
// actually opened Muse, only that this device has not been
// paid for it before, and a second tap pays 0. Free, no
// account, no personal information sent, no selling Muse,
// no upsell. Muse is a guide, not a doctor — not medical
// advice — and in crisis call or text 988, or call 911.
//
// "Maybe later" dismisses the card for this visit only, with
// no points and no link. Return to My RR is mission critical,
// so the card keeps it as a plain tappable link, so the
// visitor can toggle back even if Muse never offers it.
function MyMuseCard({ pointEvents }: { pointEvents: PointEvent[] }) {
  const { award } = usePoints();
  const [dismissed, setDismissed] = useState(false);
  const alreadyAwarded = pointEvents.some((e) => e.action === "myMuse");
  const openMyMuse = () => {
    award("home", "myMuse");
    if (typeof window !== "undefined") window.open(MY_MUSE_URL, "_blank", "noopener,noreferrer");
  };
  if (dismissed) return null;
  return (
    <div className="felt-card mb-5 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--surface)] p-5" role="region" aria-label="My Muse — your personal self-help assistant">
      <p className="text-center font-display text-2xl font-bold text-[var(--text)]">My Muse</p>
      <p className="mt-1 text-center font-display text-lg font-bold text-[var(--accent)]">Your personal self-help assistant</p>
      <p className="mt-2 text-center text-lg font-bold leading-relaxed text-[var(--text)]">Would you like to chat with Muse?</p>
      <button type="button" onClick={openMyMuse} aria-label={alreadyAwarded ? "Talk to My Muse again" : "Yes, chat with Muse — get your own Personal Muse Assistant, 100 points once"} className="felt-btn mt-3 min-h-14 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 text-lg font-bold text-white">
        {alreadyAwarded ? "Talk to My Muse again →" : "Yes, chat with Muse →"}
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="mt-3 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface-warm)] px-4 font-semibold text-[var(--text)]">
        Maybe later
      </button>
      <p className="mt-2 text-center text-sm font-semibold text-[var(--text)]">
        {alreadyAwarded
          ? "You already claimed your 100 points for getting your own Personal Muse Assistant — you can talk to Muse as often as you like."
          : "+100 points, once, for getting your own Personal Muse Assistant. Muse only — no other Personal Muse Assistants in this app."}
      </p>
      <p className="mt-3 text-center text-sm leading-relaxed text-[var(--dim)]">
        Muse is a guide, not a doctor. In crisis, call or text 988, or call 911. Free, no account, nothing about you is sent anywhere.
      </p>
      <p className="mt-3 text-center text-sm leading-relaxed text-[var(--dim)]">
        After you&apos;ve talked, come back any time:{" "}
        <a href={RETURN_TO_MY_RR_URL} className="font-bold text-[var(--accent)] underline">Return to My RR — {RETURN_TO_MY_RR_URL}</a>
      </p>
    </div>
  );
}

/* ---------- My Life Garden Pathway (Richard, 2026-11-25/26) ---------- */
// First piece only (Richard, 2026-11-26: "Life garden please") —
// a Home button, the garden view with the final one-gazebo image,
// Richard's exact brief explanation, and the 13 items as a checklist
// saved in this browser's localStorage only. No points yet, no
// badges, no trophy room, no Check my progress, no flowers
// replacing weeds — those are later pieces, for Richard's verdict
// after this one. Weed clearing begins from the front steps of
// the cottage — they have already been invited in.
const LIFE_GARDEN_ITEMS = [
  "No drinking problem",
  "No smoking problem",
  "No gambling problem",
  "No drug problem",
  "I eat well",
  "I like my body just the way it is",
  "I take a quiet moment",
  "I'm interested in longevity",
  "I turn my screen off",
  "I have friends, furry and/or human",
  "I socialize",
  "I'm not lonely",
  "I don't lose myself trying to fix others",
] as const;
const LIFE_GARDEN_KEY = "richards-resource:life-garden:v1";

function loadLifeGardenChecked(): string[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalGet(LIFE_GARDEN_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && (LIFE_GARDEN_ITEMS as readonly string[]).includes(x));
  } catch { return []; }
}

/* ---------- My Life Garden Pathway — the Map (Richard, 2026-11-26) ---------- */
// Second piece: a Map with navigation links, warm and cozy from the
// get-go. One pathway from the cottage front steps, branching —
// branching means dividing from the path. One branch to the gazebo
// for quiet time, dead-end branches for drinking, smoking, gambling,
// drugs and the rest (a trophy at the end of each
// dead end), and the longevity path going on to infinity. The map
// matches all the buttons/tabs. Tapping a map link shows the option
// for that issue (for example "No drinking problem"); choosing it
// earns a trophy for the Cozy Room. Trophies live in this browser's
// localStorage only — no server, no points scored yet, no account.
// The third piece (2026-11-26) adds name / avatar / spirit-guide
// choice, also local only. The fourth piece adds favourite books
// and your own photos for the frames, in the Cozy Room below.
// The fifth piece (2026-11-26) adds path expansion / quit day
// and weeds turning to flowers, also local only. Held for later
// pieces, NOT built here: badges, points for weeds, a weed pile.
const LIFE_GARDEN_TROPHY_KEY = "richards-resource:life-garden:trophies:v1";

function loadLifeGardenTrophies(): string[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalGet(LIFE_GARDEN_TROPHY_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && (LIFE_GARDEN_ITEMS as readonly string[]).includes(x));
  } catch { return []; }
}

type GardenMapKind = "pathway" | "gazebo" | "dead-end" | "infinite" | "room";
type GardenMapStop = {
  id: string;
  label: string;
  tab: TabId | null;
  kind: GardenMapKind;
  items: string[];
  note: string;
};

const GARDEN_MAP_KIND_LABEL: Record<GardenMapKind, string> = {
  pathway: "The pathway",
  gazebo: "Branch — quiet time",
  "dead-end": "Dead end — a trophy at the end",
  infinite: "The path that goes on — to infinity",
  room: "Inside the cottage",
};

const GARDEN_MAP_STOPS: GardenMapStop[] = [
  { id: "garden", label: "My Life Garden Pathway", tab: null, kind: "pathway", items: [], note: "One pathway from the front steps of the cottage — you have already been invited in. Weed clearing begins from the front steps." },
  { id: "gazebo", label: "The gazebo — quiet time", tab: "peace", kind: "gazebo", items: ["I take a quiet moment"], note: "A branch for a quiet moment. Then back to the path. Trophies live in the gazebo." },
  { id: "alcohol", label: "Alcohol", tab: "alcohol", kind: "dead-end", items: ["No drinking problem"], note: "This branch ends when you stop, and stay stopped. A trophy waits at the end of it." },
  { id: "smoking", label: "Smoking", tab: "smoking", kind: "dead-end", items: ["No smoking problem"], note: "This branch ends when you stop, and stay stopped. A trophy waits at the end of it." },
  { id: "gambling", label: "Gambling", tab: "gambling", kind: "dead-end", items: ["No gambling problem"], note: "This branch ends when you stop, and stay stopped. A trophy waits at the end of it." },
  { id: "drugs", label: "Drugs", tab: "drugs", kind: "dead-end", items: ["No drug problem"], note: "This branch ends when you stop, and stay stopped. A trophy waits at the end of it." },
  { id: "codependency", label: "Codependency", tab: "codependency", kind: "dead-end", items: ["I don't lose myself trying to fix others"], note: "This branch ends when you stop losing yourself trying to fix others. A trophy waits at the end of it." },
  { id: "food", label: "Food", tab: "food", kind: "dead-end", items: ["I eat well", "I like my body just the way it is"], note: "Eating well, and liking your body just the way it is. A trophy waits at the end." },
  { id: "screens", label: "Screens", tab: "screens", kind: "dead-end", items: ["I turn my screen off"], note: "This branch ends when you turn your screen off. A trophy waits at the end of it." },
  { id: "wellbeing", label: "Feeling Unwell?", tab: "wellbeing", kind: "dead-end", items: ["I'm not lonely"], note: "If today is hard, start here. You are not alone — a trophy waits at the end." },
  { id: "longevity", label: "Longevity", tab: "longevity", kind: "infinite", items: ["I'm interested in longevity", "I have friends, furry and/or human", "I socialize"], note: "The only infinite path — sleep, walking, real food, friends, purpose. Trophies along the way, no end." },
  { id: "cozy", label: "My Cozy Room", tab: null, kind: "room", items: [], note: "Inside the cottage — your trophy room. First view: no trophies yet, and a few empty picture frames on the walls. Room for 100+ trophies." },
];

/* ---------- My Life Garden Pathway — your name, avatar & spirit guide ---------- */
// Third piece (Richard, 2026-11-26): choose your own name, pick a
// figure that stands for you, and pick a spirit guide to walk
// beside you. All three are optional, and all three stay on this
// phone only, in this browser's localStorage — nothing is sent
// anywhere, no account. The figures have no preset names and no
// name labels — the figure stands for the visitor under whatever
// name they chose for themselves. The guides are drawn as
// naturalistic, lifelike profiles, not cartoons, and keep their
// animal labels, because those name the animal, not a person.
// Held for later pieces, NOT built here: badges, points for
// weeds. Path expansion / quit day and weeds turning to flowers
// are built in the fifth piece (2026-11-26), below. Favourite
// books and your own photos for the frames are built in the
// Cozy Room below (fourth piece, Richard, 2026-11-26).
const LIFE_GARDEN_NAME_KEY = "richards-resource:life-garden:name:v1";
const LIFE_GARDEN_AVATAR_KEY = "richards-resource:life-garden:avatar:v1";
const LIFE_GARDEN_GUIDE_KEY = "richards-resource:life-garden:guide:v1";

function loadLifeGardenName(): string {
  try {
    const raw = safeLocalGet(LIFE_GARDEN_NAME_KEY);
    if (!raw) return "";
    return raw.trim().slice(0, 40);
  } catch { return ""; }
}

type GardenAvatarHair = "long" | "afro" | "short" | "bun" | "bob" | "bald";
type GardenAvatarFeature = "none" | "beard" | "glasses" | "freckles" | "earrings" | "moustache";
type GardenAvatar = {
  id: string;
  desc: string;
  skin: string;
  hair: GardenAvatarHair;
  hairColor: string;
  top: string;
  feature: GardenAvatarFeature;
};

// Six figures, each drawn differently — different skin tone,
// hair, features and clothes — so they do not all look alike.
// No preset names, no name labels under the figures.
const GARDEN_AVATARS: GardenAvatar[] = [
  { id: "a1", desc: "long wavy brown hair, warm brown skin, a green top", skin: "#8d5524", hair: "long", hairColor: "#3b2314", top: "#4a7a4f", feature: "none" },
  { id: "a2", desc: "a black afro and a beard, deep brown skin, a blue shirt", skin: "#5c3a21", hair: "afro", hairColor: "#1a1210", top: "#3f6fb5", feature: "beard" },
  { id: "a3", desc: "short blond hair, glasses and freckles, light skin, a yellow top", skin: "#f1c9a5", hair: "short", hairColor: "#d9b45b", top: "#d9a441", feature: "glasses" },
  { id: "a4", desc: "dark hair in a bun with gold earrings, tan skin, a purple top", skin: "#c68642", hair: "bun", hairColor: "#241a12", top: "#7a5a9e", feature: "earrings" },
  { id: "a5", desc: "a silver-grey bob, light skin, a teal top", skin: "#e8b98d", hair: "bob", hairColor: "#b8b8c0", top: "#3f8a8a", feature: "freckles" },
  { id: "a6", desc: "a bald head and a moustache, medium brown skin, a red shirt", skin: "#a06a3f", hair: "bald", hairColor: "#2a1c12", top: "#a84a3f", feature: "moustache" },
];

function loadLifeGardenAvatar(): string | null {
  try {
    const raw = safeLocalGet(LIFE_GARDEN_AVATAR_KEY);
    return raw && GARDEN_AVATARS.some((a) => a.id === raw) ? raw : null;
  } catch { return null; }
}

type GardenGuide = { id: string; label: string; line: string };
const GARDEN_GUIDES: GardenGuide[] = [
  { id: "owl", label: "Owl", line: "Quiet and watchful, beside you in the still moments." },
  { id: "robin", label: "Robin", line: "A small bright friend, here at the start of the day." },
  { id: "turtle", label: "Turtle", line: "Slow and steady, in no hurry at all." },
  { id: "butterfly", label: "Butterfly", line: "Light and gentle — a reminder that change can be beautiful." },
  { id: "deer", label: "Deer", line: "Gentle and alert, walking softly beside you." },
  { id: "bear", label: "Bear", line: "Strong and warm, a steady friend to lean on." },
  { id: "dog", label: "Dog", line: "Loyal, joyful, and always glad you're here." },
  { id: "cat", label: "Cat", line: "Quiet, independent, and knows when to curl up close." },
];

function loadLifeGardenGuide(): string | null {
  try {
    const raw = safeLocalGet(LIFE_GARDEN_GUIDE_KEY);
    return raw && GARDEN_GUIDES.some((g) => g.id === raw) ? raw : null;
  } catch { return null; }
}

function GardenAvatarFigure({ avatar }: { avatar: GardenAvatar }) {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20" role="img" aria-label={`A figure with ${avatar.desc}`}>
      {avatar.hair === "long" && <rect x="30" y="18" width="60" height="100" rx="28" fill={avatar.hairColor} />}
      {avatar.hair === "afro" && <circle cx="60" cy="38" r="34" fill={avatar.hairColor} />}
      {avatar.hair === "bob" && <rect x="32" y="18" width="56" height="64" rx="24" fill={avatar.hairColor} />}
      <path d="M18 118 Q20 88 60 88 Q100 88 102 118 Z" fill={avatar.top} />
      <rect x="52" y="70" width="16" height="22" fill={avatar.skin} />
      <circle cx="60" cy="52" r="26" fill={avatar.skin} />
      {avatar.hair === "short" && <path d="M34 52 Q34 24 60 24 Q86 24 86 52 L86 56 L34 56 Z" fill={avatar.hairColor} />}
      {avatar.hair === "bun" && (
        <>
          <path d="M34 52 Q34 24 60 24 Q86 24 86 52 L86 56 L34 56 Z" fill={avatar.hairColor} />
          <circle cx="60" cy="20" r="11" fill={avatar.hairColor} />
        </>
      )}
      <circle cx="49" cy="50" r="2.5" fill="#2e2117" />
      <circle cx="71" cy="50" r="2.5" fill="#2e2117" />
      {avatar.feature === "glasses" && (
        <>
          <circle cx="49" cy="50" r="9" fill="none" stroke="#2e2117" strokeWidth="2" />
          <circle cx="71" cy="50" r="9" fill="none" stroke="#2e2117" strokeWidth="2" />
          <path d="M58 50 L62 50" stroke="#2e2117" strokeWidth="2" />
        </>
      )}
      {avatar.feature === "freckles" && (
        <>
          <circle cx="46" cy="60" r="1.6" fill="#8a5a3b" />
          <circle cx="53" cy="62" r="1.6" fill="#8a5a3b" />
          <circle cx="67" cy="62" r="1.6" fill="#8a5a3b" />
          <circle cx="74" cy="60" r="1.6" fill="#8a5a3b" />
        </>
      )}
      {avatar.feature === "earrings" && (
        <>
          <circle cx="35" cy="58" r="3" fill="#d9a441" />
          <circle cx="85" cy="58" r="3" fill="#d9a441" />
        </>
      )}
      {avatar.feature === "moustache" && <path d="M50 64 Q55 60 60 64 Q65 60 70 64 Q65 69 60 69 Q55 69 50 64 Z" fill={avatar.hairColor} />}
      {avatar.feature === "beard" ? (
        <path d="M44 64 Q60 84 76 64 Q74 78 60 78 Q46 78 44 64 Z" fill={avatar.hairColor} />
      ) : (
        <path d="M52 66 Q60 72 68 66" stroke="#2e2117" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

// Naturalistic, lifelike animal profiles — side and three-quarter
// views in muted natural colours, with feather, fur, shell and
// wing detail and small realistic eyes. No cartoon front faces,
// no big smiles.
function GardenGuideFigure({ guideId }: { guideId: string }) {
  return (
    <svg viewBox="0 0 120 90" className="h-16 w-24" role="img" aria-label={`A ${guideId} in profile`}>
      <ellipse cx="60" cy="82" rx="42" ry="5" fill="#d9c9a8" />
      {guideId === "owl" && (
        <g>
          <ellipse cx="62" cy="52" rx="24" ry="28" fill="#8a6b4f" />
          <circle cx="56" cy="26" r="16" fill="#8a6b4f" />
          <path d="M44 14 L40 4 L50 12 Z" fill="#6f5138" />
          <path d="M66 12 L72 4 L70 16 Z" fill="#6f5138" />
          <path d="M42 28 L34 32 L42 35 Z" fill="#d99a4e" />
          <circle cx="50" cy="24" r="2.5" fill="#2e2117" />
          <path d="M70 42 Q84 54 70 72 Q78 54 70 42" fill="#6f5138" />
          <path d="M58 44 L58 68 M66 44 L66 68" stroke="#6f5138" strokeWidth="1.5" />
        </g>
      )}
      {guideId === "robin" && (
        <g>
          <ellipse cx="62" cy="54" rx="26" ry="20" fill="#7a6a5a" />
          <ellipse cx="46" cy="60" rx="12" ry="14" fill="#c96a3f" />
          <circle cx="42" cy="32" r="13" fill="#7a6a5a" />
          <path d="M30 32 L20 35 L30 38 Z" fill="#d99a4e" />
          <circle cx="38" cy="30" r="2.5" fill="#2e2117" />
          <path d="M84 48 L100 40 L96 54 Z" fill="#5e4a3a" />
          <path d="M56 72 L54 80 M68 72 L70 80" stroke="#5e4a3a" strokeWidth="2" />
        </g>
      )}
      {guideId === "turtle" && (
        <g>
          <path d="M26 74 A36 32 0 0 1 98 74 Z" fill="#5e7a4a" />
          <path d="M44 74 A20 18 0 0 1 80 74" fill="none" stroke="#3f5a33" strokeWidth="2" />
          <path d="M62 44 L62 70 M46 52 L46 70 M78 52 L78 70" stroke="#3f5a33" strokeWidth="1.5" />
          <circle cx="102" cy="62" r="9" fill="#7a8a5a" />
          <circle cx="105" cy="60" r="2" fill="#2e2117" />
          <rect x="34" y="72" width="10" height="8" rx="3" fill="#7a8a5a" />
          <rect x="80" y="72" width="10" height="8" rx="3" fill="#7a8a5a" />
        </g>
      )}
      {guideId === "butterfly" && (
        <g>
          <path d="M58 46 Q30 14 34 40 Q36 58 58 52 Z" fill="#c98a4e" />
          <path d="M58 52 Q32 62 40 74 Q52 70 58 56 Z" fill="#a86a3f" />
          <path d="M62 46 Q90 14 86 40 Q84 58 62 52 Z" fill="#c98a4e" />
          <path d="M62 52 Q88 62 80 74 Q68 70 62 56 Z" fill="#a86a3f" />
          <path d="M46 44 L56 50 M46 62 L56 54 M74 44 L64 50 M74 62 L64 54" stroke="#7a4a2a" strokeWidth="1" />
          <ellipse cx="60" cy="54" rx="4" ry="14" fill="#5e3a22" />
          <path d="M58 40 Q54 30 48 28 M62 40 Q66 30 72 28" fill="none" stroke="#5e3a22" strokeWidth="1.5" />
        </g>
      )}
      {guideId === "deer" && (
        <g>
          <path d="M52 80 L54 52 Q54 40 62 36 L76 30" fill="none" stroke="#8a6b4f" strokeWidth="10" strokeLinecap="round" />
          <ellipse cx="80" cy="30" rx="14" ry="10" fill="#8a6b4f" transform="rotate(-20 80 30)" />
          <path d="M92 24 L100 26 L94 32 Z" fill="#6f5138" />
          <circle cx="86" cy="28" r="2.5" fill="#2e2117" />
          <path d="M70 18 Q66 6 58 4 M70 18 Q72 6 80 2 M76 16 Q82 6 90 4" fill="none" stroke="#6f5138" strokeWidth="2" strokeLinecap="round" />
          <path d="M72 20 L66 10 L76 14 Z" fill="#8a6b4f" />
        </g>
      )}
      {guideId === "bear" && (
        <g>
          <circle cx="60" cy="46" r="26" fill="#6b4a2f" />
          <circle cx="42" cy="26" r="8" fill="#6b4a2f" />
          <circle cx="42" cy="26" r="4" fill="#8a6b4f" />
          <ellipse cx="46" cy="58" rx="14" ry="10" fill="#a8835f" />
          <circle cx="38" cy="56" r="4" fill="#2e2117" />
          <circle cx="58" cy="40" r="2.5" fill="#2e2117" />
          <path d="M72 52 Q80 60 74 68" fill="none" stroke="#5a3a24" strokeWidth="2" />
        </g>
      )}
      {guideId === "dog" && (
        <g>
          <circle cx="62" cy="44" r="24" fill="#a05a2c" />
          <path d="M78 28 Q92 34 88 52 Q84 60 76 56 Q82 40 78 28 Z" fill="#7a421e" />
          <ellipse cx="44" cy="56" rx="14" ry="10" fill="#d9b48a" />
          <circle cx="36" cy="54" r="4.5" fill="#2e2117" />
          <circle cx="56" cy="38" r="2.5" fill="#2e2117" />
          <path d="M52 66 Q60 70 68 64" fill="none" stroke="#5e3a22" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {guideId === "cat" && (
        <g>
          <circle cx="60" cy="48" r="24" fill="#5e7a8a" />
          <path d="M42 30 L38 12 L54 24 Z" fill="#5e7a8a" />
          <path d="M44 28 L42 16 L52 24 Z" fill="#e8a0a8" />
          <path d="M78 30 L82 12 L66 24 Z" fill="#5e7a8a" />
          <path d="M76 28 L78 16 L68 24 Z" fill="#e8a0a8" />
          <circle cx="50" cy="46" r="2.5" fill="#2e2117" />
          <circle cx="70" cy="46" r="2.5" fill="#2e2117" />
          <path d="M60 56 L56 60 L64 60 Z" fill="#e8a0a8" />
          <path d="M40 56 L24 52 M40 62 L26 64 M80 56 L96 52 M80 62 L94 64" stroke="#3f5a66" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

function GardenCompanions({ name, onName, avatar, onAvatar, guide, onGuide }: {
  name: string;
  onName: (next: string) => void;
  avatar: string | null;
  onAvatar: (next: string) => void;
  guide: string | null;
  onGuide: (next: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const [saved, setSaved] = useState(false);
  // The draft must follow the saved name: after Clear, or after a
  // save from another view, a stale draft would show the old name.
  useEffect(() => { setDraft(name); }, [name]);
  // Save the name (Richard, 2026-11-26): typing "007.5" did not
  // stick — typing alone saved nothing, and the only button said
  // "That's me", never "Save", with no Saved confirmation. So the
  // name now saves on the Save button, on Enter, and when the box
  // loses focus after a change — and says so, "Saved ✓".
  const saveName = () => {
    const clean = draft.trim().slice(0, 40);
    onName(clean);
    setSaved(clean.length > 0);
  };
  const chosenAvatar = GARDEN_AVATARS.find((a) => a.id === avatar) ?? null;
  const chosenGuide = GARDEN_GUIDES.find((g) => g.id === guide) ?? null;
  const displayName = name ? name : "friend";
  const summary = chosenAvatar && chosenGuide
    ? `${displayName}, that figure is you, with the ${chosenGuide.label} beside you.`
    : chosenAvatar
      ? `${displayName}, that figure is you.`
      : chosenGuide
        ? `The ${chosenGuide.label} walks beside you, ${displayName}.`
        : null;
  return (
    <Section title="Your name, your avatar & your spirit guide">
      <p className="leading-relaxed text-[var(--text)]">
        Optional — leave it blank and stay “friend”. Your name, your figure and your guide stay on this phone only, nothing is sent anywhere.
      </p>
      <p className="mt-4 font-bold text-[var(--text)]">Choose your own name</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draft}
          maxLength={40}
          placeholder="First name or nickname"
          aria-label="Choose your own name — first name or nickname"
          onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
          onBlur={() => { if (draft.trim().slice(0, 40) !== name) saveName(); }}
          className="min-h-14 flex-1 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 text-lg text-[var(--text)]"
        />
        <button type="button" onClick={saveName} className="min-h-14 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-5 font-bold text-[var(--text)]">
          Save my name
        </button>
        <button type="button" onClick={() => { setDraft(""); setSaved(false); onName(""); }} className="min-h-14 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-5 font-bold text-[var(--text)]">
          Clear
        </button>
      </div>
      {name && <p className="mt-2 font-bold text-[var(--text)]">{saved ? `Saved ✓ — that’s you, ${name}.` : `Welcome, ${name}.`}</p>}
      {!name && <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">Tap Save my name — it stays on this phone, in this browser.</p>}
      <p className="mt-6 font-bold text-[var(--text)]">Pick a figure that stands for you</p>
      <p className="mt-1 leading-relaxed text-[var(--dim)]">Tap one. No names, just a figure.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {GARDEN_AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAvatar(a.id)}
            aria-pressed={avatar === a.id}
            aria-label={`Choose this figure: ${a.desc}`}
            className={`flex min-h-28 flex-col items-center justify-center rounded-[var(--radius)] border-2 bg-[var(--surface)] p-2 ${avatar === a.id ? "border-[var(--accent)] bg-[var(--amber-soft)]" : "border-[var(--border)]"}`}
          >
            <GardenAvatarFigure avatar={a} />
            {avatar === a.id && <span className="mt-1 text-sm font-bold text-[var(--text)]">That’s you ✓</span>}
          </button>
        ))}
      </div>
      <p className="mt-6 font-bold text-[var(--text)]">Pick a spirit guide</p>
      <p className="mt-1 leading-relaxed text-[var(--dim)]">Tap one.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {GARDEN_GUIDES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onGuide(g.id)}
            aria-pressed={guide === g.id}
            aria-label={`Choose the ${g.label} as your spirit guide`}
            className={`flex min-h-28 flex-col items-center justify-center rounded-[var(--radius)] border-2 bg-[var(--surface)] p-3 text-center ${guide === g.id ? "border-[var(--accent)] bg-[var(--amber-soft)]" : "border-[var(--border)]"}`}
          >
            <GardenGuideFigure guideId={g.id} />
            <span className="mt-1 text-lg font-bold text-[var(--text)]">{g.label}</span>
            <span className="text-sm leading-relaxed text-[var(--dim)]">{g.line}</span>
            {guide === g.id && <span className="mt-1 text-sm font-bold text-[var(--text)]">Walking beside you ✓</span>}
          </button>
        ))}
      </div>
      {summary && (
        <p role="status" className="mt-4 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--amber-soft)] px-4 py-3 text-center font-bold leading-relaxed text-[var(--text)]">
          {summary}
        </p>
      )}
    </Section>
  );
}

/* ---------- My Life Garden Pathway — path expansion & weeds to flowers ---------- */
// Fifth piece (Richard, 2026-11-26): a single path can expand.
// A quit day — set on the relevant tab, or picked here in the
// garden — stretches a path out with steps and milestones, so it
// is longer for someone struggling, not a dead end right away. A
// quit day in the past still counts: if you already stopped, you
// are already in recovery, staying stopped. And as weeds are
// cleared — by ticking what is already true, and by earning
// trophies — the weed patch beside that path turns to flowers,
// starting at the cottage front steps and working outward. Even
// after every box is ticked, weeds stay right before the cottage:
// they clear only when you keep using the app, and they grow back
// if you stay away for a while. That is maintenance, not
// punishment — come back, and the flowers return. All local only,
// nothing sent anywhere, no account, no new points. Held for
// later pieces, NOT built here: badges, points for weeds.
const LIFE_GARDEN_QUIT_DAYS_KEY = "richards-resource:life-garden:quit-days:v1";
const LIFE_GARDEN_VISITS_KEY = "richards-resource:life-garden:visits:v1";
const GARDEN_COTTAGE_VISITS_TO_BLOOM = 3;
const GARDEN_COTTAGE_BLOOM_DAYS = 7;

type GardenQuitDays = Record<string, string>;

function gardenQuitDayIsValid(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return !Number.isNaN(new Date(`${d}T00:00:00`).getTime());
}

function loadLifeGardenQuitDays(): GardenQuitDays {
  try {
    const parsed: unknown = JSON.parse(safeLocalGet(LIFE_GARDEN_QUIT_DAYS_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    const next: GardenQuitDays = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && gardenQuitDayIsValid(v)) next[k] = v;
    }
    return next;
  } catch { return {}; }
}

function saveLifeGardenQuitDays(next: GardenQuitDays): void {
  if (Object.keys(next).length === 0) safeLocalRemove(LIFE_GARDEN_QUIT_DAYS_KEY);
  else safeLocalSet(LIFE_GARDEN_QUIT_DAYS_KEY, JSON.stringify(next));
}

// Signed days from today to a date: positive means the day is
// still ahead, negative means it is in the past, zero is today.
function daysUntilGardenDate(dateStr: string): number | null {
  if (!gardenQuitDayIsValid(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

type GardenMilestone = { days: number; label: string };
const GARDEN_PATH_MILESTONES: GardenMilestone[] = [
  { days: 0, label: "Quit day — you chose this path" },
  { days: 1, label: "One day" },
  { days: 7, label: "One week" },
  { days: 30, label: "One month" },
  { days: 90, label: "Three months" },
  { days: 365, label: "One year" },
];

function gardenMilestonesReached(daysSinceQuit: number | null): GardenMilestone[] {
  if (daysSinceQuit == null) return [];
  return GARDEN_PATH_MILESTONES.filter((m) => daysSinceQuit >= m.days);
}

type GardenVisits = { count: number; lastVisit: string };

function loadLifeGardenVisits(): GardenVisits {
  try {
    const parsed: unknown = JSON.parse(safeLocalGet(LIFE_GARDEN_VISITS_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return { count: 0, lastVisit: "" };
    const count = typeof (parsed as GardenVisits).count === "number" ? Math.max(0, Math.floor((parsed as GardenVisits).count)) : 0;
    const lastVisit = typeof (parsed as GardenVisits).lastVisit === "string" && gardenQuitDayIsValid((parsed as GardenVisits).lastVisit) ? (parsed as GardenVisits).lastVisit : "";
    return { count, lastVisit };
  } catch { return { count: 0, lastVisit: "" }; }
}

function recordLifeGardenVisit(): GardenVisits {
  const next = { count: loadLifeGardenVisits().count + 1, lastVisit: localDay() };
  safeLocalSet(LIFE_GARDEN_VISITS_KEY, JSON.stringify(next));
  return next;
}

// The patch right before the cottage is the last one to bloom:
// it needs every item cleared, at least three visits to the
// garden, and a visit within the last seven days. If you stay
// away, its weeds grow back — maintenance, not punishment.
function gardenCottagePatchBlooms(visits: GardenVisits, allCleared: boolean): boolean {
  if (!allCleared) return false;
  if (visits.count < GARDEN_COTTAGE_VISITS_TO_BLOOM) return false;
  if (!visits.lastVisit) return false;
  const since = daysSince(visits.lastVisit);
  return since != null && since <= GARDEN_COTTAGE_BLOOM_DAYS;
}

// Stepping stones for one path. With no quit day the path is
// short — three stones. With a quit day it stretches out: one
// stone for every milestone, reached stones in flower, the rest
// still ahead, and a trophy stone at the end.
function GardenPathSteps({ quitDay }: { quitDay: string | null }) {
  const until = quitDay == null ? null : daysUntilGardenDate(quitDay);
  const since = until == null ? null : -until;
  const reached = gardenMilestonesReached(since);
  if (quitDay == null || until == null) {
    return (
      <div>
        <p className="leading-relaxed text-[var(--text)]">
          No quit day yet — three stepping stones. Pick a quit day and this path stretches out, not a dead end right away.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="A short path of three stepping stones">
          {[1, 2, 3].map((n) => (
            <span key={n} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-lg font-bold text-[var(--text)]">{n}</span>
          ))}
          <span className="text-2xl" aria-hidden="true">🏆</span>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="leading-relaxed text-[var(--text)]">
        {until < 0
          ? `Your quit day was ${quitDay} — that still counts. You have walked ${since ?? 0} ${(since ?? 0) === 1 ? "day" : "days"} of this path, and it has stretched out with steps behind you.`
          : until === 0
            ? `Today is your quit day, ${quitDay}. One step at a time — this path stretches out ahead of you.`
            : `Your quit day is ${quitDay}, in ${until} ${until === 1 ? "day" : "days"}. The path ahead is long — one step at a time.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Stepping stones along this path, with a trophy at the end">
        {GARDEN_PATH_MILESTONES.map((m) => {
          const done = reached.some((r) => r.days === m.days);
          return (
            <span key={m.days} title={m.label} className={`flex min-h-12 min-w-12 items-center justify-center rounded-full border-2 px-2 text-center text-sm font-bold ${done ? "border-[var(--leaf)] bg-[var(--leaf-soft)] text-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--dim)]"}`}>
              {done ? `🌸 ${m.label}` : m.label}
            </span>
          );
        })}
        <span className="text-2xl" aria-hidden="true">🏆</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        {reached.length} of {GARDEN_PATH_MILESTONES.length} steps reached — the rest are still ahead, and that is fine.
      </p>
    </div>
  );
}

// The progress tree in the garden list view: one patch beside the
// path for every item, in order from the cottage front steps
// outward, plus the patch right before the cottage itself.
// A patch turns to flowers when its item is ticked or its
// trophy is earned. The cottage patch is last and needs
// regular visits — its weeds grow back if you stay away.
// This is a progress report, not a map — it must never be
// called a map. The real map is GardenMapPage, opened from
// the Site Map button at the top of the app, or "See the Map".
function GardenPathStrip({ checked, visits }: { checked: string[]; visits: GardenVisits }) {
  const trophies = loadLifeGardenTrophies();
  const cleared = (item: string) => checked.includes(item) || trophies.includes(item);
  const flowerCount = LIFE_GARDEN_ITEMS.filter(cleared).length;
  const allCleared = flowerCount === LIFE_GARDEN_ITEMS.length;
  const cottageBlooms = gardenCottagePatchBlooms(visits, allCleared);
  return (
    <Section title="Your progress tree, from the cottage steps">
      <p className="leading-relaxed text-[var(--text)]">
        Patches of weeds beside the path turn to flowers as you clear them, starting at the cottage front steps and working outward. {flowerCount} of {LIFE_GARDEN_ITEMS.length} patches in flower.
      </p>
      <ul className="mt-3 space-y-2">
        <li className="felt-card flex min-h-14 items-center gap-3 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <span className="text-2xl" aria-hidden="true">{cottageBlooms ? "🌸" : "🌿"}</span>
          <span className="leading-relaxed text-[var(--text)]">
            <strong>Right before the cottage</strong> — {cottageBlooms
              ? "in flower. You cleared the whole path and kept coming back — lovely."
              : allCleared
                ? "weeds still here. Even with every box ticked, a few weeds stay right before the cottage. They clear when you keep using the app — come back and visit, and they turn to flowers."
                : "weeds still here. This patch is the last to bloom — clear the path first, then keep visiting."}
          </span>
        </li>
        {LIFE_GARDEN_ITEMS.map((item) => (
          <li key={item} className="felt-card flex min-h-14 items-center gap-3 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <span className="text-2xl" aria-hidden="true">{cleared(item) ? "🌸" : "🌿"}</span>
            <span className="leading-relaxed text-[var(--text)]">
              <strong>{item}</strong> — {cleared(item) ? "in flower" : "weeds still beside this path"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        Weeds grow back if you stay away for a while — that is maintenance, not punishment. Come back, and the flowers return.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        This pathway lives on this phone only — nothing is sent anywhere.
      </p>
    </Section>
  );
}

/* ---------- My Life Garden Pathway — flower pots on the big wrap-around porch ---------- */
// Sixth piece (Richard, 2026-11-26): as one progresses, nice
// flower pots with flowers appear on the cottage's big wrap-around
// porch (Richard, 2026-11-26: "The cottage has a nice big wrap around
// porch"). Not there at first view — one pot at a time, each time a
// milestone is hit, and no two pots are identical: each pot has its
// own colour, shape and flowers. A milestone here is patches of
// weeds turned to flowers beside the path. It is a small drawn
// row of pots in the cottage's warm style, an overlay, not a change
// to the cottage image itself. Tied to the patches already cleared
// and the trophies already earned — no new points, nothing scored
// here. Local only, nothing sent anywhere. Held for later pieces,
// NOT built here: points for weeds.
const GARDEN_PORCH_POT_MILESTONES = [1, 3, 5, 7, 9, 13];

type GardenPorchPotDesign = {
  name: string;
  potFill: string;
  rimFill: string;
  potHeight: number;
  flowers: { dx: number; dy: number; colour: string }[];
};

// Six pots, no two identical — each has its own colour, height
// and flowers, and each is earned one at a time.
const GARDEN_PORCH_POTS: GardenPorchPotDesign[] = [
  { name: "Little terracotta pot", potFill: "#b5654a", rimFill: "#c97a5e", potHeight: 34, flowers: [{ dx: 0, dy: -52, colour: "#e86a8a" }] },
  { name: "Blue pot", potFill: "#3f6fb5", rimFill: "#5b8ac9", potHeight: 30, flowers: [{ dx: -10, dy: -46, colour: "#f2a541" }, { dx: 10, dy: -50, colour: "#f2a541" }] },
  { name: "Tall green pot", potFill: "#4a7a4f", rimFill: "#6aa84f", potHeight: 44, flowers: [{ dx: -12, dy: -58, colour: "#9a5a90" }, { dx: 0, dy: -64, colour: "#9a5a90" }, { dx: 12, dy: -58, colour: "#e86a8a" }] },
  { name: "Cream pot", potFill: "#e8dcc0", rimFill: "#d9c9a3", potHeight: 32, flowers: [{ dx: -10, dy: -48, colour: "#e87a3a" }, { dx: 10, dy: -48, colour: "#e86a8a" }] },
  { name: "Red pot", potFill: "#a84a3f", rimFill: "#c05a4e", potHeight: 36, flowers: [{ dx: -12, dy: -52, colour: "#f5f0e6" }, { dx: 0, dy: -58, colour: "#f5f0e6" }, { dx: 12, dy: -52, colour: "#f2a541" }] },
  { name: "Golden prize pot", potFill: "#d9a441", rimFill: "#f2c14e", potHeight: 40, flowers: [{ dx: -16, dy: -54, colour: "#e86a8a" }, { dx: -6, dy: -62, colour: "#f2a541" }, { dx: 6, dy: -62, colour: "#9a5a90" }, { dx: 16, dy: -54, colour: "#e86a8a" }] },
];

// How many pots are earned so far: one for every milestone hit.
function gardenPorchPotsEarned(flowerCount: number): number {
  return GARDEN_PORCH_POT_MILESTONES.filter((m) => flowerCount >= m).length;
}

function gardenPorchNextMilestone(flowerCount: number): number | null {
  return GARDEN_PORCH_POT_MILESTONES.find((m) => flowerCount < m) ?? null;
}

function GardenPorchPot({ flowerCount, cottageBlooms }: { flowerCount: number; cottageBlooms: boolean }) {
  const earned = gardenPorchPotsEarned(flowerCount);
  const next = gardenPorchNextMilestone(flowerCount);
  const stageText =
    earned === 0
      ? "No flower pots on the big wrap-around porch yet — clear a patch of weeds and the first pot will appear."
      : earned >= GARDEN_PORCH_POTS.length
        ? cottageBlooms
          ? "All six flower pots are on the big wrap-around porch — each one different, each one earned — and the whole path is in flower, right up to the cottage."
          : "All six flower pots are on the big wrap-around porch — each one different, each one earned. The porch is in full bloom."
        : `You have earned ${earned} of ${GARDEN_PORCH_POTS.length} flower pots on the big wrap-around porch — each one different, each one earned. The next pot comes at ${next} patches in flower.`;
  return (
    <Section title="Flower pots on the big wrap-around porch">
      <p className="leading-relaxed text-[var(--text)]">
        Flower pots appear on the big wrap-around porch — one pot at a time, each time a milestone is hit, and no two pots are alike. {flowerCount} of {LIFE_GARDEN_ITEMS.length} patches in flower.
      </p>
      <div className="felt-card mt-3 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <svg viewBox="0 0 360 170" className="mx-auto w-full" role="img" aria-label={earned === 0 ? "The cottage's big wrap-around porch, with no flower pots yet" : `${earned} of ${GARDEN_PORCH_POTS.length} flower pots earned on the cottage's big wrap-around porch`}>
          <rect x="10" y="140" width="340" height="10" rx="4" fill="#8a6a4f" />
          {GARDEN_PORCH_POTS.map((design, i) => {
            const cx = 40 + i * 56;
            const potTop = 140 - design.potHeight;
            const isEarned = i < earned;
            if (!isEarned) {
              return <rect key={design.name} x={cx - 20} y={potTop} width="40" height={design.potHeight} rx="5" fill="none" stroke="#b9a48e" strokeWidth="2" strokeDasharray="6 5" />;
            }
            return (
              <g key={design.name}>
                {design.flowers.map((f) => (
                  <g key={`${f.dx}-${f.dy}`}>
                    <line x1={cx + f.dx} y1={potTop + f.dy + 8} x2={cx + f.dx} y2={potTop} stroke="#4a7a4f" strokeWidth="3" strokeLinecap="round" />
                    <circle cx={cx + f.dx} cy={potTop + f.dy} r="9" fill={f.colour} />
                    <circle cx={cx + f.dx} cy={potTop + f.dy} r="3" fill="#f5c542" />
                  </g>
                ))}
                <rect x={cx - 24} y={potTop - 8} width="48" height="10" rx="4" fill={design.rimFill} stroke={design.potFill} strokeWidth="2" />
                <polygon points={`${cx - 20},${potTop + 2} ${cx + 20},${potTop + 2} ${cx + 15},140 ${cx - 15},140`} fill={design.potFill} stroke={design.potFill} strokeWidth="2" />
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-center font-bold leading-relaxed text-[var(--text)]">{stageText}</p>
        <ul className="mt-2 space-y-1">
          {GARDEN_PORCH_POTS.map((design, i) => (
            <li key={design.name} className="text-center text-sm leading-relaxed text-[var(--dim)]">
              {i < earned ? `✓ ${design.name} — earned at ${GARDEN_PORCH_POT_MILESTONES[i]} ${GARDEN_PORCH_POT_MILESTONES[i] === 1 ? "patch" : "patches"} in flower` : `${design.name} — comes at ${GARDEN_PORCH_POT_MILESTONES[i]} patches in flower`}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        These flower pots live on this phone only — nothing is sent anywhere.
      </p>
    </Section>
  );
}

function LifeGardenPage({ onGoHome, onGoTab, profiles, initialView = "list", mapRequest, backLabel }: { onGoHome: () => void; onGoTab: (t: TabId) => void; profiles?: Profile[]; initialView?: "list" | "map" | "cozy"; mapRequest?: number; backLabel?: string }) {
  const [checked, setChecked] = useState<string[]>(() => loadLifeGardenChecked());
  const [zoomed, setZoomed] = useState(false);
  // Map piece (Richard, 2026-11-26): the garden list, the Map,
  // and the Cozy Room are three views of the same place — the
  // Map and the Cozy Room open from here, and come straight back.
  // initialView matters: the map button from the Cozy Room must
  // land straight on the real Map, not on the garden list — the
  // list's progress tree is a progress report, not a map, and
  // landing on it is why the map button seemed not to show a map.
  const [view, setView] = useState<"list" | "map" | "cozy">(initialView);
  // A fresh tap on Site Map must land on the map even when this
  // same garden is already open: useState(initialView) only runs
  // on mount, so after Map → garden list, tapping Site Map again
  // left the garden on the list — "No trail map" (Richard,
  // 2026-11-26). Every Site Map tap bumps mapRequest, and the
  // garden answers by going back to its initial view. The garden
  // opened from Home passes no mapRequest, so nothing changes
  // there; and this is an effect, not a remount, so no extra
  // visit is recorded.
  useEffect(() => { setView(initialView); }, [mapRequest, initialView]);
  // Third piece (Richard, 2026-11-26): your name, your figure and
  // your spirit guide — optional, local only, nothing sent anywhere.
  const [gardenName, setGardenName] = useState<string>(() => loadLifeGardenName());
  const [gardenAvatar, setGardenAvatar] = useState<string | null>(() => loadLifeGardenAvatar());
  const [gardenGuide, setGardenGuide] = useState<string | null>(() => loadLifeGardenGuide());
  // Fifth piece (Richard, 2026-11-26): each visit to the garden
  // counts toward clearing the patch right before the cottage —
  // recorded once, when the garden opens.
  const [visits, setVisits] = useState<GardenVisits>(() => loadLifeGardenVisits());
  useEffect(() => {
    setVisits(recordLifeGardenVisit());
  }, []);
  const saveGardenName = (next: string) => {
    const clean = next.trim().slice(0, 40);
    setGardenName(clean);
    if (clean) safeLocalSet(LIFE_GARDEN_NAME_KEY, clean); else safeLocalRemove(LIFE_GARDEN_NAME_KEY);
  };
  const saveGardenAvatar = (next: string) => {
    setGardenAvatar(next);
    safeLocalSet(LIFE_GARDEN_AVATAR_KEY, next);
  };
  const saveGardenGuide = (next: string) => {
    setGardenGuide(next);
    safeLocalSet(LIFE_GARDEN_GUIDE_KEY, next);
  };
  if (view === "map") {
    return <GardenMapPage onGoHome={onGoHome} onGoGarden={() => { setChecked(loadLifeGardenChecked()); setView("list"); if (typeof window !== "undefined") window.scrollTo(0, 0); }} onGoTab={onGoTab} onOpenCozy={() => { setView("cozy"); if (typeof window !== "undefined") window.scrollTo(0, 0); }} profiles={profiles} gardenName={gardenName} backLabel={backLabel} />;
  }
  if (view === "cozy") {
    // The map button in the Cozy Room must open the real Map
    // (Richard, 2026-11-26) — it used to go back to the garden
    // list, so it did not show a map at all.
    return <CozyRoomPage onGoHome={onGoHome} onGoMap={() => { setView("map"); if (typeof window !== "undefined") window.scrollTo(0, 0); }} gardenName={gardenName} backLabel={backLabel} />;
  }
  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
      safeLocalSet(LIFE_GARDEN_KEY, JSON.stringify(next));
      return next;
    });
  };
  // Sixth piece (Richard, 2026-11-26): the flower pot on the
  // big wrap-around porch pots are earned one at a time as patches clear.
  const porchFlowerCount = LIFE_GARDEN_ITEMS.filter((item) => checked.includes(item) || loadLifeGardenTrophies().includes(item)).length;
  const porchCottageBlooms = gardenCottagePatchBlooms(visits, porchFlowerCount === LIFE_GARDEN_ITEMS.length);
  return (
    <div>
      <button type="button" onClick={onGoHome} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">
        {backLabel ?? "← Back to Home"}
      </button>
      <p className="mt-4 text-center font-display text-xl font-bold text-[var(--accent)]">Welcome, {gardenName ? gardenName : "friend"}</p>
      <h2 className="mt-4 font-display text-2xl font-semibold leading-snug text-[var(--text)]">My Life Garden Pathway</h2>
      {/* Richard's exact intro verbiage (2026-11-26 08:00 PST) —
          word for word at the start of the garden, before the
          checklist. Do not paraphrase or add words to it. */}
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        Welcome friend. This is your garden of Life. We all choose our own path. You have chosen yours. We are here to help guide you to a happier place, a happier you. Some paths you may have already explored and others await. Enjoy the journey. Peace.
      </p>
      {/* Tapping the image zooms the entire photo (Richard,
          2026-11-25): good enough — no separate zoom on the
          cottage or the gazebo. */}
      <button type="button" onClick={() => setZoomed(true)} aria-label="My Life Garden Pathway — tap to see the whole photo bigger" className="mt-4 block w-full overflow-hidden rounded-[var(--radius)] border-2 border-[var(--leaf)]">
        {/* Trail pic reversed (Richard, 2026-11-27): "This weedy
            trail pic should be seen reversed. Leading from cottage
            to the field" — so the picture is flipped horizontally
            (scaleX(-1)), cottage first, path leading out to the
            field, not field heading towards the cottage. Same
            bundled image, no new binary; caption / alt unchanged. */}
        <img src={myLifeGarden} alt="My Life Garden Pathway — a long pathway of small flat wooden stepping stones, with weeds bordering both sides, leading up to the cottage, with the octagonal gazebo off to the side" className="w-full" style={{ transform: "scaleX(-1)" }} />
      </button>
      <p className="mt-2 text-center text-sm text-[var(--dim)]">Tap the photo to see it bigger.</p>
      {zoomed && (
        <div role="dialog" aria-label="My Life Garden Pathway, enlarged" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomed(false)}>
          <button type="button" onClick={() => setZoomed(false)} aria-label="Close the enlarged photo" className="max-h-full max-w-full">
            <img src={myLifeGarden} alt="My Life Garden Pathway — enlarged" className="max-h-[85vh] w-auto max-w-full rounded-[var(--radius)]" style={{ transform: "scaleX(-1)" }} />
            <span className="mt-2 block text-center font-semibold text-white">Tap anywhere to close</span>
          </button>
        </div>
      )}
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        Hello {gardenName ? gardenName : "friend"}. Weeds grow naturally and life&apos;s pathway can be full of them. I suspect you have already cleared plenty. Please select from the items below, so we may update your path. Thanks.
      </p>
      <Section title="What is already true for you">
        <ul className="space-y-2">
          {LIFE_GARDEN_ITEMS.map((item) => (
            <li key={item}>
              <label className="felt-card flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <input type="checkbox" checked={checked.includes(item)} onChange={() => toggleItem(item)} className="h-6 w-6 shrink-0 accent-[#6aa84f]" />
                <span className="leading-relaxed text-[var(--text)]">{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        Weed clearing begins from the front steps of the cottage — you have already been invited in. No calorie counting, no weighing, no judging.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        What you tick here stays on this phone, in this browser only — nothing is sent anywhere, and nothing is scored yet.
      </p>
      <GardenPathStrip checked={checked} visits={visits} />
      <GardenPorchPot flowerCount={porchFlowerCount} cottageBlooms={porchCottageBlooms} />
      <GardenCompanions
        name={gardenName}
        onName={saveGardenName}
        avatar={gardenAvatar}
        onAvatar={saveGardenAvatar}
        guide={gardenGuide}
        onGuide={saveGardenGuide}
      />
      <div className="mt-6 space-y-3">
        <button type="button" onClick={() => { setView("map"); if (typeof window !== "undefined") window.scrollTo(0, 0); }} style={{ backgroundColor: "#fdeeda", borderColor: "#d99a4e" }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
          <p className="font-display text-xl font-black text-[#2e2117]">See the Map →</p>
          <p className="mt-1 leading-relaxed text-[#6f5a44]">One path, branching to the gazebo, dead ends, and Longevity to infinity.</p>
        </button>
        <button type="button" onClick={() => { setView("cozy"); if (typeof window !== "undefined") window.scrollTo(0, 0); }} style={{ backgroundColor: "#fbe3ee", borderColor: "#c95a8a" }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
          <p className="font-display text-xl font-black text-[#2e2117]">Inside view — my Cozy Room →</p>
          <p className="mt-1 leading-relaxed text-[#6f5a44]">Your room inside the cottage — trophies, books and photos on the walls and shelves.</p>
        </button>
      </div>
      <div className="mt-6">
        <button type="button" onClick={onGoHome} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">
          {backLabel ?? "← Back to Home"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Garden Map + Cozy Room (Richard, 2026-11-26) ---------- */
// The Map piece: warm and cozy from the get-go, navigation links
// that match all the buttons/tabs. The Cozy Room piece: the first
// inside view — no trophies yet, a few empty picture frames on the
// walls, books on the shorter shelf, the taller shelf sparse with
// two or three empty frames, one candle on the mantle, beige rugs.
// Trophies earned from the Map wait in the Cozy Room. Local only.

// The Map, prettier (Richard, 2026-11-28): the green stick
// lines are stepping-stone pathways now, winding gently — the
// main path down from the cottage and each side pathway out to
// its stop — not sharp zigzags (zigzags were raised only as
// possibly easier to program; he pictured gentle winding).
// Lengthened the same day, at his word: "Life is a long path
// if one gets lucky or takes good care of themselves. It's OK
// if it doesn't all fit on a single smartphone screen." So the
// tree is taller than one screen — rows about 140 apart
// instead of 100, Longevity with room to go onward at the
// bottom — and the visitor scrolls down to walk it all.
// Stones stay stones; flowers grow around and between them
// along the whole length of a path when it is walked, not one
// tiny flower at the end. Each pathway has its own colour from
// the app's spring palette. A path's flowers grow with the
// quit-date milestones already settled — Quit day, One day, One
// week, One month, Three months, One year — so the Map is a
// visual snapshot of progress besides the points. A quit day in
// the past still counts. His example: his already-quit Smoking
// path would be filled with flowers around the stones. Paths
// without a quit day bloom from what is already true for them:
// ticking an item, or earning its trophy, fills that path.
// The boxes, the branch taps and the trophy are unchanged
// here — the stool wording is gone (Richard, 2026-11-28):
// just the trophy 🏆 now, no stool anywhere on the Map,
// in the boxes, the aria-label or the caption.
type GardenMapBranchPath = { d: string; stones: { x: number; y: number }[]; flowers: { x: number; y: number }[] };

// The main pathway, winding gently down from the cottage front
// steps: it passes through (180, 268), (180, 408), (180, 548)
// and (180, 688) exactly, so every side branch still joins it
// where its box expects it to, and it sways a little left and
// right between those joins. Stones sit on the sway. The tree
// is longer now (Richard, 2026-11-28): rows about 140 apart,
// so the winding, stones and flowers are not crowded, and
// Longevity has room to go onward at the bottom.
const GARDEN_MAP_MAIN_PATH =
  "M180 40 C170 90 172 180 180 268 C190 300 188 370 180 408 C170 440 172 510 180 548 C190 580 188 650 180 688 C172 720 174 750 180 780";
const GARDEN_MAP_MAIN_STONES: { x: number; y: number }[] = [
  { x: 178, y: 70 }, { x: 173, y: 160 }, { x: 186, y: 330 },
  { x: 173, y: 480 }, { x: 186, y: 620 },
];

// One spring colour per pathway. Ten branches, five colours in
// the palette, so the colours repeat down the Map in the same
// order — a branch is always its own colour, and the Map stays
// in one spring family.
const GARDEN_MAP_BRANCH_COLOURS: Record<string, string> = {
  gazebo: "#9a5a90", // soft plum — quiet time
  alcohol: "#d99a4e", // sunrise orange
  smoking: "#3f6fb5", // morning-sky blue
  gambling: "#e86a8a", // blossom pink
  drugs: "#6aa84f", // spring-leaf green
  codependency: "#3f8a8a", // teal
  food: "#d99a4e", // sunrise orange
  screens: "#3f6fb5", // morning-sky blue
  wellbeing: "#e86a8a", // blossom pink
  longevity: "#6aa84f", // spring-leaf green
};

// Winding side pathways, two stones each, and six flower spots
// along each one — flowers are drawn only up to how far that
// path has been walked (see gardenMapBranchFlowerCount), so a
// path fills with flowers along its whole length, around and
// between the stones, and the next spot shows a small bud once
// the path has started (see gardenMapBranchStarted). Left
// branches wind out to x=124, right branches to x=236, where
// their boxes start; the gazebo branch winds down-left to
// (138, 118). The Longevity flowers sit along the trunk below
// the last pair and inside its box, flanking the trophies
// already there.
// Spacing (Richard, 2026-11-28): the six spots sit in two rows
// of three, above and below the dirt path — never on it, and
// never on a stone — so full bloom does not crowd the stones
// or the joins. The innermost spots are pulled back toward
// their own box (left no further than x=160, right no nearer
// than x=200), so the left and right clusters never meet at
// the trunk. The Longevity trunk flowers stagger to the sides
// of the trunk, between the stones, and its three in-box
// flowers sit beside the trophies, 24px from each one. The
// trunk flowers start below the last pair's flower rows
// (y 726 and down), so they never meet the Screens or
// Feeling Unwell flowers at y 708.
const GARDEN_MAP_BRANCH_PATHS: Record<string, GardenMapBranchPath> = {
  gazebo: {
    d: "M180 70 C170 90 152 115 138 143",
    stones: [{ x: 168, y: 82 }, { x: 152, y: 112 }],
    flowers: [{ x: 158, y: 63 }, { x: 154, y: 78 }, { x: 150, y: 92 }, { x: 137, y: 101 }, { x: 136, y: 117 }, { x: 123, y: 125 }],
  },
  alcohol: {
    d: "M180 268 C166 256 146 280 124 268",
    stones: [{ x: 164, y: 264 }, { x: 142, y: 272 }],
    flowers: [{ x: 132, y: 248 }, { x: 132, y: 288 }, { x: 146, y: 248 }, { x: 146, y: 288 }, { x: 160, y: 248 }, { x: 160, y: 288 }],
  },
  smoking: {
    d: "M180 268 C194 256 214 280 236 268",
    stones: [{ x: 196, y: 264 }, { x: 218, y: 272 }],
    flowers: [{ x: 228, y: 248 }, { x: 228, y: 288 }, { x: 214, y: 248 }, { x: 214, y: 288 }, { x: 200, y: 248 }, { x: 200, y: 288 }],
  },
  gambling: {
    d: "M180 408 C166 396 146 420 124 408",
    stones: [{ x: 164, y: 404 }, { x: 142, y: 412 }],
    flowers: [{ x: 132, y: 388 }, { x: 132, y: 428 }, { x: 146, y: 388 }, { x: 146, y: 428 }, { x: 160, y: 388 }, { x: 160, y: 428 }],
  },
  drugs: {
    d: "M180 408 C194 396 214 420 236 408",
    stones: [{ x: 196, y: 404 }, { x: 218, y: 412 }],
    flowers: [{ x: 228, y: 388 }, { x: 228, y: 428 }, { x: 214, y: 388 }, { x: 214, y: 428 }, { x: 200, y: 388 }, { x: 200, y: 428 }],
  },
  codependency: {
    d: "M180 548 C166 536 146 560 124 548",
    stones: [{ x: 164, y: 544 }, { x: 142, y: 552 }],
    flowers: [{ x: 132, y: 528 }, { x: 132, y: 568 }, { x: 146, y: 528 }, { x: 146, y: 568 }, { x: 160, y: 528 }, { x: 160, y: 568 }],
  },
  food: {
    d: "M180 548 C194 536 214 560 236 548",
    stones: [{ x: 196, y: 544 }, { x: 218, y: 552 }],
    flowers: [{ x: 228, y: 528 }, { x: 228, y: 568 }, { x: 214, y: 528 }, { x: 214, y: 568 }, { x: 200, y: 528 }, { x: 200, y: 568 }],
  },
  screens: {
    d: "M180 688 C166 676 146 700 124 688",
    stones: [{ x: 164, y: 684 }, { x: 142, y: 692 }],
    flowers: [{ x: 132, y: 668 }, { x: 132, y: 708 }, { x: 146, y: 668 }, { x: 146, y: 708 }, { x: 160, y: 668 }, { x: 160, y: 708 }],
  },
  wellbeing: {
    d: "M180 688 C194 676 214 700 236 688",
    stones: [{ x: 196, y: 684 }, { x: 218, y: 692 }],
    flowers: [{ x: 228, y: 668 }, { x: 228, y: 708 }, { x: 214, y: 668 }, { x: 214, y: 708 }, { x: 200, y: 668 }, { x: 200, y: 708 }],
  },
  longevity: {
    d: "M180 688 C172 720 174 750 180 780",
    stones: [{ x: 178, y: 720 }, { x: 186, y: 760 }],
    flowers: [{ x: 156, y: 726 }, { x: 200, y: 746 }, { x: 156, y: 768 }, { x: 170, y: 806 }, { x: 190, y: 832 }, { x: 170, y: 858 }],
  },
}

// How many of the six flower spots along a branch are in
// flower: 0 to 6. A quit-date path (Alcohol, Smoking,
// Gambling, Drugs, Codependency) grows one flower per settled
// milestone reached from its effective quit day — the tab's
// quit day first, otherwise the garden one — so a quit day in
// the past already has flowers, and a quit day still ahead has
// none yet. Any other path blooms from what is already true:
// each item ticked or trophy-earned fills the same share of
// its six spots, and a path with no quit day and nothing ticked
// yet has no flowers. A quit-date path with a quit day set uses
// its milestones, not its ticked item.
function gardenMapBranchFlowerCount(
  stop: GardenMapStop,
  checked: string[],
  trophies: string[],
  effectiveQuitDay: string | null,
): number {
  const isQuitStop = stop.tab === "alcohol" || stop.tab === "smoking" || stop.tab === "gambling" || stop.tab === "drugs" || stop.tab === "codependency";
  if (isQuitStop && effectiveQuitDay) {
    const until = daysUntilGardenDate(effectiveQuitDay);
    if (until == null) return 0;
    return gardenMilestonesReached(-until).length;
  }
  if (stop.items.length === 0) return 0;
  const done = stop.items.filter((item) => checked.includes(item) || trophies.includes(item)).length;
  return Math.round((6 * done) / stop.items.length);
}

// Has this path started yet — the bud test (Richard,
// 2026-11-28): a quit-date path has started once a quit day
// is set, even if no milestone is reached yet; any other path
// has started once something on it is already true (an item
// ticked or a trophy earned). A path that has not started
// shows no bud — its spots stay empty, not half-promised.
function gardenMapBranchStarted(
  stop: GardenMapStop,
  checked: string[],
  trophies: string[],
  effectiveQuitDay: string | null,
): boolean {
  const isQuitStop = stop.tab === "alcohol" || stop.tab === "smoking" || stop.tab === "gambling" || stop.tab === "drugs" || stop.tab === "codependency";
  if (isQuitStop) return effectiveQuitDay != null;
  return stop.items.some((item) => checked.includes(item) || trophies.includes(item));
}

// One small flower on the Map: five petals in the pathway's
// own spring colour, with a sunrise-orange centre. Drawn in
// the SVG, so it needs no image and stays crisp on a phone.
// Kept small (petal r 2.5, Richard 2026-11-28) so a path in
// full bloom does not crowd its stones or its neighbours.
function GardenMapFlower({ x, y, colour }: { x: number; y: number; colour: string }) {
  return (
    <g aria-hidden="true">
      {[0, 72, 144, 216, 288].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return <circle key={angle} cx={x + 3.8 * Math.cos(rad)} cy={y + 3.8 * Math.sin(rad)} r="2.5" fill={colour} />;
      })}
      <circle cx={x} cy={y} r="2.2" fill="#d99a4e" />
    </g>
  );
}

// One small bud on the Map (Richard, 2026-11-28): the next
// flower not yet bloomed — a small closed bud in the pathway's
// own spring colour, on a short green stem, smaller than a full
// flower so a bud never reads as a bloom. One bud only, at the
// next spot after the flowers already open; the spots after
// that stay empty until their turn.
function GardenMapBud({ x, y, colour }: { x: number; y: number; colour: string }) {
  return (
    <g aria-hidden="true">
      <line x1={x} y1={y + 4} x2={x} y2={y + 9} stroke="#6aa84f" strokeWidth="1.5" />
      <ellipse cx={x} cy={y} rx="3.2" ry="4.5" fill={colour} />
      <path d={`M${x - 3} ${y + 2} L${x} ${y + 5} L${x + 3} ${y + 2}`} stroke="#6aa84f" strokeWidth="1.2" fill="none" />
    </g>
  );
}

function GardenMapPage({ onGoHome, onGoGarden, onGoTab, onOpenCozy, profiles, gardenName = "", backLabel = "← Back to Home" }: {
  onGoHome: () => void;
  onGoGarden: () => void;
  onGoTab: (t: TabId) => void;
  onOpenCozy: () => void;
  profiles?: Profile[];
  gardenName?: string;
  // Where "back" goes when the Map was opened on its own — from
  // the garden it is Home; from the Site Map button it is the tab
  // the visitor came from, named in the label so the button never
  // promises Home when it goes elsewhere. The top tab buttons are
  // always there too, including Home.
  backLabel?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [gazeboZoomed, setGazeboZoomed] = useState(false);
  const [trophies, setTrophies] = useState<string[]>(() => loadLifeGardenTrophies());
  const [checked, setChecked] = useState<string[]>(() => loadLifeGardenChecked());
  const [quitDays, setQuitDays] = useState<GardenQuitDays>(() => loadLifeGardenQuitDays());
  const [quitDraft, setQuitDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  // Sixth piece (Richard, 2026-11-26): the flower pot on the
  // big wrap-around porch pots, shown on the Map near the cottage, are
  // with the patches already cleared.
  const porchFlowerCount = LIFE_GARDEN_ITEMS.filter((item) => checked.includes(item) || trophies.includes(item)).length;
  const porchCottageBlooms = gardenCottagePatchBlooms(loadLifeGardenVisits(), porchFlowerCount === LIFE_GARDEN_ITEMS.length);
  // Flowers along each branch on the Map (Richard, 2026-11-28):
  // the same effective quit day the stop panel uses — the tab's
  // quit day first, otherwise the garden one — so the flowers on
  // a branch and the milestones in its panel always agree.
  const mapBranchEffectiveQuitDay = (stop: GardenMapStop): string | null => {
    const tabProfile = stop.tab != null ? profiles?.find((p) => p.category === stop.tab) : undefined;
    return tabProfile?.quitDate ?? quitDays[stop.id] ?? null;
  };
  const mapBranchFlowers = (stop: GardenMapStop): number =>
    gardenMapBranchFlowerCount(stop, checked, trophies, mapBranchEffectiveQuitDay(stop));
  // Whether the next flower on this branch is a bud (Richard,
  // 2026-11-28): the path has started, but its next milestone
  // is not reached yet — so the next spot shows a small closed
  // bud, ready to bloom. No bud at full bloom, and none on a
  // path not started.
  const mapBranchHasBud = (stop: GardenMapStop): boolean => {
    if (mapBranchFlowers(stop) >= 6) return false;
    return gardenMapBranchStarted(stop, checked, trophies, mapBranchEffectiveQuitDay(stop));
  };
  const earn = (item: string) => {
    const before = loadLifeGardenTrophies();
    if (before.includes(item)) {
      setMessage(`You already have a trophy for "${item}" — it is waiting in your Cozy Room.`);
      return;
    }
    const next = [...before, item];
    safeLocalSet(LIFE_GARDEN_TROPHY_KEY, JSON.stringify(next));
    setTrophies(next);
    const checkedNow = loadLifeGardenChecked();
    if (!checkedNow.includes(item)) {
      safeLocalSet(LIFE_GARDEN_KEY, JSON.stringify([...checkedNow, item]));
      setChecked([...checkedNow, item]);
    }
    setMessage(before.length === 0
      ? "Congratulations, you have your first trophy for your Cozy Room."
      : `Congratulations, you have another trophy for your Cozy Room — that is ${next.length} trophies in your Cozy Room.`);
  };
  const saveQuitDay = (stop: GardenMapStop) => {
    if (!gardenQuitDayIsValid(quitDraft)) {
      setMessage("Pick a date first — any day counts, even one in the past.");
      return;
    }
    const next = { ...quitDays, [stop.id]: quitDraft };
    setQuitDays(next);
    saveLifeGardenQuitDays(next);
    setMessage(`Your quit day for ${stop.label} is ${quitDraft}. Your path has stretched out with steps to walk.`);
  };
  const clearQuitDay = (stop: GardenMapStop) => {
    const next = { ...quitDays };
    delete next[stop.id];
    setQuitDays(next);
    saveLifeGardenQuitDays(next);
    setQuitDraft("");
    setMessage(`Your quit day for ${stop.label} is cleared — the path is short again, until you pick another day.`);
  };
  // Map interactivity (Richard, 2026-11-26): "I thought the map
  // was interactive but didn't seem to be." The diagram itself
  // was a dead picture — only the list below it was tappable.
  // So every branch in the diagram is now a big tappable button
  // that opens its stop below, with its option(s) and trophy.
  const openStop = (id: string) => {
    setSelected(id);
    setQuitDraft(quitDays[id] ?? "");
    if (typeof document !== "undefined") {
      document.getElementById(`garden-map-stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const diagramKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openStop(id); }
  };
  return (
    <div>
      <button type="button" onClick={onGoHome} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">
        {backLabel}
      </button>
      <h2 className="mt-4 font-display text-2xl font-semibold leading-snug text-[var(--text)]">Map — My Life Garden Pathway</h2>
      {/* The saved name follows the visitor here too (Richard,
          2026-11-26): once the name sticks, "friend" is replaced
          by it everywhere in the garden — "Welcome, 007.5" — and
          "friend" stays only when no name is saved. */}
      <p className="mt-4 text-center font-display text-xl font-bold text-[var(--accent)]">Welcome, {gardenName ? gardenName : "friend"}</p>
      <p className="mt-3 leading-relaxed text-[var(--text)]">
        Warm and cozy from the start. One pathway from the front steps of the cottage, branching — dividing from the path. One branch to the gazebo for quiet time, dead ends for drinking, smoking, gambling, drugs and the rest, and the longevity path going on to infinity.
      </p>
      {/* The Map IS the diagram, and it comes first (Richard,
          2026-11-26): he tapped Site Map, took a quick peek, and
          saw no trail map — the cottage photo filled the first
          screen and the diagram was below it, so a peek never
          reached it. The diagram now pops up at once, right under
          the heading, so the trail map is what you see when you tap
          Site Map. Our real cottage, with the caption Richard
          liked, stays on the Map, just below the diagram. The old
          map photo is gone: he saw it and said it was not a
          diagram — "Just has cottage, gazebo infinity path". The
          diagram shows every branch itself: the gazebo branch, all
          eight dead ends, each with a trophy, and
          the longevity path going on to infinity with trophies
          along it. The tap-to-open links below it are unchanged. */}
      <div className="felt-soft mt-4 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-3" role="img" aria-label="Map diagram: one pathway from the cottage front steps, branching to the gazebo for quiet time, eight dead ends — Alcohol, Smoking, Gambling, Drugs, Codependency, Food, Screens, Feeling Unwell — each with a trophy at the end, and the Longevity path going on to infinity with trophies along it">
        <svg viewBox="0 0 360 960" className="w-full" role="group" aria-label="Map diagram — tap a branch to open it">
          {/* The cottage is the start of the map — it sits at the
              top of the diagram, so the diagram reads as a map
              from the cottage, not as a tree. The pathway runs
              down from its front steps, straight down the middle. */}
          <rect x="105" y="4" width="150" height="36" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth="2" />
          <text x="180" y="28" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#2e2117">🏠 Cottage — start here</text>
          {/* The main pathway, winding gently down from the cottage
              front steps (Richard, 2026-11-28): a dirt path with
              stepping stones on it, not a straight green stick.
              The stones sit on the sway of the path. */}
          <path d={GARDEN_MAP_MAIN_PATH} stroke="#d9c9a8" strokeWidth="16" fill="none" strokeLinecap="round" />
          <g aria-label="Stepping stones along the main pathway">
            {GARDEN_MAP_MAIN_STONES.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="9" ry="6" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          {/* Gazebo branch — dividing off to the left, for quiet time.
              Winding, with stepping stones on a dirt path in the
              gazebo's soft plum. Its flowers are drawn with the
              rest, after the boxes, so they sit on top. */}
          <path d={GARDEN_MAP_BRANCH_PATHS.gazebo!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.gazebo!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.gazebo} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the gazebo pathway">
            {GARDEN_MAP_BRANCH_PATHS.gazebo!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open the Gazebo — quiet time" onClick={() => openStop("gazebo")} onKeyDown={(e) => diagramKey(e, "gazebo")} style={{ cursor: "pointer" }}>
          <rect x="28" y="110" width="110" height="66" rx="8" fill="#f3e2f0" stroke="#9a5a90" strokeWidth={selected === "gazebo" ? 4 : 2} />
          <text x="83" y="134" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#2e2117">Gazebo</text>
          <text x="83" y="152" textAnchor="middle" fontSize="11" fill="#6f5a44">quiet time</text>
          <text x="83" y="170" textAnchor="middle" fontSize="13" fill="#2e2117">🏆 🏆 🏆</text>
          </g>
          {/* Eight dead ends, in pairs off the pathway — a trophy at the end of each.
              Each pair is a winding stepping-stone pathway now
              (Richard, 2026-11-28): dirt under the stones, a thin
              line in that pathway's own spring colour, stones on
              top. Flowers for each branch are drawn after the
              boxes, so they sit on top. */}
          <path d={GARDEN_MAP_BRANCH_PATHS.alcohol!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.alcohol!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.alcohol} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Alcohol pathway">
            {GARDEN_MAP_BRANCH_PATHS.alcohol!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.smoking!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.smoking!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.smoking} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Smoking pathway">
            {GARDEN_MAP_BRANCH_PATHS.smoking!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Alcohol" onClick={() => openStop("alcohol")} onKeyDown={(e) => diagramKey(e, "alcohol")} style={{ cursor: "pointer" }}>
          <rect x="6" y="240" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "alcohol" ? 4 : 2} />
          <text x="65" y="262" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2e2117">Alcohol</text>
          <text x="65" y="282" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Smoking" onClick={() => openStop("smoking")} onKeyDown={(e) => diagramKey(e, "smoking")} style={{ cursor: "pointer" }}>
          <rect x="236" y="240" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "smoking" ? 4 : 2} />
          <text x="295" y="262" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2e2117">Smoking</text>
          <text x="295" y="282" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.gambling!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.gambling!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.gambling} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Gambling pathway">
            {GARDEN_MAP_BRANCH_PATHS.gambling!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.drugs!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.drugs!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.drugs} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Drugs pathway">
            {GARDEN_MAP_BRANCH_PATHS.drugs!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Gambling" onClick={() => openStop("gambling")} onKeyDown={(e) => diagramKey(e, "gambling")} style={{ cursor: "pointer" }}>
          <rect x="6" y="380" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "gambling" ? 4 : 2} />
          <text x="65" y="402" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2e2117">Gambling</text>
          <text x="65" y="422" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Drugs" onClick={() => openStop("drugs")} onKeyDown={(e) => diagramKey(e, "drugs")} style={{ cursor: "pointer" }}>
          <rect x="236" y="380" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "drugs" ? 4 : 2} />
          <text x="295" y="402" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2e2117">Drugs</text>
          <text x="295" y="422" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.codependency!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.codependency!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.codependency} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Codependency pathway">
            {GARDEN_MAP_BRANCH_PATHS.codependency!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.food!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.food!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.food} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Food pathway">
            {GARDEN_MAP_BRANCH_PATHS.food!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Codependency" onClick={() => openStop("codependency")} onKeyDown={(e) => diagramKey(e, "codependency")} style={{ cursor: "pointer" }}>
          <rect x="6" y="520" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "codependency" ? 4 : 2} />
          <text x="65" y="542" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#2e2117">Codependency</text>
          <text x="65" y="562" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Food" onClick={() => openStop("food")} onKeyDown={(e) => diagramKey(e, "food")} style={{ cursor: "pointer" }}>
          <rect x="236" y="520" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "food" ? 4 : 2} />
          <text x="295" y="542" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2e2117">Food</text>
          <text x="295" y="562" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.screens!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.screens!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.screens} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Screens pathway">
            {GARDEN_MAP_BRANCH_PATHS.screens!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <path d={GARDEN_MAP_BRANCH_PATHS.wellbeing!.d} stroke="#d9c9a8" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={GARDEN_MAP_BRANCH_PATHS.wellbeing!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.wellbeing} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Feeling Unwell pathway">
            {GARDEN_MAP_BRANCH_PATHS.wellbeing!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Screens" onClick={() => openStop("screens")} onKeyDown={(e) => diagramKey(e, "screens")} style={{ cursor: "pointer" }}>
          <rect x="6" y="660" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "screens" ? 4 : 2} />
          <text x="65" y="682" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2e2117">Screens</text>
          <text x="65" y="702" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Feeling Unwell" onClick={() => openStop("wellbeing")} onKeyDown={(e) => diagramKey(e, "wellbeing")} style={{ cursor: "pointer" }}>
          <rect x="236" y="660" width="118" height="56" rx="8" fill="#fdeeda" stroke="#d99a4e" strokeWidth={selected === "wellbeing" ? 4 : 2} />
          <text x="295" y="680" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#2e2117">Feeling</text>
          <text x="295" y="694" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#2e2117">Unwell?</text>
          <text x="295" y="710" textAnchor="middle" fontSize="11" fill="#6f5a44">🏆</text>
          </g>
          {/* Longevity — the only infinite path, with trophies along it, not just at the end.
              Its pathway is the trunk below the last pair, in
              spring-leaf green, with its own stepping stone. */}
          <path d={GARDEN_MAP_BRANCH_PATHS.longevity!.d} stroke={GARDEN_MAP_BRANCH_COLOURS.longevity} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <g aria-label="Stepping stones along the Longevity pathway">
            {GARDEN_MAP_BRANCH_PATHS.longevity!.stones.map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="8" ry="5.5" fill="#e9dcc0" stroke="#b89a6a" strokeWidth="1.5" />
            ))}
          </g>
          <g role="button" tabIndex={0} aria-label="Tap to open Longevity — the path that goes on to infinity" onClick={() => openStop("longevity")} onKeyDown={(e) => diagramKey(e, "longevity")} style={{ cursor: "pointer" }}>
          <rect x="40" y="780" width="280" height="150" rx="8" fill="#e2f2da" stroke="#6aa84f" strokeWidth={selected === "longevity" ? 4 : 2} />
          <text x="146" y="806" textAnchor="middle" fontSize="15" fill="#2e2117">🏆</text>
          <text x="214" y="832" textAnchor="middle" fontSize="15" fill="#2e2117">🏆</text>
          <text x="146" y="858" textAnchor="middle" fontSize="15" fill="#2e2117">🏆</text>
          <text x="180" y="918" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#2e2117">Longevity → ∞</text>
          </g>
          {/* Flowers along the pathways (Richard, 2026-11-28): a
              path fills with flowers along its whole length,
              around the stones, as its milestones are reached —
              one flower per milestone on a quit-date path, and
              the same share of its six spots on any other path
              for what is already true there. Stones stay stones;
              the flowers grow around them. Each flower is
              two-step: fully bloomed when its milestone is
              reached, and a small closed bud at the next spot
              only, once the path has started, ready to bloom.
              Drawn last, so they sit on top of the boxes'
              edges and the Longevity box, where some of them
              live. */}
          <g aria-label="Flowers along the pathways you have walked">
            {GARDEN_MAP_STOPS.map((stop) => {
              const branch = GARDEN_MAP_BRANCH_PATHS[stop.id];
              if (!branch) return null;
              const colour = GARDEN_MAP_BRANCH_COLOURS[stop.id] ?? "#6aa84f";
              const count = mapBranchFlowers(stop);
              const next = branch.flowers[count];
              return (
                <g key={stop.id}>
                  {branch.flowers.slice(0, count).map((f, i) => (
                    <GardenMapFlower key={`${stop.id}-${i}`} x={f.x} y={f.y} colour={colour} />
                  ))}
                  {mapBranchHasBud(stop) && next ? (
                    <GardenMapBud key={`${stop.id}-bud`} x={next.x} y={next.y} colour={colour} />
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
        <p className="text-center text-base font-bold leading-relaxed text-[var(--text)]">Tap a branch on the map — it opens.</p>
        <p className="text-center text-sm leading-relaxed text-[var(--dim)]">Cottage at the top, gazebo branch for quiet time, eight dead ends each with a trophy, and Longevity going on to infinity. The green lines are stepping-stone pathways now, winding gently from the cottage — a path fills with flowers along its whole length, around the stones, as its milestones are reached. Life is a long path, so the tree is taller than one screen — scroll down to walk it all. Tap a branch to open it, then tap Visit to go to that help.</p>
      </div>
      <figure className="mt-4 overflow-hidden rounded-[var(--radius)] border-2 border-[var(--leaf)]">
        <img src={welcomeCottage} alt="Our cottage — a wooden cottage with a grey slate roof, green shutters, a big wrap-around porch, a WELCOME mat and an open please come in sign" className="w-full" />
        <figcaption className="bg-[var(--surface)] px-4 py-3 text-center font-bold leading-relaxed text-[var(--text)]">Your cottage — where every path begins, warm and cozy from the get-go.</figcaption>
      </figure>
      <GardenPorchPot flowerCount={porchFlowerCount} cottageBlooms={porchCottageBlooms} />
      {message && (
        <div role="status" className="felt-soft mt-4 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--amber-soft)] px-4 py-3 text-center">
          <p className="font-bold leading-relaxed text-[var(--text)]">{message}</p>
          <button type="button" onClick={onOpenCozy} className="mt-2 min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">See my Cozy Room →</button>
        </div>
      )}
      <Section title="Tap a place on the map">
        <ul className="space-y-2">
          {GARDEN_MAP_STOPS.map((stop) => {
            const earned = stop.items.filter((item) => trophies.includes(item));
            const tabLabel = stop.tab ? (TABS.find((t) => t.id === stop.tab)?.label ?? stop.label) : null;
            const open = selected === stop.id;
            // A quit day for this path: the one already set on its
            // tab counts first; otherwise the one picked here in
            // the garden. Only the five tabs with a quit date
            // (Alcohol, Smoking, Gambling, Drugs, Codependency)
            // have a quit day to set.
            const isQuitStop = stop.tab === "alcohol" || stop.tab === "smoking" || stop.tab === "gambling" || stop.tab === "drugs" || stop.tab === "codependency";
            const tabProfile = stop.tab != null ? profiles?.find((p) => p.category === stop.tab) : undefined;
            const tabQuitDay = tabProfile?.quitDate ?? null;
            const gardenQuitDay = quitDays[stop.id] ?? null;
            const effectiveQuitDay = tabQuitDay ?? gardenQuitDay;
            const flowerCount = stop.items.filter((item) => checked.includes(item) || trophies.includes(item)).length;
            return (
              <li key={stop.id} id={`garden-map-stop-${stop.id}`}>
                {/* Gazebo pic truly first (Richard, 2026-11-27):
                    his screenshot showed the heading text
                    ("The gazebo — quiet time" / "BRANCH — QUIET
                    TIME") above the picture, so the pic was
                    second, not first. Now, when the Gazebo stop
                    is open, the picture renders BEFORE the stop
                    button / heading, at the very top, big, and
                    the heading, Visit link and features come
                    below it, to scroll down to.
                    Replace (Richard, 2026-11-27: "Yes M. That's
                    the one. Perfect. Please use that one.
                    Replace."): the trail pic (my-life-garden.webp,
                    weedy path, gazebo small in the distance) is
                    replaced here — Gazebo panel only — by the
                    octagonal gazebo pic (my-life-garden-gazebo.webp):
                    octagonal wooden gazebo, pyramid roof, bench
                    with pillows / cushions on the left, rocking
                    chair on the right, candles in the middle.
                    NOT flipped: this pic already faces the right
                    way. The trail pic stays, flipped, for the
                    garden first pic and its zoom. Caption unchanged. */}
                {open && stop.id === "gazebo" && (
                  <>
                    <figure className="mb-3 overflow-hidden rounded-[var(--radius)] border-2 border-[var(--leaf)]">
                      {/* Tap-to-enlarge (Richard, 2026-11-28): "Oh
                          my goodness. Yes Please" — folks will want
                          to enlarge the gazebo and be there. Same
                          pattern as the garden first pic: the
                          picture itself is the tap target, the
                          caption stays below it, unchanged, and
                          the enlarged view opens on a dark
                          backdrop, tap anywhere to close. The
                          caption does not block enlarging — the
                          picture simply was not wired up yet. */}
                      <button type="button" onClick={() => setGazeboZoomed(true)} aria-label="The gazebo — tap to see it bigger" className="block w-full">
                        <img src={myLifeGardenGazebo} alt="The gazebo in My Life Garden Pathway — the beautiful octagonal wooden gazebo, with a bench with pillows and cushions, a rocking chair, and candles" className="w-full" />
                      </button>
                      <figcaption className="bg-[var(--surface)] px-4 py-3 text-center font-bold leading-relaxed text-[var(--text)]">The gazebo — a quiet place, off to the side of the path.</figcaption>
                      <p className="bg-[var(--surface)] pb-3 text-center text-sm text-[var(--dim)]">Tap the photo to see it bigger.</p>
                    </figure>
                    {gazeboZoomed && (
                      <div role="dialog" aria-label="The gazebo, enlarged" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setGazeboZoomed(false)}>
                        <button type="button" onClick={() => setGazeboZoomed(false)} aria-label="Close the enlarged gazebo photo" className="max-h-full max-w-full">
                          <img src={myLifeGardenGazebo} alt="The gazebo — enlarged" className="max-h-[85vh] w-auto max-w-full rounded-[var(--radius)]" />
                          <span className="mt-2 block text-center font-semibold text-white">Tap anywhere to close</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
                <button type="button" onClick={() => { if (open) { setSelected(null); } else { openStop(stop.id); } }} aria-expanded={open} className="felt-card w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] p-4 text-left">
                  <p className="font-display text-lg font-black text-[var(--text)]">{stop.label}</p>
                  <p className="mt-1 text-sm font-bold uppercase tracking-widest text-[#6aa84f]">{GARDEN_MAP_KIND_LABEL[stop.kind]}</p>
                  <p className="mt-1 leading-relaxed text-[var(--dim)]">{stop.note}</p>
                  {earned.length > 0 && <p className="mt-1 font-bold text-[var(--text)]">Trophy earned — in your Cozy Room ✓ ({earned.length} of {stop.items.length})</p>}
                  {stop.items.length > 0 && <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">{flowerCount} of {stop.items.length} {stop.items.length === 1 ? "patch" : "patches"} in flower 🌸 — the rest are weeds still beside this path.</p>}
                  {effectiveQuitDay && <p className="mt-1 text-sm font-bold leading-relaxed text-[var(--text)]">Quit day {effectiveQuitDay} — this path has stretched out with steps to walk.</p>}
                  <p className="mt-2 text-sm font-bold text-[var(--accent)]">{open ? "Close ↑" : "Tap to open →"}</p>
                </button>
                {open && (
                  <div className="mt-2 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-3">
                    {/* Gazebo pic is now above the stop button /
                        heading (see above), not in this panel —
                        it was second there, below the heading
                        text. The panel now starts with the Visit
                        link, then the features below it. */}
                    {/* Active link to the help tab (Richard,
                        2026-11-26): "if I hit gambling, will it
                        take me to the gambling help portion?" Yes
                        — and it must be the first thing in the
                        panel, not buried below the quit-day block.
                        Tapping the branch opens this panel; tapping
                        Visit takes you straight to that tab's help.
                        The branch tap itself must not jump away,
                        or there would be no way to earn the trophy
                        for this stop. */}
                    {stop.tab && <button type="button" onClick={() => onGoTab(stop.tab!)} className="min-h-14 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left font-bold text-[var(--text)]">Visit {tabLabel} →</button>}
                    {stop.items.length > 0 ? (
                      <>
                        <p className="font-bold leading-relaxed text-[var(--text)]">What is already true for you?</p>
                        <div className="mt-3 space-y-2">
                          {stop.items.map((item) => (
                            <button key={item} type="button" onClick={() => earn(item)} className="min-h-14 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left font-bold text-[var(--text)]">
                              {(checked.includes(item) || trophies.includes(item) ? "🌸 " : "🌿 ") + (trophies.includes(item) ? `✓ ${item} — trophy earned` : item)}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : stop.id === "cozy" ? (
                      <p className="leading-relaxed text-[var(--text)]">First view: no trophies yet, and a few empty picture frames on the walls. Room for 100+ trophies.</p>
                    ) : (
                      <p className="leading-relaxed text-[var(--text)]">Start here, from the front steps of the cottage — you have already been invited in.</p>
                    )}
                    {isQuitStop && (
                      <div className="mt-4">
                        <p className="font-bold leading-relaxed text-[var(--text)]">Your quit day for this path</p>
                        {tabQuitDay ? (
                          <p className="mt-1 leading-relaxed text-[var(--text)]">
                            Your quit day on the {tabLabel} tab is {tabQuitDay}. That is the day this path stretches from — a quit day in the past still counts.
                          </p>
                        ) : (
                          <>
                            <p className="mt-1 leading-relaxed text-[var(--text)]">
                              Pick a quit day here, or set it on the {tabLabel} tab — either one counts. A quit day in the past still counts: if you already stopped, you are already in recovery, staying stopped.
                            </p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <input type="date" value={quitDraft} onChange={(e) => setQuitDraft(e.target.value)} aria-label={`Pick a quit day for ${stop.label}`} className="min-h-14 flex-1 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 text-lg text-[var(--text)]" />
                              <button type="button" onClick={() => saveQuitDay(stop)} className="min-h-14 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-5 font-bold text-[var(--text)]">Save my quit day</button>
                              {gardenQuitDay && (
                                <button type="button" onClick={() => clearQuitDay(stop)} className="min-h-14 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-5 font-bold text-[var(--text)]">Clear</button>
                              )}
                            </div>
                          </>
                        )}
                        <div className="mt-4">
                          <GardenPathSteps quitDay={effectiveQuitDay} />
                        </div>
                        <p className="mt-3 leading-relaxed text-[var(--text)]">
                          No judging here, and no punishment for a slip — a slip is part of recovery. This path just waits for you, one step at a time.
                        </p>
                      </div>
                    )}
                    <div className="mt-3 space-y-2">
                      {stop.id === "cozy" && <button type="button" onClick={onOpenCozy} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">Open my Cozy Room →</button>}
                      {stop.id === "garden" && <button type="button" onClick={onGoGarden} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">Back to the garden list →</button>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        Trophies are kept on this phone only — nothing is sent anywhere, and nothing is scored yet. No calorie counting, no weighing, no judging.
      </p>
      <div className="mt-6 space-y-3">
        <button type="button" onClick={onOpenCozy} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">Inside view — my Cozy Room →</button>
        <button type="button" onClick={onGoGarden} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">Back to the garden list</button>
        <button type="button" onClick={onGoHome} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">{backLabel}</button>
      </div>
    </div>
  );
}

/* ---------- My Life Garden Pathway — books & photos for the Cozy Room ---------- */
// Fourth piece (Richard, 2026-11-26): your favourite books, and
// books you would like to read, as reasonable facsimiles on the
// bookshelf — a book spine with the title, in its own colours,
// never an exact cover copy. And your own photos for the empty
// picture frames — tap a frame, pick a photo from your own photo
// library, and it takes that frame's place. First view still has
// a few empty frames; they fill as you choose. Both stay on this
// phone only, in this browser's localStorage — nothing is sent
// anywhere, no account. Path expansion / quit day and weeds
// turning to flowers are built in the garden and the Map (fifth
// piece, Richard, 2026-11-26). Held for later pieces, NOT built
// here: badges, points for weeds.
const LIFE_GARDEN_BOOKS_KEY = "richards-resource:life-garden:books:v1";
const LIFE_GARDEN_FRAMES_KEY = "richards-resource:life-garden:frames:v1";
const MAX_GARDEN_BOOKS = 20;
const GARDEN_FRAME_COUNT = 4;

type GardenBookKind = "favourite" | "to-read";
type GardenBook = { id: string; title: string; kind: GardenBookKind };

// Warm spine colours, picked from the title so the same book
// always gets the same colour.
const GARDEN_BOOK_COLOURS = ["#7a5a3a", "#4a7a4f", "#3f6fb5", "#9a5a90", "#a84a3f", "#d99a4e", "#3f8a8a", "#6b4a8a"];

function gardenBookColour(book: GardenBook): string {
  let hash = 0;
  for (const ch of `${book.kind}:${book.title}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GARDEN_BOOK_COLOURS[hash % GARDEN_BOOK_COLOURS.length] ?? "#7a5a3a";
}

function loadLifeGardenBooks(): GardenBook[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalGet(LIFE_GARDEN_BOOKS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is GardenBook => typeof x === "object" && x !== null
        && typeof (x as GardenBook).id === "string" && typeof (x as GardenBook).title === "string"
        && ((x as GardenBook).kind === "favourite" || (x as GardenBook).kind === "to-read"))
      .map((x) => ({ id: x.id, title: x.title.trim().slice(0, 80), kind: x.kind }))
      .filter((x) => x.title.length > 0)
      .slice(0, MAX_GARDEN_BOOKS);
  } catch { return []; }
}

function loadLifeGardenFrames(): (string | null)[] {
  try {
    const parsed: unknown = JSON.parse(safeLocalGet(LIFE_GARDEN_FRAMES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return Array(GARDEN_FRAME_COUNT).fill(null);
    return Array.from({ length: GARDEN_FRAME_COUNT }, (_, i) => {
      const v: unknown = parsed[i];
      return typeof v === "string" && v.startsWith("data:image/") ? v : null;
    });
  } catch { return Array(GARDEN_FRAME_COUNT).fill(null); }
}

// Shrink a photo to a small size before keeping it, so a big
// phone photo cannot fill the phone's storage. Redrawing it
// also drops the photo's location and camera details — only the
// picture itself is kept, on this phone only.
function downscaleGardenPhoto(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          const max = 600;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(typeof reader.result === "string" ? reader.result : null); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch { resolve(null); }
      };
      img.src = typeof reader.result === "string" ? reader.result : "";
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- My Life Garden Pathway — the Cozy Room, seen, not listed ---------- */
// Seventh piece (Richard, 2026-11-26): make it more intuitive,
// less reading — trophies and personal photos should actually
// APPEAR in the room itself, on the walls and the bookshelf,
// not just as a text list below the picture. So the room photo
// is now a living picture: earned trophies sit on a wooden shelf
// in the room, chosen photos sit in the frames on the walls,
// and added books stand as spines on the bookshelf at the foot
// of the picture. First view is still sparse: an empty trophy
// shelf, empty frames, an empty bookshelf. As they earn, add
// and choose, those things appear in the room. Tap a frame in
// the picture to pick a photo for it. Local only, nothing sent
// anywhere, no account, no new points.
const GARDEN_ROOM_FRAME_POSITIONS = [
  "left-[4%] top-[5%]",
  "right-[4%] top-[5%]",
  "left-[4%] top-[29%]",
  "right-[4%] top-[29%]",
];

function CozyRoomVisual({ trophies, books, frames, onAddPhoto, onClearFrame, onEnlarge, interactive = true }: {
  trophies: string[];
  books: GardenBook[];
  frames: (string | null)[];
  onAddPhoto: (slot: number, file: File | undefined) => void;
  onClearFrame: (slot: number) => void;
  // Tap-to-enlarge (Richard, 2026-11-26): tapping the Cozy Room
  // picture itself did NOT enlarge it — the picture was a plain
  // div, and only the separate button below it opened the
  // enlarged view. So the picture itself is now the tap target:
  // tapping anywhere on it except a frame (pick a photo) or a
  // frame ✕ (remove a photo) opens the enlarged view. In the
  // enlarged view the room is shown non-interactive
  // (interactive={false}), so tapping it closes it instead of
  // opening the photo library.
  onEnlarge?: () => void;
  interactive?: boolean;
}) {
  const shownTrophies = trophies.slice(0, 12);
  const extraTrophies = trophies.length - shownTrophies.length;
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius)]"
      {...(onEnlarge ? {
        role: "button",
        tabIndex: 0,
        "aria-label": "My Cozy Room — tap to see it bigger",
        style: { cursor: "pointer" },
        onClick: () => onEnlarge(),
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEnlarge(); } },
      } : {})}
    >
      <img src={myLifeGardenCozyRoom} alt="My Cozy Room — a cozy warm fireplace-lit sitting room with one candle on the mantle, beige rugs, books on the shorter shelf, a taller shelf sparse with two or three empty frames, and a few empty picture frames on the walls" className="w-full" />
      {/* Photos in the frames on the walls — tap a frame to pick one. */}
      {frames.map((photo, slot) => (
        <div key={slot} onClick={(e) => e.stopPropagation()} className={`absolute w-[24%] ${GARDEN_ROOM_FRAME_POSITIONS[slot] ?? "left-[4%] top-[5%]"}`}>
          {interactive ? (
            <label htmlFor={`garden-room-frame-${slot}`} className={`relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-sm border-4 ${photo ? "border-[#8a6b4f]" : "border-dashed border-[#8a6b4f] bg-black/20"}`}>
              {photo ? (
                <img src={photo} alt={`Your photo in frame ${slot + 1}, on the wall of your Cozy Room`} className="h-full w-full object-contain bg-black/10" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/90" aria-hidden="true">＋</span>
              )}
              <span className="sr-only">Empty frame {slot + 1} — tap to add a photo from your photo library</span>
              <input
                id={`garden-room-frame-${slot}`}
                type="file"
                accept="image/*"
                aria-label={`Choose a photo from your photo library for frame ${slot + 1} on the wall`}
                className="hidden"
                onChange={(e) => { onAddPhoto(slot, e.target.files?.[0]); e.target.value = ""; }}
              />
            </label>
          ) : (
            <div className={`relative block aspect-[4/3] overflow-hidden rounded-sm border-4 ${photo ? "border-[#8a6b4f]" : "border-dashed border-[#8a6b4f] bg-black/20"}`}>
              {photo ? (
                <img src={photo} alt={`Your photo in frame ${slot + 1}, on the wall of your Cozy Room`} className="h-full w-full object-contain bg-black/10" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/90" aria-hidden="true">＋</span>
              )}
            </div>
          )}
          {interactive && photo && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onClearFrame(slot); }} aria-label={`Remove the photo from frame ${slot + 1} on the wall`} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-sm font-bold text-[var(--text)]">✕</button>
          )}
        </div>
      ))}
      {/* Trophies on a wooden shelf in the room. */}
      <div className="absolute inset-x-[6%] bottom-[16%]" role="img" aria-label={trophies.length === 0 ? "An empty wooden shelf in your Cozy Room, waiting for your first trophy" : `${trophies.length} ${trophies.length === 1 ? "trophy" : "trophies"} on the shelf in your Cozy Room`}>
        <div className="flex min-h-9 items-end justify-center gap-1">
          {shownTrophies.map((trophy) => (
            <span key={trophy} title={trophy} className="text-2xl leading-none drop-shadow" aria-hidden="true">🏆</span>
          ))}
          {extraTrophies > 0 && <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-[var(--text)]">+{extraTrophies} more</span>}
        </div>
        <div className="mt-1 h-2 rounded bg-[#8a6b4f]" aria-hidden="true" />
      </div>
      {/* Books as spines on the bookshelf at the foot of the room. */}
      <div className="absolute inset-x-[6%] bottom-[2%]" role="img" aria-label={books.length === 0 ? "An empty bookshelf in your Cozy Room, waiting for your first book" : `${books.length} ${books.length === 1 ? "book" : "books"} on the bookshelf in your Cozy Room`}>
        <div className="flex h-10 items-end justify-center gap-[3px] px-2">
          {books.map((book) => (
            <span key={book.id} title={book.title} style={{ backgroundColor: gardenBookColour(book) }} className="h-9 w-2.5 rounded-t-sm border border-black/20" aria-hidden="true" />
          ))}
        </div>
        <div className="h-2 rounded bg-[#6b4a2f]" aria-hidden="true" />
      </div>
    </div>
  );
}

function CozyRoomPage({ onGoHome, onGoMap, gardenName = "", backLabel = "← Back to Home" }: { onGoHome: () => void; onGoMap: () => void; gardenName?: string; backLabel?: string }) {
  const [trophies] = useState<string[]>(() => loadLifeGardenTrophies());
  const [zoomed, setZoomed] = useState(false);
  // Fourth piece (Richard, 2026-11-26): your books and your photos.
  const [books, setBooks] = useState<GardenBook[]>(() => loadLifeGardenBooks());
  const [frames, setFrames] = useState<(string | null)[]>(() => loadLifeGardenFrames());
  const [bookTitle, setBookTitle] = useState("");
  const [bookKind, setBookKind] = useState<GardenBookKind>("favourite");
  const [bookNote, setBookNote] = useState<string | null>(null);
  const [frameNote, setFrameNote] = useState<string | null>(null);
  const addBook = () => {
    const title = bookTitle.trim().slice(0, 80);
    if (!title) { setBookNote("Type a book title first, then tap Add a book."); return; }
    if (books.some((b) => b.title.toLowerCase() === title.toLowerCase() && b.kind === bookKind)) {
      setBookNote("That book is already on your bookshelf.");
      return;
    }
    if (books.length >= MAX_GARDEN_BOOKS) { setBookNote("Your bookshelf is full for now — 20 books is plenty to start with."); return; }
    const next = [...books, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, kind: bookKind }];
    setBooks(next);
    safeLocalSet(LIFE_GARDEN_BOOKS_KEY, JSON.stringify(next));
    setBookTitle("");
    setBookNote(null);
  };
  const removeBook = (id: string) => {
    const next = books.filter((b) => b.id !== id);
    setBooks(next);
    if (next.length === 0) safeLocalRemove(LIFE_GARDEN_BOOKS_KEY); else safeLocalSet(LIFE_GARDEN_BOOKS_KEY, JSON.stringify(next));
  };
  const addPhoto = async (slot: number, file: File | undefined) => {
    if (!file) return;
    const small = await downscaleGardenPhoto(file);
    if (!small) { setFrameNote("That photo could not be read — please try another one."); return; }
    const next = frames.map((f, i) => (i === slot ? small : f));
    safeLocalSet(LIFE_GARDEN_FRAMES_KEY, JSON.stringify(next));
    // safeLocalSet stays quiet when the store is full, so check
    // the photo really was kept before showing it.
    const kept = safeLocalGet(LIFE_GARDEN_FRAMES_KEY);
    if (!kept || !kept.includes(small.slice(0, 80))) {
      setFrameNote("That photo was too big to keep on this phone — please try a smaller one.");
      return;
    }
    setFrames(next);
    setFrameNote(null);
  };
  const clearFrame = (slot: number) => {
    const next = frames.map((f, i) => (i === slot ? null : f));
    setFrames(next);
    if (next.every((f) => f === null)) safeLocalRemove(LIFE_GARDEN_FRAMES_KEY); else safeLocalSet(LIFE_GARDEN_FRAMES_KEY, JSON.stringify(next));
  };
  return (
    <div>
      <button type="button" onClick={onGoHome} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">
        {backLabel}
      </button>
      <h2 className="mt-4 font-display text-2xl font-semibold leading-snug text-[var(--text)]">Inside view — my Cozy Room</h2>
      {/* The saved name follows the visitor here too (Richard,
          2026-11-26): once the name sticks, "friend" is replaced
          by it everywhere in the garden — "Welcome, 007.5" — and
          "friend" stays only when no name is saved. */}
      <p className="mt-4 text-center font-display text-xl font-bold text-[var(--accent)]">Welcome, {gardenName ? gardenName : "friend"}</p>
      <div className="mt-4 overflow-hidden rounded-[var(--radius)] border-2 border-[var(--leaf)]">
        <CozyRoomVisual trophies={trophies} books={books} frames={frames} onAddPhoto={(slot, file) => { void addPhoto(slot, file); }} onClearFrame={clearFrame} onEnlarge={() => setZoomed(true)} />
      </div>
      <button type="button" onClick={() => setZoomed(true)} className="mt-2 min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">
        Tap the photo to see it bigger.
      </button>
      {zoomed && (
        <div role="dialog" aria-label="My Cozy Room, enlarged" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4" onClick={() => setZoomed(false)}>
          <div className="w-full max-w-2xl">
            {/* Enlarged view is not interactive: tapping the room
                itself must close it ("Tap anywhere to close"),
                not open the photo library. The old inner div
                stopped the tap from reaching the dialog, so
                tapping the enlarged photo did nothing. */}
            {/* Enlarged means bigger now (Richard, 2026-11-26:
                "Cozy Room does not expand to see shelved items" —
                the enlarged room rendered at the same width as the
                normal view, so the shelves, trophies and books
                were no easier to see. The room is now shown about
                twice as wide, in a sideways-scrolling frame, so the
                shelves are big enough to see, and you can drag
                sideways to look around. A plain tap still closes
                it, as before; a drag scrolls instead. */}
            <div className="overflow-x-auto rounded-[var(--radius)]">
              <div className="w-[180%] min-w-[620px]">
                <CozyRoomVisual trophies={trophies} books={books} frames={frames} onAddPhoto={(slot, file) => { void addPhoto(slot, file); }} onClearFrame={clearFrame} interactive={false} />
              </div>
            </div>
            <p className="mt-2 text-center font-semibold text-white">Drag sideways to look around the room, up close.</p>
            <button type="button" onClick={() => setZoomed(false)} className="mt-2 min-h-11 w-full rounded-[var(--radius)] border-2 border-white/60 bg-white/90 px-4 font-bold text-[var(--text)]">Tap anywhere to close</button>
          </div>
        </div>
      )}
      <p className="mt-4 leading-relaxed text-[var(--text)]">
        Your Cozy Room — first view: no trophies yet, and a few empty picture frames on the walls. Books on the shorter shelf, the taller shelf sparse with two or three empty frames, one candle on the mantle, beige rugs, room for 100+ trophies.
      </p>
      <Section title="Trophies in your Cozy Room">
        <p className="leading-relaxed text-[var(--text)]">
          {trophies.length === 0
            ? "No trophies yet — earn your first one from the Map, and it will sit on the shelf in the picture above."
            : `${trophies.length} ${trophies.length === 1 ? "trophy" : "trophies"} — see ${trophies.length === 1 ? "it" : "them"} on the shelf in the picture above.`}
        </p>
      </Section>
      <Section title="Your bookshelf">
        <p className="leading-relaxed text-[var(--text)]">
          Tap Add a book — a book spine joins the shelf. Nothing is an exact cover copy.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            value={bookTitle}
            maxLength={80}
            placeholder="A book title"
            aria-label="A book title"
            onChange={(e) => setBookTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addBook(); }}
            className="min-h-14 flex-1 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 text-lg text-[var(--text)]"
          />
          <select
            value={bookKind}
            aria-label="Is this a favourite book, or a book you would like to read?"
            onChange={(e) => setBookKind(e.target.value as GardenBookKind)}
            className="min-h-14 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 text-lg font-bold text-[var(--text)]"
          >
            <option value="favourite">A favourite book</option>
            <option value="to-read">A book I would like to read</option>
          </select>
          <button type="button" onClick={addBook} className="min-h-14 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-5 font-bold text-[var(--text)]">
            Add a book
          </button>
        </div>
        {bookNote && <p role="status" className="mt-2 font-bold text-[var(--text)]">{bookNote}</p>}
        {books.length === 0 ? (
          <p className="mt-3 leading-relaxed text-[var(--text)]">Your bookshelf is waiting — add your first book.</p>
        ) : (
          <>
            <p className="mt-3 font-bold text-[var(--text)]">{books.length} {books.length === 1 ? "book" : "books"} on your bookshelf</p>
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[#8a6b4f] px-3 pb-2 pt-3">
              {books.map((book) => (
                <div key={book.id} className="flex flex-col items-center gap-1">
                  <div
                    role="img"
                    aria-label={`${book.kind === "favourite" ? "A favourite book" : "A book to read"}: ${book.title}`}
                    title={book.title}
                    style={{ backgroundColor: gardenBookColour(book) }}
                    className="flex h-[9rem] w-10 items-center justify-center overflow-hidden rounded-sm border border-black/20"
                  >
                    <span className="font-bold text-white" style={{ writingMode: "vertical-rl", fontSize: "13px", lineHeight: "1.1" }}>{book.title}</span>
                  </div>
                  <span className="text-xs font-bold text-white">{book.kind === "favourite" ? "Favourite" : "To read"}</span>
                  <button type="button" onClick={() => removeBook(book.id)} aria-label={`Remove ${book.title} from your bookshelf`} className="min-h-11 rounded-[var(--radius)] border border-white/60 bg-white/90 px-2 text-xs font-bold text-[var(--text)]">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">Your books stay on this phone only — nothing is sent anywhere.</p>
      </Section>
      <Section title="Your picture frames">
        <p className="leading-relaxed text-[var(--text)]">
          Tap a frame, pick a photo from your own photo library — in the picture above, or below.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {frames.map((photo, slot) => (
            <div key={slot} className="flex flex-col gap-2">
              <label htmlFor={`garden-frame-${slot}`} className="flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius)] border-4 border-[#8a6b4f] bg-[var(--surface)]">
                {photo ? (
                  <img src={photo} alt={`Your photo in frame ${slot + 1}`} className="h-full max-h-40 w-full object-contain bg-black/10" />
                ) : (
                  <span className="px-3 py-6 text-center font-bold leading-relaxed text-[var(--dim)]">Empty frame {slot + 1} — tap to add a photo</span>
                )}
                <input
                  id={`garden-frame-${slot}`}
                  type="file"
                  accept="image/*"
                  aria-label={`Choose a photo from your photo library for frame ${slot + 1}`}
                  className="hidden"
                  onChange={(e) => { void addPhoto(slot, e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
              {photo && (
                <button type="button" onClick={() => clearFrame(slot)} aria-label={`Remove the photo from frame ${slot + 1}`} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text)]">
                  Remove photo
                </button>
              )}
            </div>
          ))}
        </div>
        {frameNote && <p role="status" className="mt-2 font-bold text-[var(--text)]">{frameNote}</p>}
        <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">Your photos stay on this phone only — nothing is sent anywhere. A photo is shrunk before it is kept.</p>
      </Section>
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        What is in your Cozy Room stays on this phone, in this browser only — nothing is sent anywhere.
      </p>
      <div className="mt-6 space-y-3">
        {/* "See the Map" must open the real Map (Richard,
            2026-11-26) — it used to go back to the garden list,
            so it did not show a map at all. onGoMap lands
            straight on GardenMapPage, at the top. */}
        <button type="button" onClick={onGoMap} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">See the Map →</button>
        <button type="button" onClick={onGoHome} className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">{backLabel}</button>
      </div>
    </div>
  );
}

function HomePage({ profiles, logs, pointEvents, dayMarks, onGo, onSurf }: {
  profiles: Profile[];
  logs: LogEntry[];
  pointEvents: PointEvent[];
  dayMarks: DayMark[];
  onGo: (t: TabId) => void;
  onSurf: () => void;
}) {
  const { byTab, total } = usePoints();
  // How points work (Richard, 2026-11-23): closed by default —
  // one button that opens a little pop-up with the explanation,
  // instead of the whole big expanded list on Home.
  const [pointsOpen, setPointsOpen] = useState(false);
  // My Life Garden Pathway (Richard, 2026-11-26): a Home overlay
  // view, not a new top tab — the garden opens from its Home
  // button below and comes straight back to Home.
  const [gardenOpen, setGardenOpen] = useState(false);
  // Which garden view to land on when the garden opens from
  // Home (Richard, 2026-11-26): normally the list — but "See
  // the Map" from the Cozy Room must land straight on the real
  // Map, so the garden needs an initial view, not just "list".
  const [gardenInitialView, setGardenInitialView] = useState<"list" | "map" | "cozy">("list");
  // Inside view (Richard, 2026-11-26): an "Inside view" option
  // button as an addition to the Home screen, opening the Cozy
  // Room first inside view — no trophies yet, empty frames.
  const [cozyOpen, setCozyOpen] = useState(false);
  const today = localDay();
  const summaries = (Object.keys(CAT_LABEL) as Category[]).map((c) => {
    const p = profiles.find((x) => x.category === c);
    const days = daysSince(p?.quitDate);
    return { c, days, saved: days != null && p?.dailyCost != null ? p.dailyCost * days : null };
  });
  if (cozyOpen) {
    // "See the Map" from the Cozy Room opened from Home must
    // land straight on the real Map, at the top — it used to
    // open the garden list instead, so it did not show a map.
    return <CozyRoomPage onGoHome={() => { setCozyOpen(false); if (typeof window !== "undefined") window.scrollTo(0, 0); }} onGoMap={() => { setCozyOpen(false); setGardenInitialView("map"); setGardenOpen(true); if (typeof window !== "undefined") window.scrollTo(0, 0); }} gardenName={loadLifeGardenName()} />;
  }
  if (gardenOpen) {
    return <LifeGardenPage onGoHome={() => { setGardenOpen(false); if (typeof window !== "undefined") window.scrollTo(0, 0); }} onGoTab={onGo} profiles={profiles} initialView={gardenInitialView} />;
  }
  return (
    <div>
      {/* "We are so Happy you are here" (Richard, 2026-11-18, moved
          to the very top of Home 2026-11-23): the welcome line,
          right after the tab buttons at the front of Home, before
          the cottage. The WelcomeCover keeps it too, unchanged. */}
      <p className="mb-3 text-center font-display text-xl font-bold text-[var(--accent)]">We are so Happy you are here</p>
      {/* Home instruction (Richard, 2026-11-27): one short line for a
          first-time visitor, right after the welcome line and above
          the Home buttons — tap a tab, then scroll down a wee bit
          for help. Richard's exact words. */}
      <p className="mb-3 text-center text-base font-semibold leading-relaxed text-[var(--text)]">Just tap a tab, scroll down a wee bit for help</p>
      <WelcomeIntro />
      {/* The true message (Richard, 2026-11-13, rephrased
          2026-11-23): after the cottage — just the one paragraph.
          The small privacy paragraph below it was removed
          2026-11-23 at Richard's word ("the Dept of redundancy
          department strikes again"): it is already said above
          the cottage, in the PrivacyStrip. */}
      <div className="felt-soft mb-5 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-3 text-center" role="note">
        <p className="font-bold leading-relaxed text-[var(--text)]">This is your personal journey, your personal cottage, but you are not alone. This app is your resource guide for help at your fingertips. We even have a button for when you&apos;re feeling happy.</p>
      </div>
      {/* My Life Garden Pathway (Richard, 2026-11-26, moved to the
          TOP of Home): Richard could not find it at the very end
          of Home — he thought it would come right after agreeing
          to Terms, or tapping on the door. So it sits here, right
          after the cottage and the true message, so it is found
          immediately. The Inside view button sits right after it.
          Nothing else above moved; Happy Button, Share and My Muse
          keep their places, below. */}
      <div className="mb-5">
        <button type="button" onClick={() => { setGardenInitialView("list"); setGardenOpen(true); if (typeof window !== "undefined") window.scrollTo(0, 0); }} style={{ backgroundColor: "#e2f2da", borderColor: "#6aa84f" }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-4 p-6 text-left">
          <p className="flex items-center gap-3 font-display text-2xl font-black text-[#2e2117] sm:text-3xl">
            <FlowerIcon color="var(--bloom)" size={40} />
            My Life Garden Pathway
          </p>
          <p className="mt-2 text-lg font-bold leading-snug text-[#2e2117]">Your pathway, your garden — clear the weeds, one step at a time.</p>
          <p className="mt-1 leading-relaxed text-[#6f5a44]">See your pathway from the front steps of the cottage, and tell us what is already true for you. Gentle, no counting, no judging.</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-widest text-[#6aa84f]">Tap to open My Life Garden Pathway →</p>
        </button>
      </div>
      <div className="mb-5">
        <button type="button" onClick={() => { setCozyOpen(true); if (typeof window !== "undefined") window.scrollTo(0, 0); }} style={{ backgroundColor: "#fbe3ee", borderColor: "#c95a8a" }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-4 p-6 text-left">
          <p className="flex items-center gap-3 font-display text-2xl font-black text-[#2e2117] sm:text-3xl">
            Inside view — my Cozy Room
          </p>
          <p className="mt-2 text-lg font-bold leading-snug text-[#2e2117]">Your cozy room inside the cottage — warm and cozy from the start.</p>
          <p className="mt-1 leading-relaxed text-[#6f5a44]">First view: no trophies yet, a few empty picture frames on the walls, waiting for the trophies you earn and the photos you choose.</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-widest text-[#c95a8a]">Tap to open Inside view →</p>
        </button>
      </div>
      {/* The Happy Button (Richard, 2026-11-18, moved one step down
          2026-11-23): after the Share button, so the order reads
          welcome line → cottage → true message → why we made it
          → Share → Happy Button → the rest of Home. */}
      <ShareButton />
      {/* The Happy Button (Richard, 2026-11-18): Home only, one
          step down from where it was — right after the Share
          button, before My Muse. Button, thermometer, cork board,
          sounds, points and wording all unchanged; only the
          place moved (Richard, 2026-11-23). */}
      <HappyButton />
      {/* My Muse (Richard, 2026-11-21): Home only, right after
          the Happy Button — it adds to the warm greeting, it does
          not move the true message, the Happy Button, or the
          Share button. My RR was deleted from Home 2026-11-23. */}
      <MyMuseCard pointEvents={pointEvents} />
      <WhatsNewBanner />
      <AddToHomeScreenHint />
      {/* Tagline (Richard, 2026-11-12): "Making the world 🌎 a happier
          place" — right above the banner on Home, and in the footer. */}
      <p className="mb-4 text-center font-display text-lg font-bold text-[var(--accent)]">Making the world 🌎 a happier place ❤️</p>
      {/* Home banner (Richard, 2026-11-12): "The best FREE self-help
          app EVER!" — shrunk to about 1/4 its size (Richard,
          2026-11-15, note 16): roughly half the font size and
          padding, so about a quarter of the area. It was screaming;
          now it is a small line, not a shout. */}
      <div className="felt-card rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--amber-soft)] px-3 py-3 text-center">
        <h1 className="font-display text-sm font-black leading-snug tracking-tight text-[var(--text)] sm:text-base">
          <span className="block text-[var(--accent)]">The best FREE self-help app EVER!</span>
          <span className="mt-1 block">YOU CAN DO IT!</span>
          <span className="mt-1 block">A BRIGHTER FUTURE IS WITHIN YOUR GRASP.</span>
          <span className="mt-1 block text-[var(--accent)]">GET STARTED TODAY — download the app for free.</span>
        </h1>
      </div>

      <div className="mt-6">
        <button type="button" onClick={onSurf} className="felt-btn min-h-14 w-full rounded-[var(--radius)] bg-[var(--crisis)] px-4 text-lg font-bold text-white">
          I need help right now
        </button>
        <p className="mt-2 text-center text-sm text-[var(--dim)]">Starts a guided urge-surfing pause with no time limit — it runs until you say you're done. Urges peak and pass; this helps you outlast the peak.</p>
      </div>

      <Section title="Calming breathing">
        <CalmingBreathing />
      </Section>

      <Section title="Check in for today — extra credit">
        <DailyCheckin pointEvents={pointEvents} />
      </Section>

      {/* Longevity, bigger — Richard, 2026-11-12: a bigger button so a
          first-time visitor sees healthy living first, with hope and
          purpose. Noticeably larger than the tab cards below. */}
      <div className="mt-8">
        <button type="button" onClick={() => onGo("longevity")} style={{ backgroundColor: TAB_PASTELS.longevity.inactiveBg, borderColor: TAB_PASTELS.longevity.activeBorder }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-4 p-6 text-left">
          <p className="flex items-center gap-3 font-display text-2xl font-black text-[#2e2117] sm:text-3xl">
            <TabIcon id="longevity" size={40} />
            Longevity
          </p>
          <p className="mt-2 text-lg font-bold leading-snug text-[#2e2117]">Live longer, live better — start today.</p>
          <p className="mt-1 leading-relaxed text-[#6f5a44]">Healthy living, the free basics: sleep, walking, real food, friends, and purpose. Hope, not hype — no miracle claims, nothing for sale.</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-widest text-[#2f8a80]">Tap to open the Longevity tab →</p>
        </button>
      </div>

      <Section title="The tabs">
        <div className="space-y-3">
          {([
            ["alcohol", "Alcohol", "Safety first — withdrawal can be dangerous — then pre-commitment before the first drink."],
            ["smoking", "Smoking", "Frequent, short urges. Ride them out with an open-ended pause, break the cue pairs, use the free quitline."],
            ["gambling", "Gambling", "Boredom, near-misses, chasing losses — plus an honest slot machine that shows you the math."],
            ["drugs", "Drugs", "Different drugs, different quits. Overdose safety, medication treatment, harm reduction."],
            ["codependency", "Codependency", "For the rescuing pattern itself — boundaries, and support for the person around the addiction."],
          ] as [Category, string, string][]).map(([c, name, desc], idx) => (
            <button key={c} type="button" onClick={() => onGo(c)} style={{ backgroundColor: TAB_PASTELS[c].inactiveBg, borderColor: TAB_PASTELS[c].border }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
              <p className="flex items-center gap-2 font-semibold text-[#2e2117]">
                <TabIcon id={c} size={24} />
                {name}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#6f5a44]">{desc}</p>
            </button>
          ))}
          <button type="button" onClick={() => onGo("food")} style={{ backgroundColor: TAB_PASTELS.food.inactiveBg, borderColor: TAB_PASTELS.food.border }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
            <p className="flex items-center gap-2 font-semibold text-[#2e2117]">
              <TabIcon id="food" size={24} />
              Food
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#6f5a44]">When eating, restricting, bingeing, purging, or body worries take over. A gentle SCOFF check-in, help for the hard moment, and people who understand — no weight numbers, no calorie counting, no diet tips.</p>
          </button>
          <button type="button" onClick={() => onGo("screens")} style={{ backgroundColor: TAB_PASTELS.screens.inactiveBg, borderColor: TAB_PASTELS.screens.border }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
            <p className="flex items-center gap-2 font-semibold text-[#2e2117]">
              <TabIcon id="screens" size={24} />
              Screens
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#6f5a44]">For the scroll that won't end. A quick check-in on time, sleep, and mood, a pause that starts at just 30 seconds for the doomscroll urge, and a phone-free plan for bedtime, meals, and the first hour of the day. Its job is to send you back to real life.</p>
          </button>
          <button type="button" onClick={() => onGo("wellbeing")} style={{ backgroundColor: TAB_PASTELS.wellbeing.inactiveBg, borderColor: TAB_PASTELS.wellbeing.border }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
            <p className="flex items-center gap-2 font-semibold text-[#2e2117]">
              <TabIcon id="wellbeing" size={24} />
              Feeling Unwell? Sad? Anxious?
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#6f5a44]">Not an urge — just low, heavy, or worried. Take the same 2-week depression and anxiety check-ins doctors use (PHQ-9 and GAD-7) and get a score to bring to a real conversation.</p>
          </button>
          <button type="button" onClick={() => onGo("longevity")} style={{ backgroundColor: TAB_PASTELS.longevity.inactiveBg, borderColor: TAB_PASTELS.longevity.border }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
            <p className="flex items-center gap-2 font-semibold text-[#2e2117]">
              <TabIcon id="longevity" size={24} />
              Longevity
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#6f5a44]">Live longer, live better — start today. Sleep, walking, real food, friends, and purpose, with a gentle check-in — no miracle claims, nothing for sale.</p>
          </button>
          <button type="button" onClick={() => onGo("peace")} style={{ backgroundColor: TAB_PASTELS.peace.inactiveBg, borderColor: TAB_PASTELS.peace.border }} className="felt-card felt-pressable w-full rounded-[var(--radius)] border-2 p-4 text-left">
            <p className="flex items-center gap-2 font-semibold text-[#2e2117]">
              <TabIcon id="peace" size={24} />
              Peace of Mind
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#6f5a44]">A quiet corner: meditation, prayer, gratitude, and a mindfulness moment — generic, for any faith or none, always optional. Nothing saved, nothing required.</p>
          </button>
        </div>
      </Section>

      {/* Crisis box (Richard, 2026-11-12): if someone comes to a
          self-help app, they are likely already struggling — and no
          one gets points for killing themselves. The same 988 / 911
          box as Feeling Unwell, here on Home, after the tabs and
          before the points box, so help is visible before the score. */}
      <div className="mt-5"><CrisisStrip /></div>

      <Section title="Support this free app">
        <DonationSection />
      </Section>

      <div className="felt-card mt-8 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        <SunriseHero />
        <div className="px-5 py-5">
          <p className="text-lg italic leading-relaxed text-[var(--accent)]">Like sunrise, a new beginning awaits...</p>
          <p className="mt-3 leading-relaxed text-[var(--text)]">
            Drinking, smoking, gambling, drugs — and the codependent patterns around them — share a craving circuit
            but need different tools. When food itself is the struggle, there's a gentle tab for that too. And when
            the screen itself is the thing you can't put down, there's a tab for that as well — one that happily
            puts itself out of a job. And if it's not an urge at all, just feeling low or anxious, there's a tab for
            that too, with the check-ins doctors use. And the Longevity tab is for what comes next: healthy living,
            hope, and purpose. And the Peace of Mind tab is a quiet corner — meditation, prayer, gratitude,
            and mindfulness, for any faith or none. Pick your tab above. Everything here is free, and your plans
            and logs save only in this app.
          </p>
        </div>
      </div>

      <Section title="Your progress, at a glance">
        {summaries.some((s) => s.days != null) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {summaries.filter((s) => s.days != null).map((s) => {
              const mark = dayMarks.find((m) => m.tab === s.c && m.day === today);
              return (
                <button key={s.c} type="button" onClick={() => onGo(s.c)} style={{ backgroundColor: TAB_PASTELS[s.c].inactiveBg, borderColor: TAB_PASTELS[s.c].border }} className="felt-card felt-pressable rounded-[var(--radius)] border-2 p-4 text-left">
                  <p className="flex items-center gap-2 font-semibold text-[#2e2117]"><TabIcon id={s.c} size={20} />{CAT_LABEL[s.c]}</p>
                  <p className="mt-1 text-sm text-[#6f5a44]">{s.days} {s.days === 1 ? "day" : "days"}{s.saved != null ? ` · ${money(s.saved)} kept` : ""}</p>
                  {mark?.action === "daySuccess" && <p className="mt-1 text-sm font-semibold text-[var(--leaf)]">✓ Today counted — +100</p>}
                  {mark?.action === "relapse" && <p className="mt-1 text-sm font-semibold text-[var(--crisis)]">A slip today — tomorrow is a new chance</p>}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[var(--dim)]">No quit dates set yet. Open a tab above, set your date, and your days will show up here.</p>
        )}
      </Section>

      <Section title="Your points">
        <div className="felt-card rounded-[var(--radius)] border-4 border-[var(--sun)] bg-[var(--amber-soft)] p-5">
          <p className="text-center text-5xl font-black tabular-nums text-[var(--text)]">★ {total}</p>
          <p className="mt-1 text-center text-sm font-medium text-[var(--dim)]">
            points earned, across every tab — and there's no maximum. The total just keeps growing, like you.
          </p>
          {(Object.keys(POINT_TAB_LABEL) as PointTab[]).some((t) => (byTab[t] ?? 0) !== 0) && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(Object.keys(POINT_TAB_LABEL) as PointTab[]).filter((t) => (byTab[t] ?? 0) !== 0).map((t) => (
                <span key={t} className="felt-soft rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]">
                  {POINT_TAB_LABEL[t]} · {byTab[t]}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => setPointsOpen((o) => !o)}
              aria-expanded={pointsOpen}
              className="min-h-11 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface-warm)] px-4 font-semibold text-[var(--text)]"
            >
              How points work {pointsOpen ? "— tap to close" : "— tap to open"}
            </button>
            {pointsOpen && (
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--text)]">
              <li><strong>+10</strong> — welcome points, just for downloading the app. You're already on the board.</li>
              <li><strong>+1</strong> — for every tap and touch, anywhere in the app. Showing up counts.</li>
              <li><strong>+5</strong> — for filling in each data field: your plan, your logs, the check-in questions.</li>
              <li><strong>+50</strong> — for picking a quit date. That's a real decision, and it's worth real points.</li>
              <li><strong>+100</strong> — for every day after your quit date that you stay on track. Mark it on your tab each day.</li>
              <li><strong>+100</strong> — once a day, for completing the “Today I…” check-in above. Tick what is true, tap Done — 100 total, not 100 per item.</li>
              <li><strong>+10</strong> — on the Screens tab, for tapping “I turned my screen off.” It's on your word — self-assessment, and self-assessment is better than nothing.</li>
              <li><strong>+10</strong> — on the Peace of Mind tab, for tapping “I took a quiet moment.” Meditation or prayer, on your word — once per visit, counted once a day. The app can't check, and it won't try.</li>
              <li><strong>+10</strong> — on Home, for tapping the Happy Button when you notice you&apos;re happy — up to 8 a day (80 max). After that the button still works and the thermometer still fills, it just pays no more points that day.</li>
              <li><strong>+100</strong> — once, ever, for getting your own Personal Muse Assistant — tap “Yes, chat with Muse” on Home. Muse is your personal self-help assistant, a guide not a doctor, free, no account.</li>
              <li><strong>−100</strong> — if you slip. A relapse is sadly a part of recovery for many people; log it honestly, hear us when we say <em>try again</em>, and notice — with all the points above, you're hopefully not starting at zero. Neither is your progress.</li>
            </ul>
            )}
          </div>
        </div>
        {pointEvents.length > 0 && (
          <ul className="mt-3 space-y-2">
            {pointEvents.slice(0, 5).map((e) => (
              <li key={e.id} className="felt-soft flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                <span className={`font-bold ${e.points < 0 ? "text-[var(--crisis)]" : "text-[var(--accent)]"}`}>{signedPoints(e.points)}</span>
                <span className="min-w-0 flex-1 text-[var(--text)]">{POINT_ACTION_LABEL[e.action]} — {POINT_TAB_LABEL[e.tab]}</span>
                <span className="shrink-0 text-xs text-[var(--dim)]">{new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Your data — save it to your phone">
        <YourDataSection profiles={profiles} logs={logs} pointEvents={pointEvents} dayMarks={dayMarks} />
      </Section>

      <div className="mt-8"><CrisisStrip /></div>

      {/* Why we made it (Richard, 2026-11-23): one small box at
          the END of Home, after everything else, with his picked
          wording, verbatim — spelled out as "Richard's Resource",
          not "RR", at his update. One flag for Richard, kept as
          he wrote it, not silently rewritten: it uses the word
          "AI", which he earlier removed from the app wording in
          favour of "Personal Muse Assistant" (2026-11-21). */}
      <div className="felt-soft mt-8 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--amber-soft)] px-4 py-3 text-center" role="note">
        <p className="font-bold leading-relaxed text-[var(--text)]">Why we made it</p>
        <p className="mt-1 leading-relaxed text-[var(--text)]">To prove AI is here to help, Richard&apos;s Resource and Muse created this free app to help everyone.</p>
      </div>

      {/* Why we made it box above is the end of Home — the garden
          and Inside view buttons used to sit here, at the very
          end; they moved to the top of Home (2026-11-26) so
          Richard could find them right after the cottage. */}
    </div>
  );
}

function ResourcesPage({ profiles, logs, pointEvents, dayMarks, onTerms }: {
  profiles: Profile[];
  logs: LogEntry[];
  pointEvents: PointEvent[];
  dayMarks: DayMark[];
  onTerms: () => void;
}) {
  return (
    <div>
      <p className="leading-relaxed text-[var(--text)]">
        Every service below is free. Helplines are confidential — you don't need insurance, and you don't have to give
        your name. If you're not sure which fits, start with SAMHSA: they route people to everything else.
      </p>
      <div className="mt-4"><FeedbackContact /></div>
      <div className="mt-4"><CrisisStrip /></div>
      <Section title="Your data — save it to your phone">
        <YourDataSection profiles={profiles} logs={logs} pointEvents={pointEvents} dayMarks={dayMarks} />
      </Section>
      <Section title="Calming breathing">
        <p className="mb-3 leading-relaxed text-[var(--text)]">
          If you came here in a hard moment, you don't have to read a list of phone numbers at full speed. Breathe
          first — then, when you're ready, the help below is free and the people who answer it are kind.
        </p>
        <CalmingBreathing />
      </Section>
      <Section title="Support this free app">
        <DonationSection />
      </Section>
      <Section title="Start here">
        <div className="space-y-3">
          <ResourceLink name="SAMHSA National Helpline — 1-800-662-HELP (4357)" detail="The main door: 24/7, 365 days a year, English and Spanish. Treatment referrals and information for alcohol, drugs, gambling, and mental health — for the person struggling or their family. TTY: 1-800-487-4889. You can also text your ZIP code to 435748 (HELP4U) to find help near you, and search FindTreatment.gov for facilities." phone="18006624357" phoneLabel="1-800-662-4357" href="https://www.samhsa.gov/find-help/helplines/national-helpline" />
          <ResourceLink name="988 Suicide & Crisis Lifeline" detail="Call or text 988, or chat at 988lifeline.org. For anyone in emotional distress or crisis — including substance-use crises — 24/7." phone="988" phoneLabel="988" />
        </div>
      </Section>
      <Section title="By tab">
        <div className="space-y-3">
          <ResourceLink name="Gambling — National Problem Gambling Helpline" detail="Call or text 1-800-MY-RESET (1-800-697-3738), 24/7. The long-standing number 1-800-522-4700 also still works. Chat is available through the National Council on Problem Gambling." phone="18006973738" phoneLabel="1-800-MY-RESET" href="https://www.ncpgambling.org/1-800-my-reset-national-problem-gambling-helpline-faq/" />
          <ResourceLink name="Smoking — National Quitline" detail="1-800-QUIT-NOW connects you to your state's quitline for free coaching. Smokefree.gov (National Cancer Institute) has quit plans and the quitSTART app; text QUIT to 47848 for SmokefreeTXT." phone="18007848669" phoneLabel="1-800-QUIT-NOW" href="https://smokefree.gov/tips" />
          <ResourceLink name="Food — ANAD Eating Disorders Helpline" detail="Free, peer-led support and treatment referrals from the National Association of Anorexia Nervosa and Associated Disorders, Mon–Fri 9am–9pm Central. The National Alliance for Eating Disorders helpline, staffed by licensed therapists, is 1-866-662-1235 (Mon–Fri 9am–7pm Eastern). NEDA (nationaleatingdisorders.org) offers screening and a treatment finder online — its phone helpline closed in 2023." phone="18883757767" phoneLabel="1-888-375-7767" href="https://anad.org/eating-disorder-helpline/" />
        </div>
      </Section>
      <Section title="Peer support — free meetings, in person and online">
        <BulletList items={[
          "Alcoholics Anonymous (aa.org) — alcohol; meetings everywhere, no dues.",
          "Narcotics Anonymous (na.org) — drugs; same fellowship model.",
          "Gamblers Anonymous (gamblersanonymous.org) — gambling.",
          "SMART Recovery (smartrecovery.org) — science-based, non-12-step, for any addiction.",
          "Al-Anon (al-anon.org) and Nar-Anon — for family and friends of people with alcohol or drug problems.",
          "Co-Dependents Anonymous, CoDA (coda.org) — for the codependent pattern itself.",
          "Gam-Anon — for family members affected by someone else's gambling.",
          "Never Use Alone, 1-877-696-1996 — a person stays on the line while someone uses alone, and calls for help if they stop responding.",
        ]} />
      </Section>
      <div className="mt-8"><MedicalDisclaimer /></div>
      <p className="mt-4 text-center">
        <button type="button" onClick={onTerms} className="text-sm font-semibold text-[var(--accent)] underline">Terms of Use</button>
      </p>
      <p className="mt-4 text-center text-xs text-[var(--dim)]">© 2026 Richard's Resource. All rights reserved.</p>
    </div>
  );
}

/* ---------- root ---------- */

const TAB_TO_POINT_TAB: Record<TabId, PointTab> = {
  home: "home",
  resources: "home",
  alcohol: "alcohol",
  smoking: "smoking",
  gambling: "gambling",
  drugs: "drugs",
  codependency: "codependency",
  food: "food",
  screens: "screens",
  wellbeing: "wellbeing",
  longevity: "longevity",
  peace: "peace",
};

export function App() {
  // Return to where you left off (Richard, 2026-11-21): the last
  // tab visited is kept in this browser's localStorage only (see
  // search.ts — never sent to the server). On return, the app
  // defaults to that tab, and a "Welcome back" banner under the tab
  // buttons says where you are and offers Home instead — the tab
  // buttons themselves are always there too. First-time visitors
  // have no last place, so they start on Home as before. The
  // welcome cover still comes first on a first visit.
  const [tab, setTab] = useState<TabId>(() => loadLastPlace(LOCAL_STORAGE_ADAPTER) ?? "home");
  const [resumedTab, setResumedTab] = useState<TabId | null>(() => loadLastPlace(LOCAL_STORAGE_ADAPTER));
  // The last tab is still saved on every change (the automatic
  // return depends on it) — only the My RR Home card was
  // deleted, 2026-11-23, not the saving.
  useEffect(() => {
    saveLastPlace(LOCAL_STORAGE_ADAPTER, tab);
  }, [tab]);
  // Full cover page (Richard, 2026-11-16): on first open the cottage
  // is all you see, until you tap the door or skip. After that the
  // flag is set and returning visitors go straight to Home.
  const [welcomeEntered, setWelcomeEntered] = useState(() => safeLocalGet(WELCOME_KEY) === "seen");
  const enterWelcome = () => {
    safeLocalSet(WELCOME_KEY, "seen");
    setWelcomeEntered(true);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  const [showTerms, setShowTerms] = useState(false);
  // Agree gate state (Richard, 2026-11-23): false on first visit
  // on this device/browser, true once Agree has been tapped.
  const [termsAgreed, setTermsAgreed] = useState(() => safeLocalGet(TERMS_AGREED_KEY) === "agreed");
  const agreeToTerms = () => {
    safeLocalSet(TERMS_AGREED_KEY, "agreed");
    setTermsAgreed(true);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  const [surfCategory, setSurfCategory] = useState<Category | null>(null);
  const [pendingRide, setPendingRide] = useState<boolean | null>(null);
  // Site Map (Richard, 2026-11-26): a button at the top, next to
  // Home, that opens the trail map — the real GardenMapPage —
  // straight away, at the top, from any tab or from Home. It is
  // not a tab and not buried in the garden: it is App-level view
  // state, reusing LifeGardenPage landed on its map view, so
  // there is no second map. The tab the visitor came from is
  // remembered, so "back" goes back there; Home is always one
  // tap away on the tab buttons too.
  const [siteMapOpen, setSiteMapOpen] = useState(false);
  const [siteMapReturnTab, setSiteMapReturnTab] = useState<TabId>("home");
  // Every tap on Site Map counts, even when the garden is already
  // open (Richard, 2026-11-26: "No trail map" — he had gone Map →
  // garden list, then tapped Site Map again, and the garden was
  // still on the list). The garden answers the count by going back
  // to its map view; see LifeGardenPage. No remount, so no extra
  // visit is recorded — visits are what bloom the cottage patch.
  const [siteMapRequest, setSiteMapRequest] = useState(0);
  const openSiteMap = () => {
    setSiteMapReturnTab(tab);
    setSiteMapOpen(true);
    setCozyRoomOpen(false);
    setSiteMapRequest((n) => n + 1);
    setShowTerms(false);
    setSurfCategory(null);
    setPendingRide(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  const closeSiteMap = () => {
    setSiteMapOpen(false);
    setTab(siteMapReturnTab);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  // Cozy Room nav point (Richard, 2026-11-27): "add a Cozy Room
  // nav point. That makes more sense" — he had to do a bit of
  // scrolling and buttons to find the Cozy Room, and it is one of
  // our best features. So it is a button at the top, next to Home
  // and Site Map, always visible, opening the real CozyRoomPage
  // straight away, at the top, from any tab or from Home. It is
  // not a tab and not buried in the garden: it is App-level view
  // state, reusing CozyRoomPage, so there is no second room. The
  // tab the visitor came from is remembered, so "back" goes back
  // there; Home is always one tap away on the tab buttons too.
  // "See the Map" from the Cozy Room opens the trail map.
  const [cozyRoomOpen, setCozyRoomOpen] = useState(false);
  const [cozyRoomReturnTab, setCozyRoomReturnTab] = useState<TabId>("home");
  const openCozyRoom = () => {
    setCozyRoomReturnTab(tab);
    setCozyRoomOpen(true);
    setSiteMapOpen(false);
    setShowTerms(false);
    setSurfCategory(null);
    setPendingRide(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  const closeCozyRoom = () => {
    setCozyRoomOpen(false);
    setTab(cozyRoomReturnTab);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  // One tap to a tab, from the search results, My RR, or a Home
  // card: switch tab, close anything open on top of it, and start
  // at the top of the new tab.
  const goToTab = (t: TabId) => {
    setSiteMapOpen(false);
    setCozyRoomOpen(false);
    setTab(t);
    setShowTerms(false);
    setSurfCategory(null);
    setPendingRide(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };
  const [lastAward, setLastAward] = useState<PointsApi["lastAward"]>(null);
  const [pendingTouches, setPendingTouches] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const state = useQuery({ queryKey: ["state"], queryFn: () => api.getState({}) });

  // Save status + a mirror of the latest saved data on this phone.
  // The mirror holds only what the app already saves (plans, logs,
  // points totals / day marks / recent events) — never check-in
  // answers, which are never stored anywhere.
  const stateData = state.data;
  const stateUpdatedAt = state.dataUpdatedAt;
  useEffect(() => {
    if (!stateData || !stateUpdatedAt) return;
    setLastSavedAt(stateUpdatedAt);
    safeLocalSet(MIRROR_KEY, JSON.stringify({
      savedAt: new Date(stateUpdatedAt).toISOString(),
      profiles: stateData.profiles,
      logs: stateData.logs,
      pointsByTab: stateData.pointsByTab,
      pointsTotal: stateData.pointsByTab.reduce((s, r) => s + r.points, 0),
      dayMarks: stateData.dayMarks,
      recentPointEvents: stateData.pointEvents,
    }));
  }, [stateData, stateUpdatedAt]);
  const profiles = state.data?.profiles ?? [];
  const logs = state.data?.logs ?? [];
  const profileFor = (c: Category) => profiles.find((p) => p.category === c);

  const pointsByTab: Partial<Record<PointTab, number>> = {};
  for (const row of state.data?.pointsByTab ?? []) pointsByTab[row.tab] = row.points;
  const pointsTotal = (state.data?.pointsByTab ?? []).reduce((s, r) => s + r.points, 0);
  const pointEvents = state.data?.pointEvents ?? [];
  const dayMarks = state.data?.dayMarks ?? [];

  const awardMutation = useMutation({
    mutationFn: async (input: { tab: PointTab; action: PointAction; day?: string }) => await api.awardPoints(input),
    onSuccess: (res, input) => {
      if (res.points !== 0) setLastAward({ tab: input.tab, action: input.action, points: res.points, at: Date.now() });
      queryClient.invalidateQueries({ queryKey: ["state"] });
    },
  });
  const awardRef = useRef(awardMutation.mutate);
  awardRef.current = awardMutation.mutate;

  const fieldsMutation = useMutation({
    mutationFn: async (input: { tab: PointTab; count: number }) => await api.awardFields(input),
    onSuccess: (res, input) => {
      if (res.points !== 0) setLastAward({ tab: input.tab, action: "field", points: res.points, at: Date.now() });
      queryClient.invalidateQueries({ queryKey: ["state"] });
    },
  });
  const fieldsRef = useRef(fieldsMutation.mutate);
  fieldsRef.current = fieldsMutation.mutate;

  // +10 welcome points for downloading the app — awarded the first time
  // the app loads with no welcome on record, and only after the
  // visitor has agreed to the Terms — no points before agreeing.
  // The server also enforces once-only, so this can never pay twice.
  const welcomeTriedRef = useRef(false);
  const welcomeAwarded = state.data?.welcomeAwarded ?? false;
  useEffect(() => {
    if (state.isSuccess && termsAgreed && !welcomeAwarded && !welcomeTriedRef.current) {
      welcomeTriedRef.current = true;
      awardRef.current({ tab: "home", action: "welcome" });
    }
  }, [state.isSuccess, termsAgreed, welcomeAwarded]);

  // +1 point for every finger touch. Touches are counted optimistically
  // (the total ticks up the moment you tap) and flushed to the server in
  // small batches, grouped by the tab they happened in. If a batch fails,
  // its touches go back in the pile for the next flush.
  const tabRef = useRef<TabId>(tab);
  tabRef.current = tab;
  // No points for taps made before agreeing to the Terms — the
  // gate screen's own taps (including Agree) pay nothing.
  const termsAgreedRef = useRef(termsAgreed);
  termsAgreedRef.current = termsAgreed;
  const touchBatchRef = useRef<Map<PointTab, number>>(new Map());
  const touchesMutation = useMutation({
    mutationFn: async (input: { tab: PointTab; count: number }) => await api.awardTouches(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["state"] }),
    onError: (_err, input) => {
      touchBatchRef.current.set(input.tab, (touchBatchRef.current.get(input.tab) ?? 0) + input.count);
      setPendingTouches((n) => n + input.count);
    },
  });
  const touchesRef = useRef(touchesMutation.mutate);
  touchesRef.current = touchesMutation.mutate;
  const flushTouchesRef = useRef<() => void>(() => {});
  flushTouchesRef.current = () => {
    const entries = [...touchBatchRef.current.entries()];
    if (entries.length === 0) return;
    touchBatchRef.current = new Map();
    setPendingTouches(0);
    for (const [t, count] of entries) touchesRef.current({ tab: t, count });
  };
  useEffect(() => {
    const onPointerDown = () => {
      if (!termsAgreedRef.current) return;
      const pt = TAB_TO_POINT_TAB[tabRef.current];
      touchBatchRef.current.set(pt, (touchBatchRef.current.get(pt) ?? 0) + 1);
      setPendingTouches((n) => n + 1);
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flushTouchesRef.current(); };
    // Autosave on exit: pagehide is the reliable "the app is going
    // away" signal on phones, so flush pending points then too.
    const onPageHide = () => { flushTouchesRef.current(); };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    const interval = setInterval(() => flushTouchesRef.current(), 4000);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
    };
  }, []);

  const displayTotal = pointsTotal + pendingTouches;
  const pointsApi: PointsApi = {
    award: (t, a, day) => awardRef.current({ tab: t, action: a, day }),
    awardFields: (t, count) => fieldsRef.current({ tab: t, count }),
    byTab: pointsByTab,
    total: displayTotal,
    lastAward,
  };

  const quickLog = useMutation({
    mutationFn: async (input: { category: Category; rodeItOut: boolean }) =>
      await api.addLog({ category: input.category, kind: input.category === "codependency" ? "boundary" : "urge", rodeItOut: input.rodeItOut, note: "Logged from the pause timer" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["state"] }),
  });

  const activeSurf: Category | null = surfCategory ?? (tab !== "home" && tab !== "resources" && tab !== "wellbeing" && tab !== "food" && tab !== "screens" && tab !== "longevity" && tab !== "peace" ? tab : null);

  // Agree gate (Richard, 2026-11-23): "They need to agree or can't
  // use the app." Before the welcome cover, before the tabs — on
  // first visit, only the Terms and the Agree button. No tabs, no
  // help content, no way in without agreeing. All hooks above have
  // run, so this early return is safe.
  if (!termsAgreed) {
    return (
      <div className="felt-page min-h-screen bg-[var(--bg)]">
        <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5">
          <TermsPage onAgree={agreeToTerms} />
        </main>
      </div>
    );
  }

  // Full cover page: before first entry, the cottage is all you
  // see — no tab buttons, no Home content, no footer. Tap the door
  // or "skip the welcome" to enter. All hooks above have run, so
  // this early return is safe.
  if (!welcomeEntered) {
    return <WelcomeCover onEnter={enterWelcome} />;
  }

  return (
    <PointsContext.Provider value={pointsApi}>
    <div className="felt-page min-h-screen bg-[var(--bg)]">
      <div aria-hidden style={{ height: "env(safe-area-inset-top, 0px)", background: "var(--bg)" }} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5">
        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {/* Home — first tab, always, rendered on its own so the
              order below is plain to see: Home, Site Map, Cozy
              Room, then the rest of the tabs. */}
          <NavTabButton
            active={tab === "home" && !siteMapOpen && !cozyRoomOpen}
            onClick={() => { setSiteMapOpen(false); setCozyRoomOpen(false); setTab("home"); setShowTerms(false); setSurfCategory(null); setPendingRide(null); }}
            bg={TAB_PASTELS.home.inactiveBg}
            border={TAB_PASTELS.home.border}
            activeBg={TAB_PASTELS.home.activeBg}
            activeBorder={TAB_PASTELS.home.activeBorder}
          >
            <TabIcon id="home" size={16} />
            Home
          </NavTabButton>
          {/* Site Map — a real top button, first after Home, always
              visible, never buried in the garden and never a
              conditional inside the tab loop. It opens the trail
              map itself, at the top, from any tab. */}
          <NavTabButton
            active={siteMapOpen}
            onClick={openSiteMap}
            bg="#e2f2da"
            border="#a8d19a"
            activeBg="#b7e1a8"
            activeBorder="#6aa84f"
            ariaLabel="Site Map — open the trail map"
          >
            <span aria-hidden="true">🗺️</span>
            Site Map
          </NavTabButton>
          {/* Cozy Room — a real top button, next after Site Map,
              always visible (Richard, 2026-11-27). One tap opens
              the inside view of the cottage, at the top, from any
              tab — no scrolling and buttons to find it, because it
              is one of our best features. */}
          <NavTabButton
            active={cozyRoomOpen}
            onClick={openCozyRoom}
            bg="#fbe3ee"
            border="#e8a8c8"
            activeBg="#f6c6de"
            activeBorder="#c95a8a"
            ariaLabel="Cozy Room — see inside my Cozy Room"
          >
            <span aria-hidden="true">🛋️</span>
            Cozy Room
          </NavTabButton>
          {TABS.filter((t) => t.id !== "home").map((t) => {
            const pastel = TAB_PASTELS[t.id];
            const isActive = tab === t.id && !siteMapOpen && !cozyRoomOpen;
            return (
              <NavTabButton
                key={t.id}
                active={isActive}
                onClick={() => { setSiteMapOpen(false); setCozyRoomOpen(false); setTab(t.id); setShowTerms(false); setSurfCategory(null); setPendingRide(null); }}
                bg={pastel.inactiveBg}
                border={pastel.border}
                activeBg={pastel.activeBg}
                activeBorder={pastel.activeBorder}
              >
                <TabIcon id={t.id} size={16} />
                {t.label}
              </NavTabButton>
            );
          })}
        </nav>

        {/* Search (Richard, 2026-11-21): on every tab, right under
            the tab buttons, so it is there wherever you are. */}
        <div className="mt-4">
          <SearchBox onGo={goToTab} onOpenSiteMap={openSiteMap} onOpenCozyRoom={openCozyRoom} />
        </div>

        {/* Welcome back (Richard, 2026-11-21): shown only when the
            app defaulted to the tab you left off on. It names the
            tab, so the default is never a surprise, and offers Home
            instead — one tap, no hunting. */}
        {resumedTab && tab === resumedTab && (
          <div className="felt-soft mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-3" role="status">
            <span className="font-semibold text-[var(--text)]">Welcome back — you&apos;re on the {LAST_PLACE_LABELS[resumedTab]} tab, where you left off.</span>
            <button type="button" onClick={() => { setTab("home"); setResumedTab(null); if (typeof window !== "undefined") window.scrollTo(0, 0); }} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-bold text-[var(--text)]">
              Go to Home instead
            </button>
          </div>
        )}

        <div className="felt-soft mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius)] bg-[var(--amber-soft)] px-4 py-2.5" aria-live="polite">
          <span className="font-display text-lg font-bold text-[var(--text)]">★ {displayTotal} points</span>
          {lastAward && Date.now() - lastAward.at < 6000 && lastAward.points > 0 && (
            <span className="text-sm font-semibold text-[var(--accent)]">+{lastAward.points} just now — {POINT_ACTION_LABEL[lastAward.action].toLowerCase()} in {POINT_TAB_LABEL[lastAward.tab]}.</span>
          )}
          {lastAward && Date.now() - lastAward.at < 6000 && lastAward.points < 0 && (
            <span className="text-sm font-semibold text-[var(--accent)]">{lastAward.points} — a slip in {POINT_TAB_LABEL[lastAward.tab]}. Slips are part of recovery; you're still here, and that counts.</span>
          )}
          <span className="text-sm text-[var(--dim)]">No maximum — every tap +1, each field +5, a quit date +50, each good day +100.</span>
        </div>

        <SaveStatusBar isError={state.isError} lastSavedAt={lastSavedAt} pendingCount={pendingTouches} />
        <PrivacyStrip />

        {surfCategory && (
          <div className="mt-6">
            <UrgeSurf
              onDone={(rode) => setPendingRide(rode)}
            />
            {pendingRide != null && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="felt-btn min-h-11 flex-1 rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white"
                  onClick={() => { quickLog.mutate({ category: surfCategory, rodeItOut: pendingRide }); setSurfCategory(null); setPendingRide(null); }}>
                  Save this to my log
                </button>
                <button type="button" className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] px-4 text-[var(--text)]"
                  onClick={() => { setSurfCategory(null); setPendingRide(null); }}>
                  Close without saving
                </button>
              </div>
            )}
            <button type="button" className="mt-2 min-h-10 text-sm text-[var(--dim)] underline" onClick={() => { setSurfCategory(null); setPendingRide(null); }}>
              Back to the app
            </button>
          </div>
        )}

        {!surfCategory && (
          <div className="mt-6">
            {cozyRoomOpen ? (
              // The Cozy Room, open on its own from the top button
              // or from search: the same CozyRoomPage, at the top
              // — not a second room. "See the Map" opens the trail
              // map; "Back" goes to the tab the visitor came from,
              // named on the button; Home is always one tap away
              // on the tab buttons above.
              <CozyRoomPage
                onGoHome={closeCozyRoom}
                onGoMap={() => { setCozyRoomOpen(false); openSiteMap(); }}
                gardenName={loadLifeGardenName()}
                backLabel={cozyRoomReturnTab === "home" ? "← Back to Home" : `← Back to ${LAST_PLACE_LABELS[cozyRoomReturnTab]}`}
              />
            ) : siteMapOpen ? (
              // The Site Map, open on its own from the top button or
              // from search: the same garden, landed straight on
              // the real Map, at the top — not a second map. Visit
              // links go through goToTab, which closes the Map and
              // lands on that help tab. "Back" goes to the tab the
              // visitor came from, named on the button; Home is
              // always one tap away on the tab buttons above.
              <LifeGardenPage
                onGoHome={closeSiteMap}
                onGoTab={goToTab}
                profiles={profiles}
                initialView="map"
                mapRequest={siteMapRequest}
                backLabel={siteMapReturnTab === "home" ? "← Back to Home" : `← Back to ${LAST_PLACE_LABELS[siteMapReturnTab]}`}
              />
            ) : showTerms ? (
              <TermsPage onBack={() => { setShowTerms(false); if (typeof window !== "undefined") window.scrollTo(0, 0); }} />
            ) : (
              <>
            {state.isPending && <p className="text-[var(--dim)]">Loading your plans and logs…</p>}
            {state.isError && <p className="text-[var(--crisis)]">Couldn't load your saved data. <button type="button" className="underline" onClick={() => state.refetch()}>Try again</button></p>}
            {state.isSuccess && tab === "home" && (
              <HomePage profiles={profiles} logs={logs} pointEvents={pointEvents} dayMarks={dayMarks} onGo={goToTab} onSurf={() => setSurfCategory(activeSurf ?? "gambling")} />
            )}
            {state.isSuccess && tab === "resources" && <ResourcesPage profiles={profiles} logs={logs} pointEvents={pointEvents} dayMarks={dayMarks} onTerms={() => setShowTerms(true)} />}
            {tab === "wellbeing" && <WellbeingPage />}
            {tab === "food" && <FoodPage />}
            {tab === "screens" && <ScreensPage />}
            {tab === "longevity" && <LongevityPage />}
            {tab === "peace" && <PeacePage onGoHome={() => setTab("home")} />}
            {state.isSuccess && tab !== "home" && tab !== "resources" && tab !== "wellbeing" && tab !== "food" && tab !== "screens" && tab !== "longevity" && tab !== "peace" && (
              <CategoryPage category={tab} profile={profileFor(tab)} logs={logs} dayMarks={dayMarks} onSurf={(c) => setSurfCategory(c)} />
            )}
              </>
            )}
          </div>
        )}

        <MeadowFooter onTerms={() => setShowTerms(true)} />
      </main>
    </div>
    </PointsContext.Provider>
  );
}
