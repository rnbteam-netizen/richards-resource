// Optional sounds for Richard's Resource — Richard, 2026-11-12.
//
// Everything here is made in the browser with the Web Audio API. There
// are no audio files, no new dependencies, and nothing to download:
// a few small tones, generated on the spot, only ever after the visitor
// taps something. Nothing plays on load, nothing autoplays, and the
// sounds are OFF by default — each one has its own toggle, off until
// the visitor turns it on.
//
// Respecting silence: the tones only start from a tap (a user gesture),
// which is what creates and wakes the audio. They play at the phone's
// own volume, so a phone on silent, or with the volume down, stays
// quiet — the app cannot and does not try to get around the silent
// switch. There is no way to detect the silent switch from a web page,
// so the toggles say plainly that sound follows the phone's volume.
//
// Two kinds of sound:
// 1. Slot machine sounds (Gambling tab): a short click on a spin, a
//    two-note chime on a win, a low tone when the money runs out.
// 2. A calm tone for breathing / Peace of Mind: two gentle sine tones,
//    one per ear, a few hertz apart (a binaural-style beat). Labelled
//    plainly "calm tone" (~10 Hz apart) and "sleepy tone" (~6 Hz
//    apart). No medical claims: it does not promise to change
//    brainwaves, calm anyone down, or help anyone sleep — it is just
//    a soft sound to breathe along with, and it stops when the
//    breathing exercise stops.
//
// Privacy: no recording, no microphone, no data leaves the phone for
// any of this. Sound on/off is not saved to the server and not tied
// to identity; the toggles simply start off each visit.

export type CalmToneKind = "calm" | "sleepy";
export type SlotSoundKind = "click" | "chime" | "low";

// The calm tone, 2026-11-13: Richard could only hear it with the
// phone volume at max and the phone against his ear — the old gain
// of 0.05 was a whisper. The tone now plays at 0.22, about four
// times louder, still soft, and the breathing exercise has its own
// volume slider (0 to 0.4) for the tone, off by default, so the
// visitor sets it. Sound still follows the phone's volume and silent
// switch — this is the tone's own volume, inside the app.
export const CALM_TONE_GAIN = 0.22;
export const CALM_TONE_GAIN_MAX = 0.4;

// Binaural-style tones: one gentle sine tone per ear. The base is a
// low, soft 200 Hz; the "beat" is just the difference between the two
// ears — 10 Hz for the calm tone, 6 Hz for the sleepy tone. Those
// numbers are the difference between the two tones, nothing more.
export const CALM_TONE_BASE_HZ = 200;
export const CALM_TONE_BEAT_HZ = 10;
export const SLEEPY_TONE_BEAT_HZ = 6;

export function binauralFrequencies(kind: CalmToneKind): { leftHz: number; rightHz: number; beatHz: number } {
  const beatHz = kind === "calm" ? CALM_TONE_BEAT_HZ : SLEEPY_TONE_BEAT_HZ;
  return { leftHz: CALM_TONE_BASE_HZ, rightHz: CALM_TONE_BASE_HZ + beatHz, beatHz };
}

// Slot machine tones: small, short, and quiet. Click: one short blip
// when the reels spin. Chime: two soft notes when a spin wins.
// Low: one low, falling note when the money runs out.
export const SLOT_TONE_SPECS: Record<SlotSoundKind, { frequencyHz: number; durationMs: number; type: OscillatorType }> = {
  click: { frequencyHz: 880, durationMs: 70, type: "triangle" },
  chime: { frequencyHz: 784, durationMs: 350, type: "sine" },
  low: { frequencyHz: 160, durationMs: 500, type: "sine" },
};

type ToneNodes = {
  left: OscillatorNode;
  right: OscillatorNode;
  gain: GainNode;
};

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

// One shared engine. The AudioContext is created lazily, only inside a
// tap handler (never on load), and kept for the visit so later taps
// don't rebuild it. If the browser has no Web Audio, every method
// quietly does nothing — the app works exactly the same, silently.
class AppSounds {
  private ctx: AudioContext | null = null;
  private calmTone: ToneNodes | null = null;
  private calmVolume: number = CALM_TONE_GAIN;

  // The breathing exercise's own volume slider calls this. Clamped
  // to 0–0.4, so the tone can never get harsh. If a tone is playing,
  // its gain moves with the slider right away.
  setCalmToneVolume(volume: number): void {
    const v = Math.max(0, Math.min(CALM_TONE_GAIN_MAX, volume));
    this.calmVolume = v;
    const tone = this.calmTone;
    if (tone && this.ctx) {
      tone.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) this.ctx = getAudioContext();
    if (this.ctx && this.ctx.state === "suspended") {
      // Resume only happens from a tap, so this never wakes sound
      // on its own — it just lets a tapped sound actually be heard.
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(frequencyHz: number, durationMs: number, type: OscillatorType, volume: number, delayMs = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const startAt = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequencyHz, startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + durationMs / 1000 + 0.05);
  }

  playSlotSound(kind: SlotSoundKind): void {
    const spec = SLOT_TONE_SPECS[kind];
    if (kind === "chime") {
      // Two soft notes, one after the other: 523 Hz, then 784 Hz.
      this.playTone(523, 220, "sine", 0.12);
      this.playTone(spec.frequencyHz, spec.durationMs, spec.type, 0.12, 140);
      return;
    }
    if (kind === "low") {
      // A low note that falls as it fades — the "out of money" sound.
      const ctx = this.ensureContext();
      if (!ctx) return;
      const startAt = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, startAt);
      osc.frequency.exponentialRampToValueAtTime(110, startAt + spec.durationMs / 1000);
      gain.gain.setValueAtTime(0.14, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + spec.durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + spec.durationMs / 1000 + 0.05);
      return;
    }
    this.playTone(spec.frequencyHz, spec.durationMs, spec.type, 0.1);
  }

  startCalmTone(kind: CalmToneKind): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopCalmTone();
    const { leftHz, rightHz } = binauralFrequencies(kind);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.calmVolume, ctx.currentTime + 1.5);
    gain.connect(ctx.destination);
    const makeEar = (frequencyHz: number, pan: number): OscillatorNode => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, ctx.currentTime);
      osc.connect(panner);
      panner.connect(gain);
      osc.start();
      return osc;
    };
    const left = makeEar(leftHz, -1);
    const right = makeEar(rightHz, 1);
    this.calmTone = { left, right, gain };
  }

  stopCalmTone(): void {
    const ctx = this.ctx;
    const tone = this.calmTone;
    this.calmTone = null;
    if (!ctx || !tone) return;
    try {
      tone.gain.gain.cancelScheduledValues(ctx.currentTime);
      tone.gain.gain.setValueAtTime(tone.gain.gain.value, ctx.currentTime);
      tone.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      tone.left.stop(ctx.currentTime + 0.5);
      tone.right.stop(ctx.currentTime + 0.5);
    } catch {
      // Already stopped — nothing to do.
    }
  }

  stopAll(): void {
    this.stopCalmTone();
  }
}

export const sounds = new AppSounds();
