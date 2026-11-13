import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { sounds, type CalmToneKind } from "./sound";
import { speakText, speakNumber, stopSpeaking } from "./speech";

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
// count again. The app can't check whether you meditated or prayed, and
// it doesn't try. Values
// live on the server; the client only reports what happened. The older
// action names remain in the label map so past events still read well.
type PointTab = "home" | "alcohol" | "smoking" | "gambling" | "drugs" | "codependency" | "food" | "screens" | "wellbeing" | "longevity" | "peace";
type PointAction = "welcome" | "touch" | "field" | "quitDate" | "daySuccess" | "relapse" | "pause" | "plan" | "log" | "screening" | "slotLesson" | "phoneFree" | "checkin" | "screenOff" | "dailyCheckin" | "quietMoment";
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
  const [visible, setVisible] = useState(() => safeLocalGet(WHATS_NEW_KEY) !== WHATS_NEW_VERSION);
  if (!visible) return null;
  const dismiss = () => {
    safeLocalSet(WHATS_NEW_KEY, WHATS_NEW_VERSION);
    setVisible(false);
  };
  return (
    <div className="felt-card mb-5 rounded-[var(--radius)] border-2 border-[var(--sun)] bg-[var(--amber-soft)] p-5" role="region" aria-label="What's new in this version">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg font-bold text-[var(--text)]">✨ What's new</p>
        <button type="button" onClick={dismiss} aria-label="Close what's new" className="min-h-11 min-w-11 shrink-0 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-3 text-lg font-bold text-[var(--text)]">
          ✕
        </button>
      </div>
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
// from the footer on every tab and on Help & Resources, and a short
// first-visit notice (TermsNotice, below) points to it with a "Got
// it" button. It is NEVER a locked gate: the notice sits above the
// tabs and can be dismissed, and the crisis box, the breathing, and
// every tab are always open, whether or not the visitor has read it.
// By using the app you agree to the Terms — that is the browsewrap
// trade-off Richard accepted, because blocking help would be worse.
const TERMS_KEY = "richards-resource:terms-seen";

function TermsPage({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <button type="button" onClick={onBack} className="min-h-11 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-semibold text-[var(--text)]">
        ← Back to the app
      </button>
      <h1 className="font-display mt-5 text-2xl font-bold leading-snug text-[var(--text)]">Terms of Use — Richard&apos;s Resource</h1>
      <p className="mt-3 text-lg font-bold leading-relaxed text-[var(--text)]">We are here to help.</p>
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
            Donations, when available, are optional personal gifts to support Richard&apos;s Resource. They are NOT tax
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
      <button type="button" onClick={onBack} className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--accent)] px-4 font-semibold text-white">
        Back to the app
      </button>
    </div>
  );
}

// First-visit notice: a short strip, above the tabs, with a link to
// the full Terms and a "Got it" button. It shows once, until dismissed,
// and it never blocks anything — the tabs, the crisis box, and the
// breathing are all open underneath it, whether or not it is dismissed.
function TermsNotice({ onReadTerms }: { onReadTerms: () => void }) {
  const [visible, setVisible] = useState(() => safeLocalGet(TERMS_KEY) !== "seen");
  if (!visible) return null;
  const dismiss = () => {
    safeLocalSet(TERMS_KEY, "seen");
    setVisible(false);
  };
  const readTerms = () => {
    dismiss();
    onReadTerms();
  };
  return (
    <div className="felt-soft mt-3 rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3" role="region" aria-label="Terms of use notice">
      <p className="text-sm leading-relaxed text-[var(--text)]">
        This is support, not medical advice — please read the <button type="button" onClick={readTerms} className="font-semibold text-[var(--accent)] underline">Terms of Use</button>.
        Help is never locked behind it: the tabs, the breathing, and the crisis numbers below are open right now.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss terms notice" className="felt-btn mt-2 min-h-11 rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-semibold text-white">
        Got it
      </button>
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
// pause ~1 second, out ~3–6 seconds. We use the slow, calming end of
// those ranges — in 4, hold 1, out 6 — an 11-second cycle, with the long
// out-breath doing the relaxing. The .breathe-circle animation in
// theme.css runs the same 4 / 1 / 6 shape so the words and the circle
// stay together.
const BREATH_IN_MS = 4000;
const BREATH_HOLD_MS = 1000;
const BREATH_OUT_MS = 6000;
const BREATH_CYCLE_MS = BREATH_IN_MS + BREATH_HOLD_MS + BREATH_OUT_MS;
type BreathPhase = "breathe in" | "hold" | "breathe out";
function nextBreathPhase(p: BreathPhase): BreathPhase {
  return p === "breathe in" ? "hold" : p === "hold" ? "breathe out" : "breathe in";
}
function breathPhaseMs(p: BreathPhase): number {
  return p === "breathe in" ? BREATH_IN_MS : p === "hold" ? BREATH_HOLD_MS : BREATH_OUT_MS;
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

  // Phase words follow the same slow cycle as the circle: in 4s, hold
  // 1s, out 6s, repeat. A timeout per phase (not a fixed interval) so
  // each phase gets its own length.
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
        <div className={`breathe-circle sun-glow flex h-32 w-32 items-center justify-center rounded-full bg-[#ffd971] ${running ? "" : "[animation-play-state:paused]"}`}>
          <span className="px-3 text-sm font-semibold text-[#7c2d12]">{running ? phase : "breathe with the circle"}</span>
        </div>
      </div>
      <p className="mb-4 mt-1 text-sm text-[var(--dim)]">Slow and easy: in… 2, 3, 4 — hold — out… 2, 3, 4, 5, 6.</p>
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
              {stopLabel}
            </button>
          )}
          {running && (
            <button type="button" onClick={endOpenPause} className="mt-4 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)]">
              {stopLabel}
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
          {stopLabel}
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
// NOT tax deductible. There is no merchant account or payment method
// connected yet — his old credit-union merchant account was closed and
// restoring it is still in progress — so this section must be honest:
// it lets a visitor pick an amount they'd like to give, but it does NOT
// take a payment, does NOT ask for or collect any card details, and has
// no payment link. The button says "Donations coming soon" and, when
// tapped, says plainly that no payment method is available yet. When a
// real payment method is set up, that will be said here.
function DonationSection() {
  const [selected, setSelected] = useState<number | null>(10);
  const [custom, setCustom] = useState("");
  const [notice, setNotice] = useState(false);
  const customId = useIdSafe("donation-custom");
  const customValue = Number.parseFloat(custom);
  const chosen = custom.trim() !== "" && Number.isFinite(customValue) && customValue > 0 ? customValue : selected;
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
      <p className="mt-4 font-semibold text-[var(--text)]">Choose an amount</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested donation amounts">
        {[5, 10, 25].map((amount) => {
          const isChosen = custom.trim() === "" && selected === amount;
          return (
            <button
              key={amount}
              type="button"
              aria-pressed={isChosen}
              aria-label={`Choose a donation of $${amount}`}
              onClick={() => { setSelected(amount); setCustom(""); setNotice(false); }}
              className={`felt-btn min-h-12 min-w-20 rounded-[var(--radius)] px-4 text-lg font-bold ${isChosen ? "bg-[var(--accent)] text-white" : "border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"}`}
            >
              ${amount}
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <label htmlFor={customId} className="font-semibold text-[var(--text)]">Or enter your own amount (US dollars)</label>
        <div className="mt-1 flex items-center gap-2">
          <span aria-hidden="true" className="font-bold text-[var(--text)]">$</span>
          <input
            id={customId}
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setNotice(false); }}
            placeholder="Any amount"
            className="min-h-12 w-full rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)]"
          />
        </div>
      </div>
      {chosen != null && (
        <p className="mt-3 text-sm font-medium text-[var(--text)]" aria-live="polite">
          You've chosen {chosen.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })} — thank you for wanting to help.
        </p>
      )}
      <button
        type="button"
        onClick={() => setNotice(true)}
        className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--leaf)] px-4 text-base font-bold text-white"
      >
        Donations coming soon
      </button>
      {notice && (
        <div className="felt-soft mt-3 rounded-[var(--radius)] bg-[var(--surface)] px-4 py-3" aria-live="polite">
          <p className="font-semibold text-[var(--text)]">Donations aren't set up yet — thank you for offering.</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
            There's no payment method connected to the app yet, so we can't take a donation today — and we won't ask
            for any card details here. When donations become available, we'll say so right here in this section.
            Until then, the best support is to use the app, get well, and pass it on to someone who needs it.
          </p>
        </div>
      )}
      {!notice && (
        <p className="mt-2 text-center text-sm text-[var(--dim)]">
          No payment method is connected yet, so no donation can be taken today and no card details are asked for.
          When donations are available, we'll say so here.
        </p>
      )}
    </div>
  );
}

// Tiny stable-id helper for the donation custom-amount field (the
// section can appear on Home or on Help & Resources, never both at once).
let donationIdCounter = 0;
function useIdSafe(prefix: string): string {
  const ref = useRef<string>("");
  if (ref.current === "") {
    donationIdCounter += 1;
    ref.current = `${prefix}-${donationIdCounter}`;
  }
  return ref.current;
}

// the tab itself. This is that one shared exercise, on the same slow
// rhythm as everywhere else in the app: in 4 seconds, hold 1, out 6.
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
        <div className={`breathe-circle sun-glow flex h-32 w-32 items-center justify-center rounded-full bg-[#ffd971] ${running ? "" : "[animation-play-state:paused]"}`}>
          <span className="px-3 text-sm font-semibold text-[#7c2d12]">{running ? phase : "breathe with the circle"}</span>
        </div>
      </div>
      <p className="mb-4 mt-1 text-sm text-[var(--dim)]">Slow and easy: in… 2, 3, 4 — hold — out… 2, 3, 4, 5, 6.</p>
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
          Stop here — I've settled enough
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
  const [breath, setBreath] = useState<BreathPhase>("breathe in");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
  const start = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("breathing");
    setBreath("breathe in");
    // One full slow cycle on the shared rhythm — in 4, hold 1, out 6 —
    // with the words changing on the same timing as the circle.
    timersRef.current.push(setTimeout(() => setBreath("hold"), BREATH_IN_MS));
    timersRef.current.push(setTimeout(() => setBreath("breathe out"), BREATH_IN_MS + BREATH_HOLD_MS));
    timersRef.current.push(setTimeout(() => setPhase("done"), BREATH_CYCLE_MS));
  };
  return (
    <HookShell pastelBg="#dceef7" pastelBorder="#5b9bbf" title="Take the breath the cigarette promises you" intro="Most of what a cigarette sells is this: a pause, and one deep breath. That part was always free. Try it — breathe with the circle, slowly in, a short hold, then a long slow out, once through.">
      <div className="flex flex-col items-center">
        <div className={`breathe-circle sun-glow flex h-28 w-28 items-center justify-center rounded-full bg-[#ffd971] ${phase === "breathing" ? "" : "[animation-play-state:paused]"}`} aria-hidden="true">
          <span className="px-3 text-center text-sm font-semibold text-[#7c2d12]">{phase === "breathing" ? breath : phase === "done" ? "that's real air" : "one clean breath"}</span>
        </div>
        {phase === "idle" && (
          <button type="button" onClick={start} className="felt-btn mt-4 min-h-12 w-full rounded-[var(--radius)] bg-[var(--sky-deep)] px-4 text-base font-semibold text-white">
            Breathe with me — one slow breath, about 11 seconds
          </button>
        )}
        {phase === "breathing" && <p className="mt-4 text-sm font-medium text-[#2e2117]" aria-live="polite">In as it grows… hold… out, slow and long, as it shrinks. Nothing to buy, nothing to light.</p>}
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
// try 30" — progress you can feel, step by step. Spoken counting is
// sparse on purpose — 1, 2, 3, then the last number (10 or 30) — and
// off unless the visitor turns it on. No 60-second timer: the 60 was
// a mix-up with the breathing, and 30 is the rung Richard chose.
function ScreensHook() {
  const [left, setLeft] = useState<number | null>(null);
  const [doneLooking, setDoneLooking] = useState(false);
  const [doneDuration, setDoneDuration] = useState<number | null>(null);
  const [speakOn, setSpeakOn] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speakOnRef = useRef(speakOn);
  speakOnRef.current = speakOn;
  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    speakTimeoutsRef.current.forEach(clearTimeout);
    speakTimeoutsRef.current = [];
    stopSpeaking();
  };
  useEffect(() => () => clearTimers(), []);
  const start = (seconds: 10 | 30) => {
    clearTimers();
    setDoneLooking(false);
    setDoneDuration(null);
    setLeft(seconds);
    // Spoken counting, only if the visitor turned it on: 1, 2, 3,
    // then the last number when the timer finishes. Nothing speaks
    // before this tap, and nothing speaks if the toggle is off.
    if (speakOnRef.current) {
      speakNumber(1);
      speakTimeoutsRef.current.push(setTimeout(() => speakNumber(2), 1000));
      speakTimeoutsRef.current.push(setTimeout(() => speakNumber(3), 2000));
    }
    intervalRef.current = setInterval(() => {
      setLeft((s) => {
        if (s == null || s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (speakOnRef.current) speakNumber(seconds);
          setDoneDuration(seconds);
          setDoneLooking(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };
  return (
    <HookShell pastelBg="#e4ecf3" pastelBorder="#6486a5" title="Quick test: can you look up?" intro="This is the one tab that wants less of your attention. Prove it works: tap the button, look up from the screen at the real room, the real sky — I'll count. Ten seconds first, then 30 when you're ready.">
      <div className="mb-3 flex items-center gap-2">
        <input id="screens-speak-count" type="checkbox" checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} className="h-5 w-5 accent-[#6486a5]" />
        <label htmlFor="screens-speak-count" className="text-sm font-semibold text-[#2e2117]">Hear the counting — spoken, off unless you choose it</label>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-[#2e2117]">Spoken counting says 1, 2, 3, then the last number — 10 or 30 — and nothing in between.</p>
      {left == null && !doneLooking && (
        <button type="button" onClick={() => start(10)} className="felt-btn min-h-12 w-full rounded-[var(--radius)] bg-[#6486a5] px-4 text-base font-semibold text-white">
          Look up now — I&apos;ll count to 10
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
              You did 10, try 30 — I&apos;ll count to 30
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

function PeacePage() {
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
// (client/public/manifest.webmanifest, short_name "RR", sunrise icon)
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
          Tap your browser menu, then <strong>Add to Home Screen</strong>. RR opens full-screen, like an app, and updates automatically.
        </p>
      </div>
    </div>
  );
}

function HomePage({ profiles, logs, pointEvents, dayMarks, onGo, onSurf }: {
  profiles: Profile[];
  logs: LogEntry[];
  pointEvents: PointEvent[];
  dayMarks: DayMark[];
  onGo: (t: Category | "resources" | "wellbeing" | "food" | "screens" | "longevity" | "peace") => void;
  onSurf: () => void;
}) {
  const { byTab, total } = usePoints();
  const today = localDay();
  const summaries = (Object.keys(CAT_LABEL) as Category[]).map((c) => {
    const p = profiles.find((x) => x.category === c);
    const days = daysSince(p?.quitDate);
    return { c, days, saved: days != null && p?.dailyCost != null ? p.dailyCost * days : null };
  });
  return (
    <div>
      {/* The true message (Richard, 2026-11-13): the first thing a
          visitor sees when the app opens, with the privacy line —
          this is your personal journey, and you are not alone. */}
      <div className="felt-soft mb-5 rounded-[var(--radius)] border-2 border-[var(--leaf)] bg-[var(--leaf-soft)] px-4 py-3 text-center" role="note">
        <p className="font-bold leading-relaxed text-[var(--text)]">We don&apos;t share your data. This is your personal journey... BUT YOU ARE NOT ALONE. Help is at your fingertips.</p>
      </div>
      <WhatsNewBanner />
      <AddToHomeScreenHint />
      {/* Tagline (Richard, 2026-11-12): "Making the world 🌎 a happier
          place" — right above the banner on Home, and in the footer. */}
      <p className="mb-4 text-center font-display text-lg font-bold text-[var(--accent)]">Making the world 🌎 a happier place ❤️</p>
      <div className="felt-card rounded-[var(--radius)] border-4 border-[var(--sun)] bg-[var(--amber-soft)] px-5 py-6 text-center">
        <h1 className="font-display text-[28px] font-black leading-[1.15] tracking-tight text-[var(--text)] sm:text-4xl sm:leading-[1.15]">
          <span className="block text-[var(--accent)]">The best FREE self-help app EVER!</span>
          <span className="mt-3 block">YOU CAN DO IT!</span>
          <span className="mt-3 block">A BRIGHTER FUTURE IS WITHIN YOUR GRASP.</span>
          <span className="mt-3 block text-[var(--accent)]">GET STARTED TODAY — download the app for free.</span>
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
            <p className="font-semibold text-[var(--text)]">How points work</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--text)]">
              <li><strong>+10</strong> — welcome points, just for downloading the app. You're already on the board.</li>
              <li><strong>+1</strong> — for every tap and touch, anywhere in the app. Showing up counts.</li>
              <li><strong>+5</strong> — for filling in each data field: your plan, your logs, the check-in questions.</li>
              <li><strong>+50</strong> — for picking a quit date. That's a real decision, and it's worth real points.</li>
              <li><strong>+100</strong> — for every day after your quit date that you stay on track. Mark it on your tab each day.</li>
              <li><strong>+100</strong> — once a day, for completing the “Today I…” check-in above. Tick what is true, tap Done — 100 total, not 100 per item.</li>
              <li><strong>+10</strong> — on the Screens tab, for tapping “I turned my screen off.” It's on your word — self-assessment, and self-assessment is better than nothing.</li>
              <li><strong>+10</strong> — on the Peace of Mind tab, for tapping “I took a quiet moment.” Meditation or prayer, on your word — once per visit, counted once a day. The app can't check, and it won't try.</li>
              <li><strong>−100</strong> — if you slip. A relapse is sadly a part of recovery for many people; log it honestly, hear us when we say <em>try again</em>, and notice — with all the points above, you're hopefully not starting at zero. Neither is your progress.</li>
            </ul>
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
  const [tab, setTab] = useState<TabId>("home");
  const [showTerms, setShowTerms] = useState(false);
  const [surfCategory, setSurfCategory] = useState<Category | null>(null);
  const [pendingRide, setPendingRide] = useState<boolean | null>(null);
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
  // the app loads with no welcome on record. The server also enforces
  // once-only, so this can never pay twice.
  const welcomeTriedRef = useRef(false);
  const welcomeAwarded = state.data?.welcomeAwarded ?? false;
  useEffect(() => {
    if (state.isSuccess && !welcomeAwarded && !welcomeTriedRef.current) {
      welcomeTriedRef.current = true;
      awardRef.current({ tab: "home", action: "welcome" });
    }
  }, [state.isSuccess, welcomeAwarded]);

  // +1 point for every finger touch. Touches are counted optimistically
  // (the total ticks up the moment you tap) and flushed to the server in
  // small batches, grouped by the tab they happened in. If a batch fails,
  // its touches go back in the pile for the next flush.
  const tabRef = useRef<TabId>(tab);
  tabRef.current = tab;
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

  return (
    <PointsContext.Provider value={pointsApi}>
    <div className="felt-page min-h-screen bg-[var(--bg)]">
      <div aria-hidden style={{ height: "env(safe-area-inset-top, 0px)", background: "var(--bg)" }} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5">
        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const pastel = TAB_PASTELS[t.id];
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => { setTab(t.id); setShowTerms(false); setSurfCategory(null); setPendingRide(null); }}
                style={{
                  backgroundColor: isActive ? pastel.activeBg : pastel.inactiveBg,
                  borderColor: isActive ? pastel.activeBorder : pastel.border,
                }}
                className={`felt-tab ${isActive ? "felt-tab-active" : ""} inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-bold text-[#2e2117]`}
              >
                <TabIcon id={t.id} size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>

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
        <TermsNotice onReadTerms={() => setShowTerms(true)} />

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
            {showTerms ? (
              <TermsPage onBack={() => { setShowTerms(false); if (typeof window !== "undefined") window.scrollTo(0, 0); }} />
            ) : (
              <>
            {state.isPending && <p className="text-[var(--dim)]">Loading your plans and logs…</p>}
            {state.isError && <p className="text-[var(--crisis)]">Couldn't load your saved data. <button type="button" className="underline" onClick={() => state.refetch()}>Try again</button></p>}
            {state.isSuccess && tab === "home" && (
              <HomePage profiles={profiles} logs={logs} pointEvents={pointEvents} dayMarks={dayMarks} onGo={(t) => setTab(t)} onSurf={() => setSurfCategory(activeSurf ?? "gambling")} />
            )}
            {state.isSuccess && tab === "resources" && <ResourcesPage profiles={profiles} logs={logs} pointEvents={pointEvents} dayMarks={dayMarks} onTerms={() => setShowTerms(true)} />}
            {tab === "wellbeing" && <WellbeingPage />}
            {tab === "food" && <FoodPage />}
            {tab === "screens" && <ScreensPage />}
            {tab === "longevity" && <LongevityPage />}
            {tab === "peace" && <PeacePage />}
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
