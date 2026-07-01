import { useCallback, useEffect, useState } from 'react'
import type { Program } from '../types'
import { PRESET_PROGRAMS, findPreset } from './presets'
import { getCustomPrograms, db } from './db'

/** Loads built-in + user programs and keeps them in sync with IndexedDB. */
export function usePrograms() {
  const [custom, setCustom] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setCustom(await getCustomPrograms())
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { presets: PRESET_PROGRAMS, custom, loading, reload }
}

/** Resolve a program id from presets first, then IndexedDB. */
export async function resolveProgram(id: string): Promise<Program | undefined> {
  return findPreset(id) ?? (await db.programs.get(id))
}
