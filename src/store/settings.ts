import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { WeightUnit } from '../types'

export type ThemeMode = 'dark' | 'light'
export type SoundTheme = 'beeps' | 'piano' | 'duck'

export interface CueColors {
  prep: string
  hang: string
  rest: string
  done: string
}

export const DEFAULT_CUE_COLORS: CueColors = {
  prep: '#F5A623', // amber
  hang: '#00C853', // green — go
  rest: '#2979FF', // blue
  done: '#03DAC6', // secondary teal
}

interface SettingsState {
  themeMode: ThemeMode
  soundTheme: SoundTheme
  volume: number // 0..1
  keepAwake: boolean
  cueColors: CueColors
  weightUnit: WeightUnit
  setThemeMode: (m: ThemeMode) => void
  setSoundTheme: (s: SoundTheme) => void
  setVolume: (v: number) => void
  setKeepAwake: (b: boolean) => void
  setCueColor: (key: keyof CueColors, color: string) => void
  resetCueColors: () => void
  setWeightUnit: (u: WeightUnit) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark', // default to dark per spec
      soundTheme: 'beeps',
      volume: 0.8,
      keepAwake: true,
      cueColors: DEFAULT_CUE_COLORS,
      weightUnit: 'kg',
      setThemeMode: (themeMode) => set({ themeMode }),
      setSoundTheme: (soundTheme) => set({ soundTheme }),
      setVolume: (volume) => set({ volume }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setCueColor: (key, color) =>
        set((s) => ({ cueColors: { ...s.cueColors, [key]: color } })),
      resetCueColors: () => set({ cueColors: DEFAULT_CUE_COLORS }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
    }),
    { name: 'hangboard-settings' },
  ),
)
