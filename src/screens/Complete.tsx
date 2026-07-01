import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActive } from '../store/active'
import { saveSession } from '../data/db'
import { Field, Stepper } from '../components/ui'
import { fmtDuration, fmtWeight, gripSummary } from '../lib/format'

export default function Complete() {
  const nav = useNavigate()
  const log = useActive((s) => s.lastLog)
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [topWeight, setTopWeight] = useState(log?.topWeight ?? 0)

  useEffect(() => {
    if (!log) nav('/', { replace: true })
  }, [log, nav])

  if (!log) return null

  const save = async () => {
    await saveSession({
      ...log,
      rpe,
      notes: notes.trim() || undefined,
      topWeight: log.weighted ? topWeight : log.topWeight,
    })
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

      <div className="card" style={{ marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
        {gripSummary(log.grip)}
      </div>

      {log.weighted && (
        <>
          <div className="section-label">Top weight lifted</div>
          <div className="card">
            <Field
              label="Heaviest set"
              hint={`Tracked on your max-weight chart (${log.weightUnit ?? 'kg'})`}
            >
              <Stepper
                value={topWeight}
                min={-40}
                max={200}
                step={2.5}
                suffix={log.weightUnit ?? 'kg'}
                onChange={setTopWeight}
              />
            </Field>
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, paddingTop: 10 }}>
              {fmtWeight(topWeight, log.weightUnit ?? 'kg')}
            </div>
          </div>
        </>
      )}

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
