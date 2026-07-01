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

export default function History() {
  const [sessions, setSessions] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)

  const reload = () => getSessions().then((s) => {
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

  // oldest → newest for the chart
  const chartData = [...sessions]
    .reverse()
    .map((s) => ({
      label: fmtDate(s.date),
      hang: s.totalHangSecs,
      rpe: s.rpe ?? null,
    }))

  const totalSessions = sessions.length
  const totalHang = sessions.reduce((a, s) => a + s.totalHangSecs, 0)

  // max-weight progression from weighted sessions (oldest → newest)
  const weightData = [...sessions]
    .filter((s) => s.weighted && s.topWeight != null)
    .reverse()
    .map((s) => ({ label: fmtDate(s.date), weight: s.topWeight as number }))
  const weightUnitLabel = sessions.find((s) => s.weighted)?.weightUnit ?? 'kg'
  const bestWeight = weightData.reduce((m, d) => Math.max(m, d.weight), 0)

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
          <div className="stat-row">
            <div className="stat">
              <div className="n">{totalSessions}</div>
              <div className="l">sessions</div>
            </div>
            <div className="stat">
              <div className="n">{fmtDuration(totalHang)}</div>
              <div className="l">total hang time</div>
            </div>
          </div>

          <div className="section-label">Hang volume per session</div>
          <div className="card" style={{ height: 220, padding: '16px 8px 8px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 16, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--divider)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} unit="s" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'var(--on-surface)',
                  }}
                  formatter={(v) => [`${v}s`, 'Hang']}
                />
                <Line
                  type="monotone"
                  dataKey="hang"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: 'var(--primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {weightData.length > 0 && (
            <>
              <div className="section-label">
                Max weight progression · best {fmtWeight(bestWeight, weightUnitLabel)}
              </div>
              <div className="card" style={{ height: 220, padding: '16px 8px 8px 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData} margin={{ top: 6, right: 16, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--divider)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} />
                    <YAxis
                      tick={{ fill: 'var(--muted)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      unit={weightUnitLabel}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: 'none',
                        borderRadius: 10,
                        color: 'var(--on-surface)',
                      }}
                      formatter={(v) => [`${v} ${weightUnitLabel}`, 'Top weight']}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--secondary)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: 'var(--secondary)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          <div className="section-label">Sessions</div>
          {sessions.map((s) => (
            <div className="card" key={s.id}>
              <div className="session-item">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{s.programName}</h3>
                  <div className="date">{fmtDate(s.date)}</div>
                </div>
                <button className="btn danger" onClick={() => remove(s.id)} style={{ padding: '8px 12px' }}>
                  Delete
                </button>
              </div>
              <div className="chips" style={{ marginTop: 10 }}>
                <span className="chip">{s.completedReps} reps</span>
                <span className="chip">{fmtDuration(s.totalHangSecs)} on</span>
                {s.weighted && s.topWeight != null && (
                  <span className="chip accent">{fmtWeight(s.topWeight, s.weightUnit ?? 'kg')}</span>
                )}
                {s.rpe != null && <span className="chip accent">RPE {s.rpe}</span>}
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
