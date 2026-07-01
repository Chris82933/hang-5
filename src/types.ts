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
}
