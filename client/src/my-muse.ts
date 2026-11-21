// My Muse (Richard, 2026-11-21): your personal self-help
// assistant, built into a personal self-help app. Muse only —
// no other Personal Muse Assistants, no choice of Personal Muse Assistants. Richard is bombarded by
// Gemini and everybody else; this app is his and Muse's, and
// the button says so plainly: "My Muse — Your personal
// self-help assistant".
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
//   * What it CAN do: open muse.ai in a new tab (the big
//     button), and show the visitor a short, humble starter
//     message to copy and paste as their first message to
//     Muse. The starter is the "first Muse screen" Richard
//     asked for: it tells Muse, in the visitor's own words,
//     to be a guide not a doctor, to ask one simple thing at
//     a time, not to brag about what it can do, to offer one
//     clear step first — "Add My Muse to my home screen" —
//     and to offer "Return to My RR" afterwards. Whether
//     Muse actually adds itself to the home screen is the
//     phone/browser's step, not the app's — the starter asks
//     Muse to walk the visitor through it, one step at a
//     time, and the card says so plainly.
//   * Return to My RR is mission critical (Richard,
//     2026-11-21): the starter carries the link, AND the
//     card shows it as a plain tappable link, so the visitor
//     can get back to https://richardsresource.com
//     even if Muse never offers it. Both directions work:
//     RR → Muse via My Muse, Muse → RR via Return to My RR,
//     easy squeezy toggling between the two.
//   * No account, no personal information: opening Muse
//     sends nothing about the visitor — no name, no points,
//     no logs. The visitor's Muse is anonymous at first,
//     like the fresh Muse that popped up during the GitHub
//     work and did not even know who Richard was. That is
//     perfect for the app: anonymous, free, no account.
//   * No imprinting, like a duckling (Richard, 2026-11-21):
//     the starter says Muse is a guide and helper, not a
//     parent and not a replacement for the people in the
//     visitor's life. There is absolutely nothing wrong
//     with a Personal Muse Assistant assisting in their journey, even if it becomes
//     the best avenue for that individual — and the app
//     still keeps 988 and the help numbers right there.
//
// This file uses erasable TypeScript only (type aliases, no
// enums or parameter properties) so the Node test suite can
// import it directly, like search.ts.

export const MY_MUSE_URL = "https://muse.ai/";
export const RETURN_TO_MY_RR_URL = "https://richardsresource.com";
export const MY_MUSE_CLOSING_LINE =
  "If you would like help with anything else, please don't hesitate to ask. I'm your Muse.";

// The starter the visitor copies and pastes as their first
// message to Muse. Short, humble, one question at a time —
// no bragging list of what Muse can do, no marketing.
// Written as the visitor speaking to Muse.
export const MY_MUSE_STARTER = [
  "Hello, I'm using Richard's Resource, a free self-help app. You are my Muse — my personal self-help assistant.",
  "Please be my guide, not a doctor, and please don't give medical advice. If I'm in crisis, please tell me to call or text 988, or call 911, and to use the help numbers in the app.",
  "Please ask me one simple thing at a time, and please don't list everything you can do.",
  "First, please offer me one clear step: \"Add My Muse to my home screen\" — tell me, in one step, how to add Muse to my home screen on this phone, so I can tap between Richard's Resource and you.",
  "After we've talked, please offer me this link to go back: Return to My RR — https://richardsresource.com",
  "Please don't try to be my parent or replace the people in my life — you're my guide and helper.",
  "Please close with this: If you would like help with anything else, please don't hesitate to ask. I'm your Muse.",
].join("\n\n");

// Copy the starter to the clipboard. Falls back to a
// selectable textarea on phones/browsers where the
// clipboard API is unavailable or blocked.
export async function copyMyMuseStarter(): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(MY_MUSE_STARTER);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback below.
  }
  try {
    const el = document.createElement("textarea");
    el.value = MY_MUSE_STARTER;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
