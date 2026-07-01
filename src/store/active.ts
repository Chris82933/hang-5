import { create } from 'zustand'
import type { Program, SessionLog } from '../types'

/** Ephemeral state for the run currently being configured / executed. */
interface ActiveState {
  program: Program | null
  lastLog: SessionLog | null
  setProgram: (p: Program) => void
  setLastLog: (l: SessionLog) => void
}

export const useActive = create<ActiveState>((set) => ({
  program: null,
  lastLog: null,
  setProgram: (program) => set({ program }),
  setLastLog: (lastLog) => set({ lastLog }),
}))
