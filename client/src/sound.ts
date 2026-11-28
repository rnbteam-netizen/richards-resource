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
// 3. Happy Button sounds (Home, Richard, 2026-11-18): one fixed tap
//    tone, the same on every tap, and one big carnival bell when a
//    thermometer fills. See HAPPY_TAP_* / HAPPY_BELL_* below.
// 4. Gazebo bell (My Life Garden Pathway, Richard, 2026-11-28): one
//    small, gentle bell in the gazebo — a tiny yoga bell, like the
//    one his yoga instructor rang at the end of a session — to mark
//    a quiet moment. See GAZEBO_BELL_* below. It only ever rings
//    when tapped, never on its own — unless the visitor turns on
//    "Ring the bell every minute", when it rings once a minute,
//    spaced apart, while they stay in the gazebo.
// 5. Gazebo music (My Life Garden Pathway, Richard, 2026-11-28):
//    six original, gentle pieces to choose from while in the
//    gazebo — soft piano, harp, harmonica, acoustic guitar,
//    violins, and oboe (added 2026-11-28, Richard: "Oboe are
//    nice too"). Every note is made here with Web Audio, in the
//    instrument's own voice — no audio files, no downloaded
//    music, no copyrighted songs, no copied melody. See
//    GAZEBO_MUSIC_* below. Off by default: nothing plays until
//    the visitor taps one, and it stops when they leave. Each
//    piece is its own tune in its own key/mode, with its own
//    rhythm and voice — the band had been playing the same tune
//    (one shared C-major pool, near-identical oscillators),
//    so 2026-11-28 gave each instrument a different phrase,
//    a louder voice, and a volume slider in the gazebo.
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

// Happy Button sounds (Richard, 2026-11-18): the live button was
// silent — the mock-up's sound never carried over, so it lives here
// now, in the same Web Audio engine, no audio files.
//
// The tap tone is ONE fixed tone, the same on every tap: 660 Hz,
// 350 ms, gain 0.12. A bit louder than the mock-up's whisper
// (0.07) — the same level as the other short tones in this engine.
// Each tap is a moment of happiness, NOT a degree of it, so the
// tone must never rise in pitch or loudness as the thermometer
// fills: playHappySound takes no fill level, no count, and nothing
// that could make it rise. "I'm feeling happy" — TAP, done; next
// time, the same thing.
//
// The bell is the strongman-game bell: one strike at the top, a
// fundamental (1046 Hz) with harmonics (1568, 2093 Hz) that ring
// together for about 1.2 seconds, then fade. It plays only when a
// thermometer fills, never on an ordinary tap.
// Gazebo bell (Richard, 2026-11-28): a tiny bell, not the big
// carnival bell. Higher and softer than the Happy Button bell —
// one strike at 2093 Hz (C7 — raised a clear step from 1568 Hz
// on 2026-11-28, Richard: "the pitch on the bell needs to be
// higher") with quiet harmonics (3136, 4186 Hz), gains about
// half the carnival bell's, ringing together for about 2.4
// seconds, then fading — like the small bell at the end of a
// yoga session. It plays only when the visitor taps
// "Ring the bell" in the gazebo, never on its own, never on a
// loop, and never when the gazebo opens.
export const GAZEBO_BELL_FREQUENCIES_HZ: [number, number, number] = [2093, 3136, 4186];
export const GAZEBO_BELL_DURATION_MS = 2400;
export const GAZEBO_BELL_GAIN = 0.07;
// Bell every minute (Richard, 2026-11-28): "the bell is very
// spaced apart, like one minute spacing" — an opt-in toggle in
// the gazebo rings the tiny bell once every 60 seconds, while
// the visitor stays in the gazebo. Off by default.
export const GAZEBO_BELL_EVERY_MINUTE_MS = 60000;

// Gazebo music (Richard, 2026-11-28): six original, gentle
// pieces to choose from while in the gazebo — soft piano, harp,
// harmonica, acoustic guitar, violins, and oboe. Each piece is
// a slow, original phrase in its own key and mode, in the
// instrument's own voice, made here with Web Audio oscillators
// — no audio files, no downloaded music, no copyrighted songs,
// no copied melody. Each one sounds different: piano steps down
// gently in C major, harp arpeggiates wide, harmonica holds long
// notes in D minor, guitar plucks short and rhythmic in E major,
// violins sing long and slow in A minor, oboe sings reedy in
// G major. A volume slider in the gazebo sets how loud they
// play, 0 to 0.4, default 0.22.
export type GazeboMusicKind = "piano" | "harp" | "harmonica" | "guitar" | "violins" | "oboe";
export const GAZEBO_MUSIC_KINDS: { id: GazeboMusicKind; label: string }[] = [
  { id: "piano", label: "Soft piano" },
  { id: "harp", label: "Harp" },
  { id: "harmonica", label: "Harmonica" },
  { id: "guitar", label: "Acoustic guitar" },
  { id: "violins", label: "Violins" },
  { id: "oboe", label: "Oboe" },
];
// Gazebo music volume (Richard, 2026-11-28): "Not loud enough
// or we need volume control" — the pieces were a whisper at
// gain 0.07–0.09. They now play at about 0.22 by default (the
// same level as the calm tone), and the gazebo has its own
// volume slider, 0 to 0.4, following the breathing exercise's
// setCalmToneVolume pattern. Sound still follows the phone's
// volume and silent switch — this is the music's own volume,
// inside the app. The slider only moves music that is playing.
export const GAZEBO_MUSIC_VOLUME_DEFAULT = 0.22;
export const GAZEBO_MUSIC_VOLUME_MAX = 0.4;
export const GAZEBO_MUSIC_LOOP_MS = 30000;

export type GazeboMusicNote = { frequencyHz: number; startMs: number; durationMs: number };

// The notes, in hertz — several keys and modes, so each
// instrument's piece is genuinely its own tune, not the same
// notes in a different voice:
//   piano: C-major pentatonic, stepping down gently;
//   harp: C major, arpeggiating wide, up and down;
//   harmonica: D minor pentatonic, long held notes;
//   guitar: E major, plucked and rhythmic;
//   violins: A minor, slow and legato, long and low;
//   oboe: G major pentatonic, singing and reedy.
const GAZEBO_MUSIC_NOTES_HZ = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  A3: 220.0, B3: 246.94, E3: 164.81, G3: 196.0, D3: 146.83, GSharp4: 415.3, CSharp5: 554.37,
} as const;

// One slow, original phrase per instrument — twelve notes each,
// each in its own key, shape and rhythm, so the band no longer
// plays the same tune. Start spacing and note length differ per
// instrument too: guitar plucks short and quick, harmonica and
// violins hold long notes, piano and oboe sit in between.
export function gazeboMusicPhrase(kind: GazeboMusicKind): GazeboMusicNote[] {
  const steps: Record<GazeboMusicKind, (keyof typeof GAZEBO_MUSIC_NOTES_HZ)[]> = {
    piano: ["C5", "A4", "G4", "E4", "D4", "C4", "E4", "G4", "A4", "G4", "E4", "C4"],
    harp: ["C4", "E4", "G4", "C5", "E5", "G5", "E5", "C5", "G4", "E4", "G4", "C5"],
    harmonica: ["D4", "F4", "A4", "C5", "D5", "C5", "A4", "F4", "D4", "A4", "F4", "D4"],
    guitar: ["E3", "B3", "E4", "GSharp4", "B4", "E5", "B4", "GSharp4", "E4", "B3", "E4", "B4"],
    violins: ["A3", "C4", "E4", "A4", "C5", "E5", "A5", "E5", "C5", "A4", "E4", "C4"],
    oboe: ["G4", "B4", "D5", "G5", "D5", "B4", "G4", "A4", "B4", "D5", "E5", "G5"],
  };
  const durationsMs: Record<GazeboMusicKind, number> = {
    piano: 2200, harp: 2000, harmonica: 3400, guitar: 900, violins: 3600, oboe: 2400,
  };
  const stepMs: Record<GazeboMusicKind, number> = {
    piano: 2400, harp: 2200, harmonica: 2600, guitar: 1200, violins: 2400, oboe: 2400,
  };
  return steps[kind].map((note, i) => ({
    frequencyHz: GAZEBO_MUSIC_NOTES_HZ[note],
    startMs: i * stepMs[kind],
    durationMs: durationsMs[kind],
  }));
}

// Each instrument's voice — the oscillator shape and loudness
// that makes it sound like itself, still soft, still gentle.
// Louder than the first version (Richard, 2026-11-28: "Not
// loud enough"): gains about double the old 0.07–0.09, before
// the gazebo's own volume slider scales them. Oboe is reedy,
// so it uses a sawtooth at a lower gain — a sawtooth carries
// further than a sine at the same gain. Violins sing with two
// tones at once (see playGazeboMusicPhrase, which adds a soft
// octave above for violins only).
export function gazeboMusicVoice(kind: GazeboMusicKind): { type: OscillatorType; gain: number } {
  const voices: Record<GazeboMusicKind, { type: OscillatorType; gain: number }> = {
    piano: { type: "triangle", gain: 0.18 },
    harp: { type: "sine", gain: 0.17 },
    harmonica: { type: "sine", gain: 0.15 },
    guitar: { type: "triangle", gain: 0.17 },
    violins: { type: "sine", gain: 0.16 },
    oboe: { type: "sawtooth", gain: 0.07 },
  };
  return voices[kind];
}

export type HappySoundKind = "tap" | "bell";
export const HAPPY_TAP_FREQUENCY_HZ = 660;
export const HAPPY_TAP_DURATION_MS = 350;
export const HAPPY_TAP_GAIN = 0.12;
export const HAPPY_BELL_FREQUENCIES_HZ: [number, number, number] = [1046, 1568, 2093];
export const HAPPY_BELL_DURATION_MS = 1200;
export const HAPPY_BELL_GAIN = 0.14;

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
  // Gazebo music (Richard, 2026-11-28): the piece now playing,
  // its loop timer, and the not-yet-started notes of the current
  // phrase, so stopping clears what has not sounded yet. Notes
  // already sounding are short and fade within a few seconds.
  private gazeboMusicKind: GazeboMusicKind | null = null;
  private gazeboMusicTimer: ReturnType<typeof setInterval> | null = null;
  private gazeboMusicTimeouts: ReturnType<typeof setTimeout>[] = [];
  // Gazebo music volume (Richard, 2026-11-28): the visitor's
  // own slider in the gazebo, 0 to 0.4, default 0.22 — the same
  // pattern as the breathing exercise's calm-tone volume. The
  // voices above are the gains at the default volume; the
  // slider scales them, so 0 is silent and 0.4 is the loudest.
  private gazeboMusicVolume: number = GAZEBO_MUSIC_VOLUME_DEFAULT;

  // The gazebo's own volume slider calls this. Clamped to
  // 0–0.4, so the music can never get harsh. Notes already
  // sounding keep their gain; the next notes use the new one.
  setGazeboMusicVolume(volume: number): void {
    this.gazeboMusicVolume = Math.max(0, Math.min(GAZEBO_MUSIC_VOLUME_MAX, volume));
  }

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

  // Warm up the audio engine from a tap, so a sound played later
  // (for example, when a timer finishes) can actually be heard.
  // Creating/resuming the AudioContext here, inside the tap, is what
  // lets the later sound play — a context created outside a tap may
  // stay suspended on a phone.
  prepareAudio(): void {
    this.ensureContext();
  }

  // A soft two-note "time's up" sound (Richard, 2026-11-14, Screens
  // look-away: sound only, no spoken counting). Same gentle notes as
  // the slot chime, 523 Hz then 784 Hz, quiet, no words.
  playDoneSound(): void {
    this.playTone(523, 220, "sine", 0.12);
    this.playTone(784, 350, "sine", 0.12, 140);
  }

  // Happy Button sounds (Richard, 2026-11-18). The tap tone is one
  // fixed tone — the same 660 Hz, the same loudness, on every tap,
  // whatever the thermometer shows. It takes no fill level, so it
  // cannot rise: a moment, not a degree. The bell rings only when
  // a thermometer fills — one strike, fundamental plus harmonics,
  // ringing together. Both are Web Audio, tap-only, off by default
  // (the caller guards them with its own toggle, like the slot
  // sounds); the calm tones above are untouched.
  playHappySound(kind: HappySoundKind): void {
    if (kind === "bell") {
      this.playTone(HAPPY_BELL_FREQUENCIES_HZ[0], HAPPY_BELL_DURATION_MS, "sine", HAPPY_BELL_GAIN);
      this.playTone(HAPPY_BELL_FREQUENCIES_HZ[1], 1000, "sine", 0.07);
      this.playTone(HAPPY_BELL_FREQUENCIES_HZ[2], 800, "sine", 0.04);
      return;
    }
    this.playTone(HAPPY_TAP_FREQUENCY_HZ, HAPPY_TAP_DURATION_MS, "sine", HAPPY_TAP_GAIN);
  }

  // Gazebo bell (Richard, 2026-11-28): one small, gentle ring —
  // a tiny yoga bell to mark a quiet moment at the end of a
  // mindful break. Web Audio only, no audio file, no copyright.
  // Tap-only: the caller plays it from the "Ring the bell" tap,
  // never on load, never on opening the gazebo — unless the
  // visitor turns on "Ring the bell every minute", when it rings
  // once a minute, spaced apart, while they stay in the gazebo.
  playGazeboBell(): void {
    this.playTone(GAZEBO_BELL_FREQUENCIES_HZ[0], GAZEBO_BELL_DURATION_MS, "sine", GAZEBO_BELL_GAIN);
    this.playTone(GAZEBO_BELL_FREQUENCIES_HZ[1], 1800, "sine", 0.035);
    this.playTone(GAZEBO_BELL_FREQUENCIES_HZ[2], 1200, "sine", 0.02);
  }

  // Gazebo music (Richard, 2026-11-28): the visitor's chosen
  // piece, played only after they tap it — never on opening
  // the gazebo, never on load. The phrase plays once, then
  // loops every GAZEBO_MUSIC_LOOP_MS until stopped. Choosing
  // another piece stops the first; stopping, or leaving the
  // gazebo, clears the loop and any notes not yet sounded.
  currentGazeboMusic(): GazeboMusicKind | null {
    return this.gazeboMusicKind;
  }

  startGazeboMusic(kind: GazeboMusicKind): void {
    this.ensureContext();
    this.stopGazeboMusic();
    this.gazeboMusicKind = kind;
    this.playGazeboMusicPhrase(kind);
    this.gazeboMusicTimer = setInterval(() => {
      if (this.gazeboMusicKind === kind) this.playGazeboMusicPhrase(kind);
    }, GAZEBO_MUSIC_LOOP_MS);
  }

  private playGazeboMusicPhrase(kind: GazeboMusicKind): void {
    const voice = gazeboMusicVoice(kind);
    // The slider scales the voice: at the default 0.22 the
    // voice plays as written; at 0 it is silent; at 0.4 it is
    // about twice as loud.
    const scaledGain = voice.gain * (this.gazeboMusicVolume / GAZEBO_MUSIC_VOLUME_DEFAULT);
    for (const note of gazeboMusicPhrase(kind)) {
      const id = setTimeout(() => {
        if (this.gazeboMusicKind === kind) {
          this.playTone(note.frequencyHz, note.durationMs, voice.type, scaledGain);
          if (kind === "violins") {
            // Violins sing with a soft octave above — the second
            // tone is what makes them sound like violins, not
            // just a sine, and it is what the old single
            // oscillator was missing.
            this.playTone(note.frequencyHz * 2, note.durationMs, "sine", scaledGain * 0.4);
          }
        }
      }, note.startMs);
      this.gazeboMusicTimeouts.push(id);
    }
  }

  stopGazeboMusic(): void {
    if (this.gazeboMusicTimer !== null) {
      clearInterval(this.gazeboMusicTimer);
      this.gazeboMusicTimer = null;
    }
    for (const id of this.gazeboMusicTimeouts) clearTimeout(id);
    this.gazeboMusicTimeouts = [];
    this.gazeboMusicKind = null;
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
    this.stopGazeboMusic();
  }
}

export const sounds = new AppSounds();
