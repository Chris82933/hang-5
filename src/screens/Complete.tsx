import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActive } from '../store/active'
import { saveSession } from '../data/db'
import { fmtDuration, gripSummary } from '../lib/format'

export default function Complete() {
  const nav = useNavigate()
  const log = useActive((s) => s.lastLog)
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!log) nav('/', { replace: true })
  }, [log, nav])

  if (!log) return null

  const save = async () => {
    await saveSession({ ...log, rpe, notes: notes.trim() || undefined })
    nav('/history', { replace: true })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Nice work 💪</h1>
          <div className="sub">{log.programName}</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="n">{log.completedReps}</div>
          <div className="l">reps</div>
        </div>
        <div className="stat">
          <div className="n">{log.completedSets}</div>
          <div className="l">sets done</div>
        </div>
        <div className="stat">
          <div className="n">{fmtDuration(log.totalHangSecs)}</div>
          <div className="l">time on</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>
        {gripSummary(log.grip)}
      </div>

      <div className="section-label">How hard did it feel? (RPE)</div>
      <div className="rpe-dots">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={rpe === n ? 'active' : ''} onClick={() => setRpe(n)}>
            {n}
          </button>
        ))}
      </div>

      <div className="section-label">Notes</div>
      <div className="field" style={{ borderBottom: 'none', padding: 0 }}>
        <textarea
          rows={3}
          placeholder="How did the session go?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn primary block lg" onClick={save}>
          Save to history
        </button>
        <button className="btn block" onClick={() => nav('/', { replace: true })}>
          Discard
        </button>
      </div>
    </div>
  )
}
