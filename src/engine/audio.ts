import type { SoundTheme } from '../store/settings'
import duckUrl from '../assets/ducks.mp3'

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

// Synth fallback, used only until the real recording has decoded.
const duckSynth: ThemeVoice = {
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

// ---- real duck recording (CC0, BigSoundBank) ------------------------------
// The bundled clip is a 21s field recording of several ducks. On first use we
// decode it and auto-locate the single cleanest, loudest quack, then reuse that
// one slice at different pitches/counts so every cue sounds consistent.
let duckBuffer: AudioBuffer | null = null
let duckSlice: { offset: number; duration: number } | null = null
let duckLoading: Promise<void> | null = null

function findBestQuack(buf: AudioBuffer): { offset: number; duration: number } {
  const data = buf.getChannelData(0)
  const sr = buf.sampleRate
  const win = Math.max(1, Math.floor(sr * 0.01)) // 10ms RMS windows
  const env: number[] = []
  for (let i = 0; i < data.length; i += win) {
    const end = Math.min(i + win, data.length)
    let s = 0
    for (let j = i; j < end; j++) s += data[j] * data[j]
    env.push(Math.sqrt(s / (end - i)))
  }
  const max = env.reduce((m, v) => (v > m ? v : m), 0)
  const thr = max * 0.18

  // contiguous windows above threshold = candidate quacks
  const regions: [number, number][] = []
  let start = -1
  for (let k = 0; k < env.length; k++) {
    if (env[k] >= thr) {
      if (start < 0) start = k
    } else if (start >= 0) {
      regions.push([start, k])
      start = -1
    }
  }
  if (start >= 0) regions.push([start, env.length])

  // merge regions separated by < 80ms (same quack)
  const merged: [number, number][] = []
  for (const r of regions) {
    const last = merged[merged.length - 1]
    if (last && r[0] - last[1] < 8) last[1] = r[1]
    else merged.push([r[0], r[1]])
  }

  // pick the loudest region with a plausible single-quack length
  let best: [number, number] | null = null
  let bestPeak = 0
  for (const [a, b] of merged) {
    const durSec = ((b - a) * win) / sr
    if (durSec < 0.09 || durSec > 0.5) continue
    let peak = 0
    for (let k = a; k < b; k++) if (env[k] > peak) peak = env[k]
    if (peak > bestPeak) {
      bestPeak = peak
      best = [a, b]
    }
  }
  if (!best) best = [0, Math.min(env.length, Math.floor((0.3 * sr) / win))]

  const pad = Math.floor(sr * 0.01)
  const offset = Math.max(0, best[0] * win - pad) / sr
  const endSec = Math.min(data.length, best[1] * win + pad) / sr
  return { offset, duration: Math.max(0.12, endSec - offset) }
}

export function loadDuck(ctx: AudioContext): Promise<void> {
  if (duckBuffer) return Promise.resolve()
  if (!duckLoading) {
    duckLoading = (async () => {
      const res = await fetch(duckUrl)
      const arr = await res.arrayBuffer()
      const buf = await ctx.decodeAudioData(arr)
      duckBuffer = buf
      duckSlice = findBestQuack(buf)
    })().catch((e) => {
      duckLoading = null // allow a retry
      throw e
    })
  }
  return duckLoading
}

// Play the extracted quack, pitched by `rate` and gently faded to avoid clicks.
function playQuack(ctx: AudioContext, out: GainNode, when: number, rate: number, gain = 0.95) {
  if (!duckBuffer || !duckSlice) return
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  src.buffer = duckBuffer
  src.playbackRate.value = rate
  const realDur = duckSlice.duration / rate
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(gain, when + 0.012)
  g.gain.setValueAtTime(gain, Math.max(when + 0.012, when + realDur - 0.03))
  g.gain.linearRampToValueAtTime(0.0001, when + realDur)
  src.connect(g).connect(out)
  src.start(when, duckSlice.offset, duckSlice.duration)
  src.stop(when + realDur + 0.03)
}

const duck: ThemeVoice = {
  play(ctx, out, kind, when) {
    void loadDuck(ctx) // kick off decoding if needed
    if (!duckBuffer || !duckSlice) {
      duckSynth.play(ctx, out, kind, when) // not decoded yet
      return
    }
    switch (kind) {
      case 'tick':
        playQuack(ctx, out, when, 1.18, 0.7)
        break
      case 'go':
        playQuack(ctx, out, when, 1.0)
        playQuack(ctx, out, when + 0.16, 1.12)
        break
      case 'rest':
        playQuack(ctx, out, when, 0.82, 0.8)
        break
      case 'done':
        playQuack(ctx, out, when, 1.0)
        playQuack(ctx, out, when + 0.18, 1.15)
        playQuack(ctx, out, when + 0.36, 1.32)
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
    // Warm the duck recording so it's ready before the first cue fires.
    if (this.theme === 'duck') void loadDuck(ctx)
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
    if (this.theme === 'duck' && !duckBuffer) {
      // decode first so the preview plays the real quack, not the fallback
      void loadDuck(ctx).then(() => this.play(kind, ctx.currentTime + 0.02))
      return
    }
    this.play(kind, ctx.currentTime + 0.02)
  }
}

export const soundEngine = new SoundEngine()
