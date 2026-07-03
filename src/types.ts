// ---- Grip configuration ----------------------------------------------------

export type EdgeType = 'wood' | 'metal' | 'textured' | 'pocket'
export type HandPosition =
  | 'full-crimp'
  | 'half-crimp'
  | 'drag'
  | 'open-hand'
  | 'sloper'
  | 'pinch'
  // pocket / partial-finger grips
  | 'front-3'
  | 'back-3'
  | 'front-2'
  | 'back-2'
  | 'middle-2'
  // compound finger + style grips (e.g. Abrahamsson routine)
  | 'three-finger-drag'
  | 'front-2-drag'
  | 'middle-2-drag'
  | 'front-2-crimp'
  | 'middle-2-crimp'

export interface GripConfig {
  edgeSizeMm: number
  edgeType: EdgeType
  fingers: number // number of fingers used (1-4)
  handPosition: HandPosition
}

// ---- Programs --------------------------------------------------------------

export type ProgramKind = 'repeaters' | 'max-hang' | 'custom'

/**
 * A program is described by a small set of interval parameters. `buildSegments`
 * expands these into a flat timeline the engine can run — the same shape works
 * for repeaters, max hangs and anything a user builds themselves.
 */
export interface ProgramParams {
  prepSecs: number // countdown before the very first hang
  sets: number
  repsPerSet: number
  hangSecs: number
  restSecs: number // rest between reps within a set
  restBetweenSetsSecs: number

  /**
   * Optional progressive loading. When enabled, each set adds weight on top of
   * the previous — starting light to warm the tendons up and build safely.
   * Weight is a plain number in the user's chosen unit (see settings). Negative
   * values model assisted (removed) weight.
   */
  weighted?: boolean
  /**
   * How added weight is handled when `weighted`:
   *  - 'progressive': a structured ramp (startWeight + weightStep per set)
   *  - 'manual': no structure — the user dials the load in live during the
   *    session (for people who just want to load a plate and go)
   * Defaults to 'progressive' for backwards compatibility.
   */
  weightMode?: 'progressive' | 'manual'
  startWeight?: number // added weight on the first set (0 = bodyweight)
  weightStep?: number // added per subsequent set

  /**
   * Per-program hand mode: true = single-hand lifts (one hand at a time),
   * false = two-handed hangs. When undefined, falls back to the global setting.
   */
  unilateral?: boolean
}

/**
 * One block of an advanced routine: a run of identical hangs on a given hold.
 * A program with a non-empty `sequence` is "advanced" and ignores the
 * sets/reps/hang/rest in `params` (prep + grip edge still apply).
 */
export interface SetBlock {
  handPosition: HandPosition
  reps: number
  hangSecs: number
  restSecs: number
}

export interface Program {
  id: string
  name: string
  kind: ProgramKind
  description: string
  params: ProgramParams
  grip: GripConfig
  /** advanced routines: different holds per block (e.g. Abrahamsson) */
  sequence?: SetBlock[]
  builtIn?: boolean
}

// ---- Timeline segments -----------------------------------------------------

export type SegmentType = 'prep' | 'hang' | 'rest' | 'rest-set' | 'switch' | 'done'

export type Hand = 'L' | 'R'

export interface Segment {
  type: SegmentType
  durationSecs: number
  label: string
  setIndex: number // 1-based; 0 for prep/done
  repIndex: number // 1-based within set; 0 when N/A
  /** total reps in this set, for progress display */
  repsInSet: number
  /** target added weight for this segment (weighted programs only) */
  targetWeight?: number
  /** which hand this hang is for (single-hand / unilateral mode) */
  hand?: Hand
  /** the hold/position for this hang (used by multi-hold routines) */
  hold?: HandPosition
}

/** Options that change how a program expands into a timeline (from settings). */
export interface BuildOptions {
  unilateral?: boolean // one hand at a time, alternating L/R
  switchSecs?: number // rest to swap hands between L and R
}

// ---- Session history -------------------------------------------------------

export interface SessionLog {
  id?: number
  date: number // epoch ms
  programId: string
  programName: string
  grip: GripConfig
  plannedSets: number
  completedSets: number
  completedReps: number
  totalHangSecs: number
  rpe?: number // 1-10 perceived effort
  notes?: string

  /** Weighted-session tracking. `topWeight` is the heaviest load completed. */
  weighted?: boolean
  topWeight?: number
  weightUnit?: WeightUnit
}

export type WeightUnit = 'kg' | 'lb'
