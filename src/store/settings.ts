import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { WeightUnit } from '../types'

export type ThemeMode = 'dark' | 'light'
export type SoundTheme = 'beeps' | 'piano' | 'duck'

export interface CueColors {
  prep: string
  hang: string
  rest: string
  switch: string
  done: string
}

export const DEFAULT_CUE_COLORS: CueColors = {
  prep: '#F5A623', // amber
  hang: '#00C853', // green — go
  rest: '#2979FF', // blue
  switch: '#8E44FF', // purple — swap hands
  done: '#03DAC6', // teal
}

interface SettingsState {
  themeMode: ThemeMode
  soundTheme: SoundTheme
  volume: number // 0..1
  keepAwake: boolean
  cueColors: CueColors
  weightUnit: WeightUnit
  /** Single-hand / unilateral mode: alternate left & right, one hand at a time. */
  unilateral: boolean
  switchSecs: number // rest to swap hands
  setThemeMode: (m: ThemeMode) => void
  setSoundTheme: (s: SoundTheme) => void
  setVolume: (v: number) => void
  setKeepAwake: (b: boolean) => void
  setCueColor: (key: keyof CueColors, color: string) => void
  resetCueColors: () => void
  setWeightUnit: (u: WeightUnit) => void
  setUnilateral: (b: boolean) => void
  setSwitchSecs: (n: number) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark', // default to dark per spec
      soundTheme: 'piano',
      volume: 0.8,
      keepAwake: true,
      cueColors: DEFAULT_CUE_COLORS,
      weightUnit: 'kg',
      unilateral: false,
      switchSecs: 5,
      setThemeMode: (themeMode) => set({ themeMode }),
      setSoundTheme: (soundTheme) => set({ soundTheme }),
      setVolume: (volume) => set({ volume }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setCueColor: (key, color) =>
        set((s) => ({ cueColors: { ...s.cueColors, [key]: color } })),
      resetCueColors: () => set({ cueColors: DEFAULT_CUE_COLORS }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      setUnilateral: (unilateral) => set({ unilateral }),
      setSwitchSecs: (switchSecs) => set({ switchSecs }),
    }),
    {
      name: 'hangboard-settings',
      // Deep-merge so settings added in later versions (e.g. a new cue colour)
      // pick up their defaults instead of being dropped by an older saved blob.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        return {
          ...current,
          ...p,
          cueColors: { ...current.cueColors, ...(p.cueColors ?? {}) },
        }
      },
    },
  ),
)
