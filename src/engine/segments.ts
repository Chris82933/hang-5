import type { BuildOptions, Program, ProgramParams, Segment } from '../types'

const DEFAULT_SWITCH_SECS = 5

/** Added weight prescribed for a given set (1-based) of a weighted program. */
export function setWeight(p: ProgramParams, set: number): number {
  const start = p.startWeight ?? 0
  const step = p.weightStep ?? 0
  return start + (set - 1) * step
}

/** The heaviest set a weighted program builds up to. */
export function topWeight(p: ProgramParams): number {
  return setWeight(p, Math.max(1, p.sets))
}

/**
 * Expand a program's interval parameters into a flat timeline of segments.
 * Pure function — used by every program type (repeaters, max hang, custom).
 *
 * Structure per rep (bilateral):     [hang] [rest]
 * Structure per rep (unilateral):    [hang L] [switch] [hang R] [rest]
 * The last rep's rest is replaced by the between-set rest, or dropped at the end.
 */
export function buildSegments(program: Program, opts: BuildOptions = {}): Segment[] {
  const p = program.params
  const unilateral = !!opts.unilateral
  const switchSecs = opts.switchSecs ?? DEFAULT_SWITCH_SECS
  const segments: Segment[] = []

  if (p.prepSecs > 0) {
    segments.push({
      type: 'prep',
      durationSecs: p.prepSecs,
      label: 'Get ready',
      setIndex: 0,
      repIndex: 0,
      repsInSet: 0,
    })
  }

  for (let set = 1; set <= p.sets; set++) {
    for (let rep = 1; rep <= p.repsPerSet; rep++) {
      const weight = p.weighted ? setWeight(p, set) : undefined

      if (unilateral) {
        segments.push({
          type: 'hang',
          durationSecs: p.hangSecs,
          label: 'LEFT',
          setIndex: set,
          repIndex: rep,
          repsInSet: p.repsPerSet,
          targetWeight: weight,
          hand: 'L',
        })
        segments.push({
          type: 'switch',
          durationSecs: switchSecs,
          label: 'Switch hands',
          setIndex: set,
          repIndex: rep,
          repsInSet: p.repsPerSet,
        })
        segments.push({
          type: 'hang',
          durationSecs: p.hangSecs,
          label: 'RIGHT',
          setIndex: set,
          repIndex: rep,
          repsInSet: p.repsPerSet,
          targetWeight: weight,
          hand: 'R',
        })
      } else {
        segments.push({
          type: 'hang',
          durationSecs: p.hangSecs,
          label: 'HANG',
          setIndex: set,
          repIndex: rep,
          repsInSet: p.repsPerSet,
          targetWeight: weight,
        })
      }

      const isLastRepOfSet = rep === p.repsPerSet
      const isLastSet = set === p.sets

      if (isLastRepOfSet) {
        if (!isLastSet && p.restBetweenSetsSecs > 0) {
          segments.push({
            type: 'rest-set',
            durationSecs: p.restBetweenSetsSecs,
            label: 'Set rest',
            setIndex: set,
            repIndex: rep,
            repsInSet: p.repsPerSet,
          })
        }
      } else if (p.restSecs > 0) {
        segments.push({
          type: 'rest',
          durationSecs: p.restSecs,
          label: 'Rest',
          setIndex: set,
          repIndex: rep,
          repsInSet: p.repsPerSet,
        })
      }
    }
  }

  segments.push({
    type: 'done',
    durationSecs: 0,
    label: 'Done',
    setIndex: 0,
    repIndex: 0,
    repsInSet: 0,
  })

  return segments
}

/** Hang segments performed per rep: two (both hands) in unilateral mode. */
export function handsPerRep(opts: BuildOptions = {}): number {
  return opts.unilateral ? 2 : 1
}

/** Total working (hang) time a program prescribes, in seconds. */
export function totalHangSecs(program: Program, opts: BuildOptions = {}): number {
  const p = program.params
  return p.sets * p.repsPerSet * p.hangSecs * handsPerRep(opts)
}

/** Total wall-clock duration of a program, in seconds. */
export function totalDurationSecs(program: Program, opts: BuildOptions = {}): number {
  return buildSegments(program, opts).reduce((sum, s) => sum + s.durationSecs, 0)
}
