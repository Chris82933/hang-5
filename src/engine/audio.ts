import type { SoundTheme } from '../store/settings'
import duckUrl from '../assets/ducks.mp3'

/**
 * Cue kinds the workout produces. The scheduler asks the engine to play one of
 * these at an absolute AudioContext time, so playback is sample-accurate and
 * stays locked to the same clock the visuals read.
 */
export type CueKind = 'tick' | 'go' | 'rest' | 'done' | 'celebrate'

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
      case 'celebrate': {
        const seq = [784, 988, 1175, 1568, 1319, 1568]
        seq.forEach((f, i) => tone(ctx, out, when + i * 0.11, f, 0.16, 'square', 0.8))
        tone(ctx, out, when + 0.7, 2093, 0.6, 'square', 0.9)
        break
      }
    }
  },
}

type NoteFn = (ctx: AudioContext, out: GainNode, when: number, freq: number, dur?: number) => void

// Classic: single triangle with a long decay — balanced and mellow.
const classicNote: NoteFn = (ctx, out, when, freq, dur = 0.7) => {
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

// Bright: sawtooth + a square octave partial, hard attack — sharp and cutting.
const brightNote: NoteFn = (ctx, out, when, freq, dur = 0.55) => {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.85, when + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  g.connect(out)
  const o1 = ctx.createOscillator()
  o1.type = 'sawtooth'
  o1.frequency.setValueAtTime(freq, when)
  o1.connect(g)
  o1.start(when)
  o1.stop(when + dur + 0.02)
  const o2 = ctx.createOscillator()
  const g2 = ctx.createGain()
  o2.type = 'square'
  o2.frequency.setValueAtTime(freq * 2, when)
  g2.gain.value = 0.3
  o2.connect(g2).connect(g)
  o2.start(when)
  o2.stop(when + dur + 0.02)
}

// Warm: an octave lower, pure sines through a dark lowpass with a slow, soft
// attack and long release — round and mellow, clearly distinct from the crisp
// mid-register classic piano.
const warmNote: NoteFn = (ctx, out, when, freq, dur = 1.5) => {
  const f = freq * 0.5 // drop an octave for a rounder voice
  const g = ctx.createGain()
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 850
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.85, when + 0.06) // slow, cushioned attack
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  g.connect(lp).connect(out)
  // fundamental + soft octave + a quiet fifth for warmth (all sine)
  const partials: [number, number][] = [
    [1, 1],
    [2, 0.22],
    [3, 0.1],
  ]
  for (const [mult, gain] of partials) {
    const o = ctx.createOscillator()
    const pg = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(f * mult, when)
    pg.gain.value = gain
    o.connect(pg).connect(g)
    o.start(when)
    o.stop(when + dur + 0.05)
  }
}

// All piano variants share the same musical cues; only the note timbre differs.
function pianoVoice(note: NoteFn): ThemeVoice {
  return {
    play(ctx, out, kind, when) {
      switch (kind) {
        case 'tick':
          note(ctx, out, when, 392, 0.35) // G4
          break
        case 'go':
          // ascending triad — clear "go" signal
          note(ctx, out, when, 523, 0.9) // C5
          note(ctx, out, when, 659, 0.9) // E5
          note(ctx, out, when, 784, 0.9) // G5
          break
        case 'rest':
          note(ctx, out, when, 330, 0.8) // E4 — settle down
          break
        case 'done':
          note(ctx, out, when, 523, 0.5)
          note(ctx, out, when + 0.2, 659, 0.5)
          note(ctx, out, when + 0.4, 784, 0.9)
          break
        case 'celebrate': {
          // ascending run into a triumphant sustained chord
          const run = [523, 587, 659, 784, 880, 1047]
          run.forEach((f, i) => note(ctx, out, when + i * 0.09, f, 0.5))
          const chord = [659, 784, 1047]
          chord.forEach((f) => note(ctx, out, when + 0.62, f, 1.6))
          break
        }
      }
    },
  }
}

const piano = pianoVoice(classicNote)
const pianoBright = pianoVoice(brightNote)
const pianoWarm = pianoVoice(warmNote)

// Marimba: sine fundamental + a quiet high partial, fast percussive decay.
const marimbaNote: NoteFn = (ctx, out, when, freq, dur = 0.5) => {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.9, when + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.6)
  g.connect(out)
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(freq, when)
  o1.connect(g)
  o1.start(when)
  o1.stop(when + dur)
  const o2 = ctx.createOscillator()
  const g2 = ctx.createGain()
  o2.type = 'sine'
  o2.frequency.setValueAtTime(freq * 4, when) // woody overtone
  g2.gain.value = 0.18
  o2.connect(g2).connect(g)
  o2.start(when)
  o2.stop(when + dur)
}

// Bells: FM synthesis with an inharmonic ratio and a decaying mod index.
const bellNote: NoteFn = (ctx, out, when, freq, dur = 1.2) => {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.8, when + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  g.connect(out)
  const carrier = ctx.createOscillator()
  carrier.type = 'sine'
  carrier.frequency.setValueAtTime(freq, when)
  const mod = ctx.createOscillator()
  mod.type = 'sine'
  mod.frequency.setValueAtTime(freq * 1.41, when) // inharmonic → metallic
  const modGain = ctx.createGain()
  modGain.gain.setValueAtTime(freq * 3, when)
  modGain.gain.exponentialRampToValueAtTime(freq * 0.1, when + dur)
  mod.connect(modGain).connect(carrier.frequency)
  carrier.connect(g)
  mod.start(when)
  carrier.start(when)
  mod.stop(when + dur + 0.02)
  carrier.stop(when + dur + 0.02)
}

const marimba = pianoVoice(marimbaNote)
const bells = pianoVoice(bellNote)

// Chiptune: retro square-wave blips with an arpeggiated "go".
function chipBlip(ctx: AudioContext, out: GainNode, when: number, freq: number, dur = 0.11) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'square'
  o.frequency.setValueAtTime(freq, when)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.5, when + 0.005)
  g.gain.setValueAtTime(0.5, when + Math.max(0.02, dur - 0.02))
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  o.connect(g).connect(out)
  o.start(when)
  o.stop(when + dur + 0.02)
}

const chiptune: ThemeVoice = {
  play(ctx, out, kind, when) {
    switch (kind) {
      case 'tick':
        chipBlip(ctx, out, when, 660, 0.08)
        break
      case 'go': // fast ascending arpeggio
        chipBlip(ctx, out, when, 523, 0.08)
        chipBlip(ctx, out, when + 0.09, 659, 0.08)
        chipBlip(ctx, out, when + 0.18, 784, 0.08)
        chipBlip(ctx, out, when + 0.27, 1047, 0.2)
        break
      case 'rest':
        chipBlip(ctx, out, when, 392, 0.14)
        break
      case 'done':
        chipBlip(ctx, out, when, 784, 0.09)
        chipBlip(ctx, out, when + 0.1, 1047, 0.09)
        chipBlip(ctx, out, when + 0.2, 1319, 0.24)
        break
      case 'celebrate': {
        // classic 8-bit victory jingle
        const notes: [number, number][] = [
          [523, 0.1],
          [659, 0.1],
          [784, 0.1],
          [1047, 0.1],
          [880, 0.1],
          [1047, 0.1],
          [1319, 0.45],
        ]
        let t = 0
        for (const [f, d] of notes) {
          chipBlip(ctx, out, when + t, f, d + 0.02)
          t += d
        }
        break
      }
    }
  },
}

// Cow: a synthesized "moo" — sawtooth with a pitch contour through vocal
// formants, plus gentle vibrato.
function moo(ctx: AudioContext, out: GainNode, when: number, base: number, dur = 0.6) {
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(base * 0.9, when)
  o.frequency.linearRampToValueAtTime(base * 1.06, when + dur * 0.25)
  o.frequency.linearRampToValueAtTime(base * 0.8, when + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.9, when + 0.05)
  g.gain.setValueAtTime(0.9, when + Math.max(0.06, dur - 0.12))
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  g.connect(out)
  for (const [f, q] of [
    [520, 4],
    [1000, 6],
  ] as [number, number][]) {
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = q
    o.connect(bp).connect(g)
  }
  const lfo = ctx.createOscillator()
  const lfoG = ctx.createGain()
  lfo.frequency.value = 6
  lfoG.gain.value = base * 0.03
  lfo.connect(lfoG).connect(o.frequency)
  lfo.start(when)
  lfo.stop(when + dur)
  o.start(when)
  o.stop(when + dur + 0.05)
}

const cow: ThemeVoice = {
  play(ctx, out, kind, when) {
    switch (kind) {
      case 'tick':
        moo(ctx, out, when, 170, 0.24)
        break
      case 'go':
        moo(ctx, out, when, 185, 0.75)
        break
      case 'rest':
        moo(ctx, out, when, 130, 0.5)
        break
      case 'done':
        moo(ctx, out, when, 175, 0.4)
        moo(ctx, out, when + 0.5, 210, 0.7)
        break
      case 'celebrate': {
        // a whole herd mooing together
        const herd: [number, number, number][] = [
          [0, 150, 0.7],
          [0.12, 190, 0.8],
          [0.28, 168, 0.9],
          [0.45, 220, 0.7],
          [0.6, 140, 1.0],
        ]
        for (const [t, base, dur] of herd) moo(ctx, out, when + t, base, dur)
        break
      }
    }
  },
}

// Bird: bright sine chirps that sweep in pitch.
function chirp(ctx: AudioContext, out: GainNode, when: number, f0: number, f1: number, dur = 0.11) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(f0, when)
  o.frequency.exponentialRampToValueAtTime(f1, when + dur)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.6, when + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  o.connect(g).connect(out)
  o.start(when)
  o.stop(when + dur + 0.02)
}

const bird: ThemeVoice = {
  play(ctx, out, kind, when) {
    switch (kind) {
      case 'tick':
        chirp(ctx, out, when, 2100, 2700, 0.08)
        break
      case 'go': // excited ascending trill
        chirp(ctx, out, when, 2000, 2900, 0.07)
        chirp(ctx, out, when + 0.08, 2500, 3400, 0.07)
        chirp(ctx, out, when + 0.16, 3000, 4000, 0.14)
        break
      case 'rest': // soft descending two-note
        chirp(ctx, out, when, 2600, 2100, 0.1)
        chirp(ctx, out, when + 0.13, 2200, 1750, 0.16)
        break
      case 'done':
        chirp(ctx, out, when, 2400, 3200, 0.07)
        chirp(ctx, out, when + 0.09, 2900, 3700, 0.07)
        chirp(ctx, out, when + 0.18, 3300, 4200, 0.22)
        break
      case 'celebrate': {
        // a flock of birds singing together
        for (let i = 0; i < 9; i++) {
          const t = i * 0.07
          const f0 = 2000 + Math.random() * 900
          chirp(ctx, out, when + t, f0, f0 + 700 + Math.random() * 600, 0.09)
        }
        chirp(ctx, out, when + 0.7, 2600, 4200, 0.3)
        break
      }
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
      case 'celebrate':
        for (let i = 0; i < 8; i++) {
          quack(ctx, out, when + i * 0.11, 300 + Math.random() * 350, 0.16)
        }
        break
    }
  },
}

// ---- real duck recording (CC0, BigSoundBank) ------------------------------
// The bundled clip is a 21s field recording of several ducks. On first use we
// decode it and auto-locate several distinct, clean quacks. Cues then use
// different real quacks (rotating countdown, an excited double-quack "go", a
// rising triple "done") for a livelier, more natural sound than reusing one.
interface Quack {
  offset: number
  duration: number
}
let duckBuffer: AudioBuffer | null = null
let duckQuacks: Quack[] = []
let duckLoading: Promise<void> | null = null
let tickTurn = 0 // rotates through quacks so countdown beeps vary

function findQuacks(buf: AudioBuffer): Quack[] {
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
  const thr = max * 0.2

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

  // merge regions separated by < 70ms (same quack)
  const merged: [number, number][] = []
  for (const r of regions) {
    const last = merged[merged.length - 1]
    if (last && r[0] - last[1] < 7) last[1] = r[1]
    else merged.push([r[0], r[1]])
  }

  // keep plausible single-quack lengths, score by peak loudness
  const pad = Math.floor(sr * 0.008)
  const scored = merged
    .map(([a, b]) => {
      let peak = 0
      for (let k = a; k < b; k++) if (env[k] > peak) peak = env[k]
      const durSec = ((b - a) * win) / sr
      const offset = Math.max(0, a * win - pad) / sr
      const endSec = Math.min(data.length, b * win + pad) / sr
      return { peak, durSec, quack: { offset, duration: Math.max(0.12, endSec - offset) } }
    })
    .filter((r) => r.durSec >= 0.08 && r.durSec <= 0.45)
    .sort((x, y) => y.peak - x.peak)
    .slice(0, 6) // the loudest handful of clean quacks

  if (scored.length === 0) {
    return [{ offset: 0, duration: Math.min(0.3, buf.duration) }]
  }
  return scored.map((r) => r.quack)
}

export function loadDuck(ctx: AudioContext): Promise<void> {
  if (duckBuffer) return Promise.resolve()
  if (!duckLoading) {
    duckLoading = (async () => {
      const res = await fetch(duckUrl)
      const arr = await res.arrayBuffer()
      const buf = await ctx.decodeAudioData(arr)
      duckBuffer = buf
      duckQuacks = findQuacks(buf)
    })().catch((e) => {
      duckLoading = null // allow a retry
      throw e
    })
  }
  return duckLoading
}

// Play one quack slice, pitched by `rate`, cleaned with a highpass + a gentle
// presence bump, and faded to avoid clicks at the slice edges.
function playQuack(
  ctx: AudioContext,
  out: GainNode,
  when: number,
  quack: Quack,
  rate: number,
  gain = 0.95,
) {
  if (!duckBuffer) return
  const src = ctx.createBufferSource()
  const hp = ctx.createBiquadFilter()
  const presence = ctx.createBiquadFilter()
  const g = ctx.createGain()
  src.buffer = duckBuffer
  src.playbackRate.value = rate
  hp.type = 'highpass'
  hp.frequency.value = 200 // cut low rumble/wind from the field recording
  presence.type = 'peaking'
  presence.frequency.value = 1200 // emphasise the nasal "quack" formant
  presence.Q.value = 0.8
  presence.gain.value = 4
  const realDur = quack.duration / rate
  g.gain.setValueAtTime(0.0001, when)
  g.gain.linearRampToValueAtTime(gain, when + 0.012)
  g.gain.setValueAtTime(gain, Math.max(when + 0.012, when + realDur - 0.035))
  g.gain.linearRampToValueAtTime(0.0001, when + realDur)
  src.connect(hp).connect(presence).connect(g).connect(out)
  src.start(when, quack.offset, quack.duration)
  src.stop(when + realDur + 0.03)
}

// small pitch wobble so repeated quacks don't sound mechanical
const jitter = () => 1 + (Math.random() - 0.5) * 0.06
const q = (i: number): Quack => duckQuacks[i % duckQuacks.length]

const duck: ThemeVoice = {
  play(ctx, out, kind, when) {
    void loadDuck(ctx) // kick off decoding if needed
    if (!duckBuffer || duckQuacks.length === 0) {
      duckSynth.play(ctx, out, kind, when) // not decoded yet
      return
    }
    switch (kind) {
      case 'tick':
        // rotate through the quacks so the 3-2-1 beeps each sound different
        playQuack(ctx, out, when, q(tickTurn++), 1.12 * jitter(), 0.72)
        break
      case 'go':
        // excited double-quack from two different ducks
        playQuack(ctx, out, when, q(0), 1.0 * jitter())
        playQuack(ctx, out, when + 0.15, q(1), 1.1 * jitter())
        break
      case 'rest':
        // a single lower, calmer quack
        playQuack(ctx, out, when, q(2), 0.85 * jitter(), 0.82)
        break
      case 'done':
        // rising triple of distinct quacks
        playQuack(ctx, out, when, q(0), 0.98)
        playQuack(ctx, out, when + 0.18, q(1), 1.1)
        playQuack(ctx, out, when + 0.36, q(2), 1.24)
        break
      case 'celebrate':
        // a whole flock quacking happily together
        for (let i = 0; i < 11; i++) {
          const t = i * 0.09 + Math.random() * 0.04
          playQuack(ctx, out, when + t, q(i), (0.85 + Math.random() * 0.5) * jitter(), 0.85)
        }
        break
    }
  },
}

const THEMES: Record<SoundTheme, ThemeVoice> = {
  beeps,
  piano,
  'piano-warm': pianoWarm,
  'piano-bright': pianoBright,
  marimba,
  bells,
  chiptune,
  cow,
  bird,
  duck,
}

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

  /** Big thematic flourish for finishing a whole session. */
  celebrate(): void {
    const ctx = this.ensure()
    const fire = () => {
      if (this.theme === 'duck' && !duckBuffer) {
        void loadDuck(ctx).then(() => this.play('celebrate', ctx.currentTime + 0.05))
      } else {
        this.play('celebrate', ctx.currentTime + 0.05)
      }
    }
    // the workout may have suspended the context on unmount; resume first
    if (ctx.state === 'suspended') void ctx.resume().then(fire)
    else fire()
  }
}

export const soundEngine = new SoundEngine()
