import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { SessionLog } from '../types'
import { getSessions, deleteSession } from '../data/db'
import { fmtDate, fmtDuration, fmtWeight, gripSummary } from '../lib/format'
import { Segmented } from '../components/ui'

type View = 'strength' | 'endurance'

const isStrength = (s: SessionLog) => !!s.weighted

export default function History() {
  const [sessions, setSessions] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('strength')
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const reload = () =>
    getSessions().then((s) => {
      setSessions(s)
      setLoading(false)
    })

  useEffect(() => {
    void reload()
  }, [])

  const remove = async (id?: number) => {
    if (id == null) return
    await deleteSession(id)
    void reload()
  }

  const strengthSessions = sessions.filter(isStrength)
  const enduranceSessions = sessions.filter((s) => !isStrength(s))
  const hasStrength = strengthSessions.length > 0
  const hasEndurance = enduranceSessions.length > 0
  // if only one kind exists, force that view
  const activeView: View = hasStrength && hasEndurance ? view : hasStrength ? 'strength' : 'endurance'

  const weightUnitLabel = strengthSessions[0]?.weightUnit ?? 'kg'
  const bestWeight = strengthSessions.reduce((m, s) => Math.max(m, s.topWeight ?? 0), 0)
  const bestHang = enduranceSessions.reduce((m, s) => Math.max(m, s.totalHangSecs), 0)
  const totalHang = sessions.reduce((a, s) => a + s.totalHangSecs, 0)

  // oldest → newest for the featured chart
  const strengthData = [...strengthSessions]
    .reverse()
    .map((s) => ({ label: fmtDate(s.date), value: s.topWeight ?? 0 }))
  const enduranceData = [...enduranceSessions]
    .reverse()
    .map((s) => ({ label: fmtDate(s.date), value: s.totalHangSecs }))

  const chartData = activeView === 'strength' ? strengthData : enduranceData
  const yUnit = activeView === 'strength' ? weightUnitLabel : 's'
  const lineColor = activeView === 'strength' ? 'var(--secondary)' : 'var(--primary)'
  const chartLabel =
    activeView === 'strength' ? 'Max weight per session' : 'Hang time per session'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History</h1>
          <div className="sub">Your training log</div>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="empty">
          No sessions yet.
          <br />
          Complete a workout and it’ll show up here.
        </div>
      ) : (
        <>
          {hasStrength && (
            <div className="pr-card">
              <span className="pr-tag">PR</span>
              <div>
                <div className="pr-label">Highest weighted hang</div>
                <div className="pr-value">{fmtWeight(bestWeight, weightUnitLabel)}</div>
              </div>
            </div>
          )}

          <div className="stat-row">
            <div className="stat">
              <div className="n">{sessions.length}</div>
              <div className="l">sessions</div>
            </div>
            {hasEndurance && (
              <div className="stat">
                <div className="n">{fmtDuration(bestHang)}</div>
                <div className="l">best hang</div>
              </div>
            )}
            <div className="stat">
              <div className="n">{fmtDuration(totalHang)}</div>
              <div className="l">total hang</div>
            </div>
          </div>

          {hasStrength && hasEndurance && (
            <div style={{ marginTop: 18 }}>
              <Segmented<View>
                value={activeView}
                options={[
                  { value: 'strength', label: 'Strength' },
                  { value: 'endurance', label: 'Endurance' },
                ]}
                onChange={setView}
              />
            </div>
          )}

          <div className="section-label">{chartLabel}</div>
          <div className="card" style={{ height: 220, padding: '16px 8px 8px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 16, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--divider)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} unit={yUnit} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'var(--on-surface)',
                  }}
                  formatter={(v) =>
                    activeView === 'strength'
                      ? [`${v} ${weightUnitLabel}`, 'Top weight']
                      : [fmtDuration(Number(v)), 'Hang time']
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={3}
                  dot={{ r: 3, fill: lineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="section-label">Sessions</div>
          {sessions.map((s) => (
            <div className="card" key={s.id}>
              <div className="session-item">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{s.programName}</h3>
                  <div className="date">{fmtDate(s.date)}</div>
                </div>
                {confirmId === s.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn danger"
                      style={{ padding: '8px 12px' }}
                      onClick={() => {
                        void remove(s.id)
                        setConfirmId(null)
                      }}
                    >
                      Confirm
                    </button>
                    <button className="btn" style={{ padding: '8px 12px' }} onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn"
                    style={{ padding: '8px 12px' }}
                    onClick={() => setConfirmId(s.id ?? null)}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="chips" style={{ marginTop: 10 }}>
                <span className={`chip ${isStrength(s) ? 'strength' : 'endurance'}`}>
                  {isStrength(s) ? 'Strength' : 'Endurance'}
                </span>
                <span className="chip">{s.completedReps} reps</span>
                <span className="chip">{fmtDuration(s.totalHangSecs)} on</span>
                {s.weighted && s.topWeight != null && (
                  <span className="chip strength">{fmtWeight(s.topWeight, s.weightUnit ?? 'kg')}</span>
                )}
                {s.rpe != null && <span className="chip">RPE {s.rpe}</span>}
              </div>
              <div className="chips">
                <span className="chip">{gripSummary(s.grip)}</span>
              </div>
              {s.notes && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted)' }}>{s.notes}</p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
