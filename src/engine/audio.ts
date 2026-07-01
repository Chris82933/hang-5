import type { SoundTheme } from '../store/settings'

/**
 * Cue kinds the workout produces. The scheduler asks the engine to play one of
 * these at an absolute AudioContext time, so playback is sample-accurate and
 * stays locked to the same clock the visuals read.
 */
export type CueKind = 'tick' | 'go' | 'rest' | 'done'

interface ThemeVoice {
  play(ctx: AudioContext, out: GainNode, kind: CueKind, when: number): void
}

// ---- helpers ---------------------------------------------------------------

function tone(
  ctx: AudioContext,
  out: GainNode,
  when: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  peak = 0.9,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, when)
  // short attack + exponential decay = a clean, click-free blip
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(peak, when + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(g).connect(out)
  osc.start(when)
  osc.stop(when + dur + 0.02)
}

// ---- themes ----------------------------------------------------------------

const beeps: ThemeVoice = {
  play(ctx, out, kind, when) {
    switch (kind) {
      case 'tick':
        tone(ctx, out, when, 660, 0.12, 'square', 0.6)
        break
      case 'go':
        tone(ctx, out, when, 1320, 0.5, 'square', 0.9)
        break
      case 'rest':
        tone(ctx, out, when, 440, 0.25, 'sine', 0.7)
        break
      case 'done':
        tone(ctx, out, when, 880, 0.15, 'square', 0.8)
        tone(ctx, out, when + 0.18, 1174, 0.15, 'square', 0.8)
        tone(ctx, out, when + 0.36, 1568, 0.4, 'square', 0.9)
        break
    }
  },
}

// A softer, enveloped voice that reads as "piano-ish": triangle + long decay.
function pianoNote(ctx: AudioContext, out: GainNode, when: number, freq: number, dur = 0.7) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, when)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.9, when + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(g).connect(out)
  osc.start(when)
  osc.stop(when + dur + 0.02)
}

const piano: ThemeVoice = {
  play(ctx, out, kind, when) {
    switch (kind) {
      case 'tick':
        pianoNote(ctx, out, when, 392, 0.35) // G4
        break
      case 'go':
        // bright ascending triad — clear "go" signal
        pianoNote(ctx, out, when, 523, 0.9) // C5
        pianoNote(ctx, out, when, 659, 0.9) // E5
        pianoNote(ctx, out, when, 784, 0.9) // G5
        break
      case 'rest':
        pianoNote(ctx, out, when, 330, 0.8) // E4 — settle down
        break
      case 'done':
        pianoNote(ctx, out, when, 523, 0.5)
        pianoNote(ctx, out, when + 0.2, 659, 0.5)
        pianoNote(ctx, out, when + 0.4, 784, 0.9)
        break
    }
  },
}

// Synthesized "duck" placeholder: a pitch-swept sawtooth through a bandpass
// gives a nasal quack. (Real recorded quacks can be swapped in later.)
function quack(ctx: AudioContext, out: GainNode, when: number, base: number, dur = 0.18) {
  const osc = ctx.createOscillator()
  const bp = ctx.createBiquadFilter()
  const g = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(base, when)
  osc.frequency.linearRampToValueAtTime(base * 0.6, when + dur)
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(1100, when)
  bp.Q.value = 6
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.9, when + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(bp).connect(g).connect(out)
  osc.start(when)
  osc.stop(when + dur + 0.02)
}

const duck: ThemeVoice = {
  play(ctx, out, kind, when) {
    switch (kind) {
      case 'tick':
        quack(ctx, out, when, 320, 0.14)
        break
      case 'go':
        quack(ctx, out, when, 520, 0.16)
        quack(ctx, out, when + 0.18, 620, 0.2)
        break
      case 'rest':
        quack(ctx, out, when, 260, 0.2)
        break
      case 'done':
        quack(ctx, out, when, 400, 0.14)
        quack(ctx, out, when + 0.16, 400, 0.14)
        quack(ctx, out, when + 0.32, 500, 0.24)
        break
    }
  },
}

const THEMES: Record<SoundTheme, ThemeVoice> = { beeps, piano, duck }

// ---- engine ----------------------------------------------------------------

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private theme: SoundTheme = 'beeps'
  private volume = 0.8

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  /** Must be called from a user gesture (the Start tap) to unlock audio on iOS. */
  async unlock(): Promise<void> {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') await ctx.resume()
  }

  suspend(): void {
    void this.ctx?.suspend()
  }

  resume(): void {
    void this.ctx?.resume()
  }

  setTheme(theme: SoundTheme): void {
    this.theme = theme
  }

  setVolume(v: number): void {
    this.volume = v
    if (this.master) this.master.gain.value = v
  }

  /** Current audio clock time — the single source of truth for sync. */
  now(): number {
    return this.ensure().currentTime
  }

  /** Schedule a cue at an absolute AudioContext time. */
  play(kind: CueKind, when: number): void {
    const ctx = this.ensure()
    if (!this.master) return
    THEMES[this.theme].play(ctx, this.master, kind, Math.max(when, ctx.currentTime))
  }

  /** Fire a cue immediately (used for previewing a theme in settings). */
  preview(kind: CueKind = 'go'): void {
    const ctx = this.ensure()
    void ctx.resume()
    this.play(kind, ctx.currentTime + 0.02)
  }
}

export const soundEngine = new SoundEngine()
