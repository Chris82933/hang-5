// ---- Grip configuration ----------------------------------------------------

export type EdgeType = 'wood' | 'metal' | 'textured' | 'pocket'
export type HandPosition =
  | 'full-crimp'
  | 'half-crimp'
  | 'drag'
  | 'open-hand'
  | 'sloper'
  | 'pinch'

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
  startWeight?: number // added weight on the first set (0 = bodyweight)
  weightStep?: number // added per subsequent set
}

export interface Program {
  id: string
  name: string
  kind: ProgramKind
  description: string
  params: ProgramParams
  grip: GripConfig
  builtIn?: boolean
}

// ---- Timeline segments -----------------------------------------------------

export type SegmentType = 'prep' | 'hang' | 'rest' | 'rest-set' | 'done'

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
