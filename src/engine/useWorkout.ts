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
}

/**
 * Runs a program. Audio cues and the on-screen colour/countdown are both driven
 * off `soundEngine.now()` (the AudioContext clock), so they stay perfectly
 * matched. Pause suspends that clock; skip shifts the timeline origin.
 */
export function useWorkout(program: Program) {
  const keepAwake = useSettings((s) => s.keepAwake)

  const segments = useRef<Segment[]>([])
  const segStart = useRef<number[]>([]) // elapsed at which each segment starts
  const totalDuration = useRef(0)
  const events = useRef<AudioEvent[]>([])
  const eventIdx = useRef(0)
  const origin = useRef(0) // ctx time corresponding to elapsed=0
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
    const segs = buildSegments(program)
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
  }, [program])

  const elapsedNow = useCallback(() => {
    return soundEngine.now() - origin.current
  }, [])

  const scheduler = useCallback(() => {
    const horizon = elapsedNow() + LOOKAHEAD
    const evs = events.current
    while (eventIdx.current < evs.length && evs[eventIdx.current].at <= horizon) {
      const ev = evs[eventIdx.current]
      soundEngine.play(ev.kind, origin.current + ev.at)
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

  const tickVisual = useCallback(() => {
    const elapsed = elapsedNow()
    if (elapsed >= totalDuration.current) {
      finish()
      return
    }
    // find current segment
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
      }
    })
    rafId.current = requestAnimationFrame(tickVisual)
  }, [elapsedNow, finish])

  const startLoops = useCallback(() => {
    stopLoops()
    schedTimer.current = window.setInterval(scheduler, SCHED_INTERVAL)
    rafId.current = requestAnimationFrame(tickVisual)
  }, [scheduler, tickVisual, stopLoops])

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
    await soundEngine.unlock()
    origin.current = soundEngine.now() + 0.15 // tiny lead-in
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
    await soundEngine.unlock() // resumes the ctx; currentTime continues from pause
    setState((s) => ({ ...s, status: 'running' }))
    startLoops()
  }, [state.status, startLoops])

  const jumpTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, segments.current.length - 1))
      origin.current = soundEngine.now() - segStart.current[clamped]
      // move the event pointer to the first event at/after this segment
      const at = segStart.current[clamped]
      let idx = 0
      while (idx < events.current.length && events.current[idx].at < at) idx++
      eventIdx.current = idx
    },
    [],
  )

  const skipNext = useCallback(() => jumpTo(state.segIndex + 1), [jumpTo, state.segIndex])
  const skipPrev = useCallback(() => jumpTo(state.segIndex - 1), [jumpTo, state.segIndex])

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
    segments.current.forEach((s, i) => {
      if (s.type === 'hang' && segStart.current[i] + s.durationSecs <= elapsed + 0.01) {
        completedReps++
        hangSecs += s.durationSecs
      }
    })
    const rps = program.params.repsPerSet || 1
    return {
      completedReps,
      completedSets: Math.floor(completedReps / rps),
      totalHangSecs: Math.round(hangSecs),
    }
  }, [state.status, elapsedNow, program.params.repsPerSet])

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
