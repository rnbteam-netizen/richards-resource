// Search + My RR (Richard, 2026-11-21): the app is about 24,000
// words across its tabs, and there was no way to find anything in
// it — no search button — and no way back to where you left off.
// This module is the whole of both features, and it is deliberately
// client-side only: the search runs on the phone, over a small index
// of the app's own headings and help, and the last place is kept in
// this browser's localStorage only, like the welcome flag and the
// Happy Button cork board. Nothing typed into search is sent to the
// server, nothing is sent about where you left off, and there is no
// account — the privacy line stays true: "We don't share your data.
// This is your personal journey."
//
// The index is written by hand, one entry per thing worth finding —
// a tab, a tool, or a helpline — with the words people actually type
// ("quit date", "breathing", "988") in the keywords. It is not a
// full-text index of all 24,000 words: that would be a big bundle for
// a phone, and the headings are what people search for. If a section
// is renamed, its entry here must be renamed with it.
//
// This file uses erasable TypeScript only (type aliases, no enums or
// parameter properties) so the Node test suite can import it directly.

export type SearchTabId =
  | "home"
  | "alcohol"
  | "smoking"
  | "gambling"
  | "drugs"
  | "codependency"
  | "food"
  | "screens"
  | "wellbeing"
  | "longevity"
  | "peace"
  | "resources";

export type SearchResult = {
  id: string;
  tab: SearchTabId;
  title: string;
  snippet: string;
  // The Site Map is not a tab — it is the trail map view, opened
  // from the top of the app. A result with this flag opens the
  // Site Map instead of jumping to a tab; `tab` stays "home" only
  // so the entry still names a real tab for the index checks.
  openSiteMap?: boolean;
  // The Cozy Room is not a tab either — it is the inside view of
  // the cottage, opened from the top nav, next to Site Map. A
  // result with this flag opens the Cozy Room instead of jumping
  // to a tab; `tab` stays "home" only, as for the Site Map.
  openCozyRoom?: boolean;
  // The Gazebo is not a tab either — it is a branch on the Map,
  // opened with its stop already open, pic first. A result with
  // this flag opens the Map on the gazebo instead of jumping to
  // a tab; `tab` stays "home" only, as for the Site Map.
  openGazebo?: boolean;
};

type SearchEntry = SearchResult & { keywords: string };

export const SEARCH_INDEX: SearchEntry[] = [
  { id: "home", tab: "home", title: "Home", snippet: "Your front door — points, the Happy Button, and every tab.", keywords: "start front door home page" },
  { id: "happy-button", tab: "home", title: "Happy Button", snippet: "Tap when you notice you're happy — 8 happy moments fill a thermometer and pin to your cork board.", keywords: "happy happiness thermometer cork board moment feeling happy" },
  { id: "my-rr", tab: "home", title: "Return to where you left off", snippet: "The app remembers the tab you left off on, on this phone only, and brings you back — look for the Welcome back banner.", keywords: "my rr continue return last place where left off personal" },
  { id: "my-muse", tab: "home", title: "My Muse", snippet: "Your personal self-help assistant — talk to Muse, free, no account, and come back with Return to My RR.", keywords: "my muse assistant talk ai personal muse assistant help guide" },
  { id: "share", tab: "home", title: "Share Richard's Resource", snippet: "Share the cottage with someone who could use it — free, no account, no fuss.", keywords: "share send friend cottage tell someone" },
  { id: "donate", tab: "home", title: "Donate — support Richard's Resource", snippet: "An optional personal gift on Stripe's secure page — NOT tax deductible — that helps keep the app free.", keywords: "donate donation donations support give gift" },
  { id: "points", tab: "home", title: "Points — how points work", snippet: "+10 welcome, +1 per tap, +5 per field, +50 for a quit date, +100 for a good day. No maximum.", keywords: "points score total quit date good day" },
  { id: "daily-checkin", tab: "home", title: "Check in for today", snippet: "Today I… exercised, ate well, slept well, feel better — +100 once a day, not 100 per item.", keywords: "check-in checkin today daily exercised ate slept feel better" },
  { id: "breathing", tab: "home", title: "Calming breathing", snippet: "Slow and easy — in 3, pause, out 4, pause. On every tab.", keywords: "breathe breathing calm relax breath" },
  { id: "save-phone", tab: "home", title: "Save your data to your phone", snippet: "Save your plans, logs and points to your phone as a file you keep.", keywords: "save backup download data file" },
  { id: "site-map", tab: "home", title: "Site Map", snippet: "The trail map — My Life Garden Pathway: one pathway from the cottage, the gazebo, the dead ends, and Longevity to infinity. Tap a branch, then Visit to go to that help.", keywords: "map site map trail map garden map pathway", openSiteMap: true },
  { id: "gazebo", tab: "home", title: "The Gazebo — quiet time", snippet: "A quiet place for quiet time, off to the side of the path — the beautiful octagonal gazebo, with pillows, a rocking chair, and candles. Pinch with two fingers to zoom in. Give myself a break — Chill in Gazebo for a bit.", keywords: "gazebo quiet time chill break mindful peaceful", openGazebo: true },
  { id: "cozy-room", tab: "home", title: "My Cozy Room", snippet: "Inside the cottage — your trophy room, with your books and your own photos in the frames. One tap from the top nav.", keywords: "cozy room cottage inside trophy trophies books photos frames", openCozyRoom: true },
  { id: "alcohol", tab: "alcohol", title: "Alcohol", snippet: "Safety first — withdrawal can be dangerous — then pre-commitment before the first drink.", keywords: "alcohol drink drinking quit withdrawal beer wine" },
  { id: "urge", tab: "alcohol", title: "Ride out this urge", snippet: "A guided pause with no time limit — urges peak and pass; this helps you outlast the peak.", keywords: "urge craving pause surf ride out" },
  { id: "smoking", tab: "smoking", title: "Smoking", snippet: "Frequent, short urges. Ride them out, break the cue pairs, use the free quitline.", keywords: "smoking cigarette nicotine smoke quit tobacco vape" },
  { id: "quit-now", tab: "smoking", title: "1-800-QUIT-NOW", snippet: "Free quitline coaching for smoking — call 1-800-QUIT-NOW.", keywords: "quitline quit now phone call coaching 18007848669" },
  { id: "gambling", tab: "gambling", title: "Gambling", snippet: "Boredom, near-misses, chasing losses — plus an honest slot machine that shows you the math.", keywords: "gambling bet casino slot machine money chase losses" },
  { id: "slot", tab: "gambling", title: "Honest Slot Machine", snippet: "The slot machine that tells you the truth — it pays back about 84¢ per $1.", keywords: "slot machine odds math win lose honest" },
  { id: "my-reset", tab: "gambling", title: "1-800-MY-RESET", snippet: "National Problem Gambling Helpline — call or text 1-800-MY-RESET, 24/7.", keywords: "gambling helpline reset 18006973738" },
  { id: "drugs", tab: "drugs", title: "Drugs", snippet: "Different drugs, different quits. Overdose safety, medication treatment, harm reduction.", keywords: "drugs opioid heroin meth cocaine naloxone narcan overdose pills" },
  { id: "codependency", tab: "codependency", title: "Codependency", snippet: "For the rescuing pattern itself — boundaries, and support for the person around the addiction.", keywords: "codependency boundary boundaries rescuer relationship family" },
  { id: "food", tab: "food", title: "Food", snippet: "When eating, restricting, bingeing, purging, or body worries take over — no weight numbers, no calorie counting, no diet tips.", keywords: "food eating anorexia bulimia binge weight restrict purge body" },
  { id: "scoff", tab: "food", title: "SCOFF check-in", snippet: "A gentle 5-question check-in about eating worries — on screen only, never saved.", keywords: "scoff screening eating disorder check-in" },
  { id: "screens", tab: "screens", title: "Screens", snippet: "For the scroll that won't end — a pause that starts at just 30 seconds.", keywords: "screens phone scroll doomscroll social media screen time" },
  { id: "screen-off", tab: "screens", title: "I turned my screen off", snippet: "+10 points, on your word, for turning your screen off.", keywords: "screen off phone free turned off" },
  { id: "wellbeing", tab: "wellbeing", title: "Feeling Unwell?", snippet: "Not an urge — just low, heavy, or worried. The check-ins doctors use.", keywords: "feeling unwell sad anxious depressed depression anxiety mood low worried" },
  { id: "phq9", tab: "wellbeing", title: "PHQ-9 depression check-in", snippet: "The 2-week depression check-in doctors use — on screen only, never saved.", keywords: "phq-9 depression sad low check-in" },
  { id: "gad7", tab: "wellbeing", title: "GAD-7 anxiety check-in", snippet: "The 2-week anxiety check-in doctors use — on screen only, never saved.", keywords: "gad-7 anxiety worried nervous check-in" },
  { id: "988", tab: "wellbeing", title: "988 Suicide & Crisis Lifeline", snippet: "Call or text 988 — 24/7, for anyone in emotional distress or crisis.", keywords: "988 crisis suicide help now lifeline" },
  { id: "longevity", tab: "longevity", title: "Longevity", snippet: "Live longer, live better — sleep, walking, real food, friends, and purpose.", keywords: "longevity live longer healthy sleep walk food friends purpose vitamin d" },
  { id: "vitamin-d", tab: "longevity", title: "Vitamin D", snippet: "Ask your own doctor about checking your vitamin D (25(OH)D) — no level or dose recommended here.", keywords: "vitamin d 25ohd doctor check" },
  { id: "peace", tab: "peace", title: "Peace of Mind", snippet: "A quiet corner: meditation, prayer, gratitude, and mindfulness — any faith or none.", keywords: "peace mind meditation prayer mindfulness quiet calm spiritual" },
  { id: "quiet-moment", tab: "peace", title: "I took a quiet moment", snippet: "+10 points, on your word, for a quiet moment — meditation or prayer.", keywords: "quiet moment prayer meditation" },
  { id: "resources", tab: "resources", title: "Help & Resources", snippet: "Every service below is free. Helplines are confidential — no insurance, no name needed.", keywords: "help resources helpline phone numbers" },
  { id: "samhsa", tab: "resources", title: "SAMHSA National Helpline", snippet: "1-800-662-4357 — the main door, 24/7, treatment referrals for alcohol, drugs, gambling, mental health.", keywords: "samhsa helpline 18006624357 treatment referral" },
  { id: "peer-support", tab: "resources", title: "Peer support meetings", snippet: "AA, NA, GA, SMART Recovery, Al-Anon, CoDA — free meetings, in person and online.", keywords: "aa na ga meetings smart recovery alanon coda peer support" },
  { id: "terms", tab: "resources", title: "Terms of Use", snippet: "The fine print — we are here to help, never a locked gate in front of help.", keywords: "terms legal fine print" },
];

const MAX_RESULTS = 8;

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

/** Search the app's own index, on the phone only. Every query word
 * must match somewhere in the entry (title, keywords, or snippet);
 * title matches score most, keywords next, snippet least. Returns at
 * most 8 results, best first. An empty query returns nothing. */
export function searchApp(query: string): SearchResult[] {
  const words = [...new Set(wordsOf(query))];
  if (words.length === 0) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of SEARCH_INDEX) {
    const title = entry.title.toLowerCase();
    const keywords = entry.keywords.toLowerCase();
    const snippet = entry.snippet.toLowerCase();
    let score = 0;
    let allMatch = true;
    for (const word of words) {
      let wordScore = 0;
      if (title.includes(word)) wordScore += 3;
      if (keywords.includes(word)) wordScore += 2;
      if (snippet.includes(word)) wordScore += 1;
      if (wordScore === 0) {
        allMatch = false;
        break;
      }
      score += wordScore;
    }
    if (allMatch) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RESULTS).map(({ entry }) => ({
    id: entry.id,
    tab: entry.tab,
    title: entry.title,
    snippet: entry.snippet,
    ...(entry.openSiteMap ? { openSiteMap: true as const } : {}),
    ...(entry.openCozyRoom ? { openCozyRoom: true as const } : {}),
    ...(entry.openGazebo ? { openGazebo: true as const } : {}),
  }));
}

/* ---------- My RR: return to where you left off ---------- */

// The last tab visited, kept in this browser's localStorage only —
// the same pattern as the welcome flag and the Happy Button cork
// board. It is never sent to the server: it names a tab, not a
// person, and it never leaves the phone. "home" is a valid stored
// value (you were on Home), but it is not a place to return to —
// Home is where the app starts anyway — so loading "home" gives
// back null, meaning no resume.
export const LAST_PLACE_KEY = "richards-resource:last-place:v1";

export const LAST_PLACE_LABELS: Record<SearchTabId, string> = {
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
  resources: "Help & Resources",
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const RESUMABLE_TABS: SearchTabId[] = [
  "alcohol",
  "smoking",
  "gambling",
  "drugs",
  "codependency",
  "food",
  "screens",
  "wellbeing",
  "longevity",
  "peace",
  "resources",
];

export function loadLastPlace(storage: StorageLike): SearchTabId | null {
  try {
    const raw = storage.getItem(LAST_PLACE_KEY);
    if (!raw) return null;
    const tab = raw.trim() as SearchTabId;
    return (RESUMABLE_TABS as string[]).includes(tab) ? tab : null;
  } catch {
    return null;
  }
}

export function saveLastPlace(storage: StorageLike, tab: string): void {
  try {
    storage.setItem(LAST_PLACE_KEY, tab);
  } catch {
    // Storage full or blocked — the app still works without it.
  }
}
