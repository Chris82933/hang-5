import type { GripConfig, HandPosition, Program, WeightUnit } from '../types'

const HAND_LABELS: Record<HandPosition, string> = {
  'full-crimp': 'Full crimp',
  'half-crimp': 'Half crimp',
  drag: 'Drag',
  'open-hand': 'Open hand',
  sloper: 'Sloper',
  pinch: 'Pinch',
  'front-3': 'Front 3',
  'back-3': 'Back 3',
  'front-2': 'Front 2',
  'back-2': 'Back 2',
  'middle-2': 'Middle 2',
}

export function handLabel(h: HandPosition): string {
  return HAND_LABELS[h]
}

export function gripSummary(g: GripConfig): string {
  return `${g.edgeSizeMm}mm ${g.edgeType} · ${HAND_LABELS[g.handPosition]}`
}

export function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export function programSummary(p: Program): string {
  const { sets, repsPerSet, hangSecs, restSecs } = p.params
  const reps = repsPerSet > 1 ? `${repsPerSet}×${hangSecs}:${restSecs}` : `${hangSecs}s hang`
  return `${sets} set${sets > 1 ? 's' : ''} · ${reps}`
}

/** Format an added-weight value: bodyweight, +N, or -N (assisted). */
export function fmtWeight(n: number, unit: WeightUnit): string {
  const v = Math.round(n * 10) / 10
  if (v === 0) return 'Bodyweight'
  const sign = v > 0 ? '+' : '−'
  return `${sign}${Math.abs(v)} ${unit}`
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
