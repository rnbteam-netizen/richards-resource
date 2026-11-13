// Spoken words for Richard's Resource — Richard, 2026-11-13.
//
// Everything here uses the phone's own text-to-speech
// (window.speechSynthesis). There are no audio files, no new
// dependencies, no recording, no microphone, and nothing is sent
// anywhere: the words are spoken on the device, by the device's own
// voices, only ever after the visitor taps something. Nothing speaks
// on load, nothing autoplays, and every spoken feature is OFF by
// default — a tap-to-hear button, or an opt-in toggle.
//
// The female voice: Richard asked for a soft female voice. A web
// page cannot invent a voice, and it cannot guarantee one — the list
// of voices belongs to the phone, and it differs by phone. The only
// signal a browser exposes is the voice's name (and language), so
// we pick, in order: a voice whose name says it is female, or a
// well-known female voice on Android / iPhone ("Google US English",
// "Samantha", "Zira", "Aria", "Jenny"), or an English voice, or the
// phone's default voice. If no female voice is available, we use the
// best voice the phone offers and say so plainly in the app copy —
// we never claim a voice is female when it is not.

export function pickFemaleVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const femaleName = /female|samantha|zira|aria|jenny|susan|karen|moira|tessa|google us english|microsoft aria|microsoft jenny|microsoft zira/i;
  const female = voices.find((v) => femaleName.test(v.name));
  if (female) return female;
  const english = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (english) return english;
  return voices[0] ?? null;
}

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

// Speak one piece of text, out loud, on this phone. Cancels anything
// already speaking first, so a second tap never talks over the first.
// Does nothing at all on a browser with no text-to-speech — the app
// works exactly the same, silently.
export function speakText(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickFemaleVoice(getVoices());
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-US";
    // Soft and unhurried: a little slower than default, a touch
    // higher than default — the closest a phone voice gets to gentle.
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    synth.speak(utterance);
  } catch {
    // Speech is a nicety, never a requirement — stay silent on error.
  }
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Nothing to stop.
  }
}

// Speak a single number, out loud. Used by the Screens look-away
// timers: the counting is sparse on purpose — 1, 2, 3, then the last
// number — so it is a companion to the count, not a chatterbox.
export function speakNumber(n: number): void {
  speakText(String(n));
}
