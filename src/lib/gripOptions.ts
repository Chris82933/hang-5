import type { EdgeType, HandPosition } from '../types'

export const EDGE_TYPES: { value: EdgeType; label: string }[] = [
  { value: 'wood', label: 'Wood' },
  { value: 'metal', label: 'Metal' },
  { value: 'textured', label: 'Textured' },
  { value: 'pocket', label: 'Pocket' },
]

export const HAND_POSITIONS: { value: HandPosition; label: string }[] = [
  { value: 'half-crimp', label: 'Half crimp' },
  { value: 'full-crimp', label: 'Full crimp' },
  { value: 'open-hand', label: 'Open hand' },
  { value: 'drag', label: 'Drag' },
  { value: 'sloper', label: 'Sloper' },
  { value: 'pinch', label: 'Pinch' },
  // pocket / partial-finger grips
  { value: 'front-3', label: 'Front 3' },
  { value: 'back-3', label: 'Back 3' },
  { value: 'front-2', label: 'Front 2' },
  { value: 'back-2', label: 'Back 2' },
  { value: 'middle-2', label: 'Middle 2' },
]
