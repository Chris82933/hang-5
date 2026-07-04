import type { Program, GripConfig } from '../types'

const defaultGrip: GripConfig = {
  edgeSizeMm: 20,
  edgeType: 'wood',
  fingers: 4,
  handPosition: 'half-crimp',
}

const maxHangGrip: GripConfig = {
  edgeSizeMm: 20,
  edgeType: 'wood',
  fingers: 4,
  handPosition: 'half-crimp',
}

/**
 * Built-in programs, drawn from common hangboard protocols. These are seeds —
 * a user can duplicate and tweak any of them.
 */
export const PRESET_PROGRAMS: Program[] = [
  {
    id: 'repeaters-7-3',
    name: '7:3 Repeaters',
    kind: 'repeaters',
    description: '6 reps of 7s hang / 3s rest, 6 sets. Classic strength-endurance.',
    builtIn: true,
    grip: defaultGrip,
    params: {
      prepSecs: 15,
      sets: 6,
      repsPerSet: 6,
      hangSecs: 7,
      restSecs: 3,
      restBetweenSetsSecs: 180,
    },
  },
  {
    id: 'repeaters-5-5',
    name: '5:5 Repeaters',
    kind: 'repeaters',
    description: '6 reps of 5s hang / 5s rest, 6 sets. Gentler work:rest ratio.',
    builtIn: true,
    grip: defaultGrip,
    params: {
      prepSecs: 15,
      sets: 6,
      repsPerSet: 6,
      hangSecs: 5,
      restSecs: 5,
      restBetweenSetsSecs: 180,
    },
  },
  {
    id: 'repeaters-10-5',
    name: '10:5 Repeaters',
    kind: 'repeaters',
    description: '5 reps of 10s hang / 5s rest, 5 sets. Longer time-under-tension.',
    builtIn: true,
    grip: defaultGrip,
    params: {
      prepSecs: 15,
      sets: 5,
      repsPerSet: 5,
      hangSecs: 10,
      restSecs: 5,
      restBetweenSetsSecs: 180,
    },
  },
  {
    id: 'weighted-max-hangs',
    name: 'Weighted Max Hangs',
    kind: 'max-hang',
    description:
      'Progressive load: 8 sets of 10s hangs starting at bodyweight and adding weight each set to build safely.',
    builtIn: true,
    grip: maxHangGrip,
    params: {
      prepSecs: 15,
      sets: 8,
      repsPerSet: 1,
      hangSecs: 10,
      restSecs: 0,
      restBetweenSetsSecs: 180,
      weighted: true,
      weightMode: 'progressive',
      startWeight: 0, // first two sets are warm-up at bodyweight
      weightStep: 5,
    },
  },
  {
    id: 'weighted-repeaters-7-3',
    name: 'Weighted 7:3 Repeaters',
    kind: 'repeaters',
    description:
      'Strength-endurance with a warm-up ramp: 5 sets of 6×7:3, adding weight each set from bodyweight.',
    builtIn: true,
    grip: defaultGrip,
    params: {
      prepSecs: 15,
      sets: 5,
      repsPerSet: 6,
      hangSecs: 7,
      restSecs: 3,
      restBetweenSetsSecs: 180,
      weighted: true,
      weightMode: 'progressive',
      startWeight: 0,
      weightStep: 2.5,
    },
  },
  {
    id: 'abrahamsson-daily',
    name: 'Abrahamsson Daily',
    kind: 'repeaters',
    description:
      'Emil Abrahamsson’s low-intensity daily routine: 20 × 10s hangs / 20s rest, cycling through six holds. Bodyweight, no failure.',
    builtIn: true,
    grip: { edgeSizeMm: 20, edgeType: 'wood', fingers: 4, handPosition: 'half-crimp' },
    params: {
      prepSecs: 15,
      sets: 6,
      repsPerSet: 6,
      hangSecs: 10,
      restSecs: 20,
      restBetweenSetsSecs: 20,
    },
    sequence: [
      { handPosition: 'half-crimp', reps: 6, hangSecs: 10, restSecs: 20 },
      { handPosition: 'three-finger-drag', reps: 6, hangSecs: 10, restSecs: 20 },
      { handPosition: 'front-2-drag', reps: 2, hangSecs: 10, restSecs: 20 },
      { handPosition: 'middle-2-drag', reps: 2, hangSecs: 10, restSecs: 20 },
      { handPosition: 'front-2-crimp', reps: 2, hangSecs: 10, restSecs: 20 },
      { handPosition: 'middle-2-crimp', reps: 2, hangSecs: 10, restSecs: 20 },
    ],
  },
  {
    id: 'frequency-hangs',
    name: 'Frequency Hangs',
    kind: 'repeaters',
    description: 'Low-intensity 10s hang / 50s rest, 6 reps. Abrahamsson-style volume.',
    builtIn: true,
    grip: { ...defaultGrip, edgeSizeMm: 20 },
    params: {
      prepSecs: 15,
      sets: 1,
      repsPerSet: 6,
      hangSecs: 10,
      restSecs: 50,
      restBetweenSetsSecs: 0,
    },
  },
]

export function findPreset(id: string): Program | undefined {
  return PRESET_PROGRAMS.find((p) => p.id === id)
}
