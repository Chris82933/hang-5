import Dexie, { type Table } from 'dexie'
import type { Program, SessionLog } from '../types'

/**
 * Local-first storage. Custom programs and session history live in IndexedDB
 * so they survive reloads and work fully offline. (Google Drive sync is a
 * later phase and will layer on top of this.)
 */
class HangboardDB extends Dexie {
  programs!: Table<Program, string>
  sessions!: Table<SessionLog, number>

  constructor() {
    super('hangboard')
    this.version(1).stores({
      programs: 'id, name, kind',
      sessions: '++id, date, programId',
    })
  }
}

export const db = new HangboardDB()

// ---- Custom programs -------------------------------------------------------

export async function getCustomPrograms(): Promise<Program[]> {
  return db.programs.toArray()
}

export async function saveProgram(program: Program): Promise<void> {
  await db.programs.put(program)
}

export async function deleteProgram(id: string): Promise<void> {
  await db.programs.delete(id)
}

// ---- Sessions --------------------------------------------------------------

export async function saveSession(log: SessionLog): Promise<number> {
  return db.sessions.add(log)
}

export async function getSessions(): Promise<SessionLog[]> {
  return db.sessions.orderBy('date').reverse().toArray()
}

export async function deleteSession(id: number): Promise<void> {
  await db.sessions.delete(id)
}
