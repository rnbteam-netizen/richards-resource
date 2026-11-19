// Share button (Richard, 2026-11-19, Mission Possible): Home only.
// One tap shares the app with someone who could use it — the same
// warm cottage that goes out in the Mission Possible email.
//
// The image is the MOST RECENT cottage header, the one built for the
// emailer: lock, then "Free secure site • https://richardsresource.com",
// cottage full view, 4 equally rounded corners. Not every cottage
// image contains the link — only this one does — so share ONLY this
// file. It is the JPG (872 KB), not the PNG (4.2 MB): the PNG is too
// big for email and too big to bundle in the app. The shared link is
// exactly https://richardsresource.com — no shortener, no tracking
// redirect, no tracking parameters of any kind.
//
// Behaviour: tap Share and the phone's native share sheet opens
// (navigator.share), sharing the cottage image + the link + the short
// text. If the phone has no share sheet, the fallback opens the
// visitor's own email app with a mailto: already filled in — email
// apps already contain Forward, so the visitor can send it on, or
// forward it, from there. Cancelling the share sheet does nothing:
// it must never bounce the visitor into an email they did not ask for.
//
// Sharing sends nothing about the visitor — no name, no points, no
// logs, nothing saved — and it earns no points. It never gates help:
// the button sits on Home, after the Happy Button, and never blocks
// the true message, the Happy Button, or the crisis box.
import shareCottage from "./assets/mission-possible-cottage-header.jpg";

export const SHARE_URL = "https://richardsresource.com";
export const SHARE_TITLE = "Richard's Resource";
export const SHARE_TEXT =
  "Richard's Resource — a free self-help app. We are so Happy you are here. https://richardsresource.com";
export const SHARE_EMAIL_SUBJECT = "Richard's Resource — a free self-help app";
export const SHARE_EMAIL_BODY =
  "Richard's Resource — a free self-help app. We are so Happy you are here. https://richardsresource.com\n\nFree, no account, no fuss.";

export function buildShareMailto(): string {
  return `mailto:?subject=${encodeURIComponent(SHARE_EMAIL_SUBJECT)}&body=${encodeURIComponent(SHARE_EMAIL_BODY)}`;
}

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

export async function shareApp(): Promise<"shared" | "cancelled" | "emailed"> {
  const nav = window.navigator as ShareNavigator;
  if (typeof nav.share === "function") {
    try {
      // Attach the cottage image when the phone's share sheet can
      // take a file; if it cannot, share text + link alone. A fetch
      // failure here must never stop the share itself.
      let files: File[] | undefined;
      try {
        const res = await fetch(shareCottage);
        const blob = await res.blob();
        const file = new File([blob], "richards-resource-cottage.jpg", {
          type: blob.type || "image/jpeg",
        });
        if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
          files = [file];
        }
      } catch {
        files = undefined;
      }
      await nav.share({
        title: SHARE_TITLE,
        text: SHARE_TEXT,
        url: SHARE_URL,
        ...(files ? { files } : {}),
      });
      return "shared";
    } catch (err) {
      // The visitor closed the share sheet: that is a no, not a
      // failure — do not bounce them into an email they did not ask for.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      window.location.href = buildShareMailto();
      return "emailed";
    }
  }
  window.location.href = buildShareMailto();
  return "emailed";
}
