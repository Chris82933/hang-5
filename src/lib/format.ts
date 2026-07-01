import type { GripConfig, HandPosition, Program } from '../types'
import { totalDurationSecs } from '../engine/segments'

const HAND_LABELS: Record<HandPosition, string> = {
  'full-crimp': 'Full crimp',
  'half-crimp': 'Half crimp',
  drag: 'Drag',
  'open-hand': 'Open hand',
  sloper: 'Sloper',
  pinch: 'Pinch',
}

export function handLabel(h: HandPosition): string {
  return HAND_LABELS[h]
}

export function gripSummary(g: GripConfig): string {
  return `${g.edgeSizeMm}mm ${g.edgeType} · ${g.fingers}f · ${HAND_LABELS[g.handPosition]}`
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
  return `${sets} set${sets > 1 ? 's' : ''} · ${reps} · ~${fmtDuration(totalDurationSecs(p))}`
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
