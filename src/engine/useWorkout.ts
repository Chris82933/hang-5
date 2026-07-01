import { useCallback, useEffect, useRef, useState } from 'react'
import type { Program, Segment, SegmentType } from '../types'
import { buildSegments } from './segments'
import { soundEngine, type CueKind } from './audio'
import { useSettings } from '../store/settings'

const LOOKAHEAD = 0.1 // seconds of audio to schedule ahead
const SCHED_INTERVAL = 25 // ms between scheduler ticks

interface AudioEvent {
  at: number // elapsed seconds from timeline origin
  kind: CueKind
}

export interface WorkoutState {
  status: 'idle' | 'running' | 'paused' | 'done'
  segType: SegmentType
  label: string
  secondsRemaining: number
  setIndex: number
  repIndex: number
  repsInSet: number
  totalSets: number
  segIndex: number
  totalSegments: number
  progress: number // 0..1 through the whole workout
  targetWeight?: number // weighted programs: added load for the current hang
  hand?: 'L' | 'R' // single-hand mode: which hand the current hang is for
}

/**
 * Runs a program. The visual timeline runs off a wall clock; audio cues are
 * scheduled alongside it on the AudioContext clock so they stay matched without
 * the timer depending on audio being unlocked.
 */
export function useWorkout(program: Program) {
  const keepAwake = useSettings((s) => s.keepAwake)
  const unilateral = useSettings((s) => s.unilateral)
  const switchSecs = useSettings((s) => s.switchSecs)

  const segments = useRef<Segment[]>([])
  const segStart = useRef<number[]>([]) // elapsed at which each segment starts
  const totalDuration = useRef(0)
  const events = useRef<AudioEvent[]>([])
  const eventIdx = useRef(0)
  const origin = useRef(0) // performance.now() (ms) corresponding to elapsed=0
  const pausedElapsed = useRef(0)
  const schedTimer = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  const [state, setState] = useState<WorkoutState>({
    status: 'idle',
    segType: 'prep',
    label: '',
    secondsRemaining: 0,
    setIndex: 0,
    repIndex: 0,
    repsInSet: 0,
    totalSets: program.params.sets,
    segIndex: 0,
    totalSegments: 0,
    progress: 0,
  })

  // Build the timeline + audio event list from the program (pure, memo-ish).
  const rebuild = useCallback(() => {
    const segs = buildSegments(program, { unilateral, switchSecs })
    const starts: number[] = []
    let acc = 0
    for (const s of segs) {
      starts.push(acc)
      acc += s.durationSecs
    }
    segments.current = segs
    segStart.current = starts
    totalDuration.current = acc

    const evs: AudioEvent[] = []
    segs.forEach((s, i) => {
      const start = starts[i]
      if (s.type === 'hang') {
        // 3-2-1 countdown ticks leading into the hang
        for (let k = 3; k >= 1; k--) {
          const at = start - k
          if (at >= 0) evs.push({ at, kind: 'tick' })
        }
        evs.push({ at: start, kind: 'go' })
        // relax cue at the end of the hang, unless the workout ends here
        const next = segs[i + 1]
        if (next && next.type !== 'done') {
          evs.push({ at: start + s.durationSecs, kind: 'rest' })
        }
      }
      if (s.type === 'done') {
        evs.push({ at: start, kind: 'done' })
      }
    })
    evs.sort((a, b) => a.at - b.at)
    events.current = evs
  }, [program, unilateral, switchSecs])

  // The visual timeline runs off a wall clock (performance.now) so it never
  // depends on the AudioContext being unlocked. `origin` is the perf timestamp
  // (ms) corresponding to elapsed = 0.
  const elapsedNow = useCallback(() => {
    return (performance.now() - origin.current) / 1000
  }, [])

  /** Current segment index from elapsed time (independent of render state). */
  const currentIndex = useCallback(() => {
    const elapsed = elapsedNow()
    const starts = segStart.current
    let i = starts.length - 1
    while (i > 0 && starts[i] > elapsed) i--
    return i
  }, [elapsedNow])

  const scheduleAudio = useCallback(() => {
    const el = elapsedNow()
    const horizon = el + LOOKAHEAD
    const evs = events.current
    while (eventIdx.current < evs.length && evs[eventIdx.current].at <= horizon) {
      const ev = evs[eventIdx.current]
      // anchor the cue to the audio clock at scheduling time so it lands in
      // step with the wall-clock visual, sample-accurately
      soundEngine.play(ev.kind, soundEngine.now() + Math.max(0, ev.at - el))
      eventIdx.current++
    }
  }, [elapsedNow])

  const stopLoops = useCallback(() => {
    if (schedTimer.current !== null) {
      clearInterval(schedTimer.current)
      schedTimer.current = null
    }
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
  }, [])

  const releaseWake = useCallback(() => {
    void wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
  }, [])

  const finish = useCallback(() => {
    stopLoops()
    releaseWake()
    setState((s) => ({ ...s, status: 'done', progress: 1, secondsRemaining: 0 }))
  }, [stopLoops, releaseWake])

  // Compute the current frame and push it to state. Called from both the rAF
  // loop (smooth, frame-accurate when visible) and the scheduler interval (a
  // backstop that keeps the countdown moving even when rAF is throttled, e.g.
  // the screen dims or the tab is briefly hidden).
  const render = useCallback(() => {
    const elapsed = elapsedNow()
    if (elapsed >= totalDuration.current) {
      finish()
      return
    }
    const starts = segStart.current
    let i = starts.length - 1
    while (i > 0 && starts[i] > elapsed) i--
    const seg = segments.current[i]
    const remaining = Math.max(0, starts[i] + seg.durationSecs - elapsed)
    setState((prev) => {
      const secondsRemaining = Math.ceil(remaining)
      if (prev.segIndex === i && prev.secondsRemaining === secondsRemaining) return prev
      return {
        ...prev,
        segType: seg.type,
        label: seg.label,
        secondsRemaining,
        setIndex: seg.setIndex,
        repIndex: seg.repIndex,
        repsInSet: seg.repsInSet,
        segIndex: i,
        totalSegments: segments.current.length,
        progress: elapsed / totalDuration.current,
        targetWeight: seg.targetWeight,
        hand: seg.hand,
      }
    })
  }, [elapsedNow, finish])

  const tick = useCallback(() => {
    scheduleAudio()
    render()
  }, [scheduleAudio, render])

  const rafLoop = useCallback(() => {
    render()
    rafId.current = requestAnimationFrame(rafLoop)
  }, [render])

  const startLoops = useCallback(() => {
    stopLoops()
    schedTimer.current = window.setInterval(tick, SCHED_INTERVAL)
    rafId.current = requestAnimationFrame(rafLoop)
  }, [tick, rafLoop, stopLoops])

  const requestWake = useCallback(async () => {
    if (!keepAwake) return
    try {
      wakeLock.current = await navigator.wakeLock?.request('screen')
    } catch {
      /* wake lock unsupported / denied — non-fatal */
    }
  }, [keepAwake])

  const start = useCallback(async () => {
    rebuild()
    // Unlock audio from the user gesture, but never let it block the timer.
    try {
      await soundEngine.unlock()
    } catch {
      /* audio unavailable — visuals still run */
    }
    origin.current = performance.now() + 150 // tiny lead-in
    eventIdx.current = 0
    void requestWake()
    setState((s) => ({ ...s, status: 'running' }))
    startLoops()
  }, [rebuild, requestWake, startLoops])

  const pause = useCallback(() => {
    if (state.status !== 'running') return
    pausedElapsed.current = elapsedNow()
    soundEngine.suspend()
    stopLoops()
    setState((s) => ({ ...s, status: 'paused' }))
  }, [state.status, elapsedNow, stopLoops])

  const resume = useCallback(async () => {
    if (state.status !== 'paused') return
    try {
      await soundEngine.unlock()
    } catch {
      /* ignore */
    }
    origin.current = performance.now() - pausedElapsed.current * 1000
    setState((s) => ({ ...s, status: 'running' }))
    startLoops()
  }, [state.status, startLoops])

  const jumpTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, segments.current.length - 1))
    const at = segStart.current[clamped]
    origin.current = performance.now() - at * 1000
    // move the event pointer to the first event at/after this segment
    let idx = 0
    while (idx < events.current.length && events.current[idx].at < at) idx++
    eventIdx.current = idx
  }, [])

  // Skip uses the live elapsed-derived index so rapid taps advance correctly.
  const skipNext = useCallback(() => jumpTo(currentIndex() + 1), [jumpTo, currentIndex])
  const skipPrev = useCallback(() => jumpTo(currentIndex() - 1), [jumpTo, currentIndex])

  const stop = useCallback(() => {
    stopLoops()
    releaseWake()
    soundEngine.suspend()
    setState((s) => ({ ...s, status: 'idle' }))
  }, [stopLoops, releaseWake])

  /** How much was actually completed, for the session log. */
  const summary = useCallback(() => {
    const elapsed = state.status === 'done' ? totalDuration.current : elapsedNow()
    let completedReps = 0
    let hangSecs = 0
    let topWeight: number | undefined
    segments.current.forEach((s, i) => {
      if (s.type === 'hang' && segStart.current[i] + s.durationSecs <= elapsed + 0.01) {
        completedReps++
        hangSecs += s.durationSecs
        if (s.targetWeight != null) {
          topWeight = topWeight == null ? s.targetWeight : Math.max(topWeight, s.targetWeight)
        }
      }
    })
    // in single-hand mode each rep is two hangs (L + R)
    const hangsPerRep = (unilateral ? 2 : 1) * (program.params.repsPerSet || 1)
    return {
      completedReps,
      completedSets: Math.floor(completedReps / hangsPerRep),
      totalHangSecs: Math.round(hangSecs),
      topWeight,
    }
  }, [state.status, elapsedNow, program.params.repsPerSet, unilateral])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoops()
      releaseWake()
      soundEngine.suspend()
    }
  }, [stopLoops, releaseWake])

  // re-acquire wake lock if the tab becomes visible again mid-workout
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && state.status === 'running') {
        void requestWake()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [state.status, requestWake])

  return { state, start, pause, resume, stop, skipNext, skipPrev, summary }
}
