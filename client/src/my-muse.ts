// My Muse (Richard, 2026-11-21, simplified 2026-11-23): your
// personal self-help assistant, built into a personal self-help
// app. Muse only — no other Personal Muse Assistants, no choice
// of Personal Muse Assistants. Richard is bombarded by Gemini
// and everybody else; this app is his and Muse's, and the card
// says so plainly: "My Muse — Your personal self-help assistant".
//
// What this module can and cannot do — honestly, because the
// user must not be misled:
//   * It CANNOT put words into Muse's mouth. muse.ai is a
//     separate app/website with no public prompt deep-link
//     and no public API the app could call, so there is no
//     way for Richard's Resource to send a starter message
//     to Muse for the visitor, and no way to force Muse to
//     show a button. Anyone claiming otherwise would be
//     selling something.
//   * What it CAN do: open muse.ai in a new tab. That is all.
//     There used to be a starter message to copy and paste,
//     and home-screen instructions — both were removed
//     2026-11-23, because guiding the visitor with Muse
//     instructions is too much, and it must not look like a
//     trick to get an AI. It is Self Help, not Muse-help.
//     The card asks one simple question — "Would you like
//     to chat with Muse?" — with "Yes, chat with Muse" and
//     "Maybe later", and nothing more.
//   * Return to My RR is mission critical (Richard,
//     2026-11-21): the card shows it as a plain tappable
//     link, so the visitor can get back to
//     https://richardsresource.com even if Muse never offers
//     it. Both directions work: RR → Muse via My Muse,
//     Muse → RR via Return to My RR, easy squeezy toggling
//     between the two.
//   * No account, no personal information: opening Muse
//     sends nothing about the visitor — no name, no points,
//     no logs. The visitor's Muse is anonymous at first,
//     like the fresh Muse that popped up during the GitHub
//     work and did not even know who Richard was. That is
//     perfect for the app: anonymous, free, no account.
//   * No imprinting, like a duckling (Richard, 2026-11-21):
//     Muse is a guide and helper, not a parent and not a
//     replacement for the people in the visitor's life.
//     There is absolutely nothing wrong with a Personal Muse
//     Assistant assisting in their journey, even if it
//     becomes the best avenue for that individual — and the
//     app still keeps 988 and the help numbers right there.
//
// This file uses erasable TypeScript only (type aliases, no
// enums or parameter properties) so the Node test suite can
// import it directly, like search.ts.

export const MY_MUSE_URL = "https://muse.ai/";
export const RETURN_TO_MY_RR_URL = "https://richardsresource.com";
