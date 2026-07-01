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
    id: 'max-hangs',
    name: 'Max Hangs',
    kind: 'max-hang',
    description: '10s near-maximal hangs, 5 sets, 3 min rest. Pure finger strength.',
    builtIn: true,
    grip: maxHangGrip,
    params: {
      prepSecs: 15,
      sets: 5,
      repsPerSet: 1,
      hangSecs: 10,
      restSecs: 0,
      restBetweenSetsSecs: 180,
    },
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
