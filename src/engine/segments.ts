import type { BuildOptions, HandPosition, Program, ProgramParams, Segment } from '../types'

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

export function isAdvanced(program: Program): boolean {
  return !!program.sequence && program.sequence.length > 0
}

/** The number of "sets" (blocks for advanced routines) in a program. */
export function programSetCount(program: Program): number {
  return isAdvanced(program) ? program.sequence!.length : program.params.sets
}

/** Distinct holds a program uses, in order of first appearance. */
export function programHolds(program: Program): HandPosition[] {
  if (isAdvanced(program)) {
    const seen: HandPosition[] = []
    for (const b of program.sequence!) if (!seen.includes(b.handPosition)) seen.push(b.handPosition)
    return seen
  }
  return [program.grip.handPosition]
}

/**
 * Expand a program into a flat timeline of segments. Handles simple programs
 * (sets/reps/hang/rest + one grip) and advanced routines (a `sequence` of
 * blocks, each on its own hold). Unilateral mode splits each hang into L/R.
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

  const addHang = (a: {
    setIndex: number
    repIndex: number
    repsInSet: number
    hangSecs: number
    hold?: HandPosition
    weight?: number
  }) => {
    if (unilateral) {
      segments.push({
        type: 'hang', durationSecs: a.hangSecs, label: 'LEFT',
        setIndex: a.setIndex, repIndex: a.repIndex, repsInSet: a.repsInSet,
        targetWeight: a.weight, hold: a.hold, hand: 'L',
      })
      segments.push({
        type: 'switch', durationSecs: switchSecs, label: 'Switch hands',
        setIndex: a.setIndex, repIndex: a.repIndex, repsInSet: a.repsInSet,
      })
      segments.push({
        type: 'hang', durationSecs: a.hangSecs, label: 'RIGHT',
        setIndex: a.setIndex, repIndex: a.repIndex, repsInSet: a.repsInSet,
        targetWeight: a.weight, hold: a.hold, hand: 'R',
      })
    } else {
      segments.push({
        type: 'hang', durationSecs: a.hangSecs, label: 'HANG',
        setIndex: a.setIndex, repIndex: a.repIndex, repsInSet: a.repsInSet,
        targetWeight: a.weight, hold: a.hold,
      })
    }
  }

  const addRest = (
    type: 'rest' | 'rest-set',
    durationSecs: number,
    setIndex: number,
    repIndex: number,
    repsInSet: number,
  ) => {
    if (durationSecs > 0) {
      segments.push({ type, durationSecs, label: type === 'rest-set' ? 'Set rest' : 'Rest', setIndex, repIndex, repsInSet })
    }
  }

  if (isAdvanced(program)) {
    // advanced: one block per hold, uniform rest between every hang
    const seq = program.sequence!
    const totalHangs = seq.reduce((n, b) => n + b.reps, 0)
    let done = 0
    seq.forEach((block, bi) => {
      for (let rep = 1; rep <= block.reps; rep++) {
        addHang({
          setIndex: bi + 1,
          repIndex: rep,
          repsInSet: block.reps,
          hangSecs: block.hangSecs,
          hold: block.handPosition,
        })
        done++
        if (done < totalHangs) addRest('rest', block.restSecs, bi + 1, rep, block.reps)
      }
    })
  } else {
    for (let set = 1; set <= p.sets; set++) {
      for (let rep = 1; rep <= p.repsPerSet; rep++) {
        addHang({
          setIndex: set,
          repIndex: rep,
          repsInSet: p.repsPerSet,
          hangSecs: p.hangSecs,
          hold: program.grip.handPosition,
          weight: p.weighted ? setWeight(p, set) : undefined,
        })
        const isLastRepOfSet = rep === p.repsPerSet
        const isLastSet = set === p.sets
        if (isLastRepOfSet) {
          if (!isLastSet) addRest('rest-set', p.restBetweenSetsSecs, set, rep, p.repsPerSet)
        } else {
          addRest('rest', p.restSecs, set, rep, p.repsPerSet)
        }
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
  if (isAdvanced(program)) {
    const base = program.sequence!.reduce((n, b) => n + b.reps * b.hangSecs, 0)
    return base * handsPerRep(opts)
  }
  const p = program.params
  return p.sets * p.repsPerSet * p.hangSecs * handsPerRep(opts)
}

/** Total wall-clock duration of a program, in seconds. */
export function totalDurationSecs(program: Program, opts: BuildOptions = {}): number {
  return buildSegments(program, opts).reduce((sum, s) => sum + s.durationSecs, 0)
}
