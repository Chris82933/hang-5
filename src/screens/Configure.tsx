import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Program } from '../types'
import { resolveProgram } from '../data/programs'
import { saveProgram } from '../data/db'
import { useActive } from '../store/active'
import { useSettings } from '../store/settings'
import { Field, Stepper, Segmented } from '../components/ui'
import { WeightedConfig } from '../components/WeightedConfig'
import { fmtDuration, handLabel } from '../lib/format'
import { EDGE_TYPES, HAND_POSITIONS } from '../lib/gripOptions'
import { isAdvanced, totalDurationSecs, totalHangSecs } from '../engine/segments'

export default function Configure() {
  const { id } = useParams()
  const nav = useNavigate()
  const setActive = useActive((s) => s.setProgram)
  const unilateral = useSettings((s) => s.unilateral)
  const switchSecs = useSettings((s) => s.switchSecs)
  const [prog, setProg] = useState<Program | null>(null)

  useEffect(() => {
    if (id) void resolveProgram(id).then((p) => setProg(p ?? null))
  }, [id])

  if (!prog) return <div className="page empty">Loading…</div>

  // per-program hand mode wins over the global default
  const effUnilateral = prog.params.unilateral ?? unilateral
  const opts = { unilateral: effUnilateral, switchSecs }

  const p = prog.params
  const setP = (patch: Partial<typeof p>) => setProg({ ...prog, params: { ...p, ...patch } })
  const setGrip = (patch: Partial<Program['grip']>) =>
    setProg({ ...prog, grip: { ...prog.grip, ...patch } })

  const start = () => {
    setActive(prog)
    nav('/workout')
  }

  const saveAsMine = async () => {
    const copy: Program = {
      ...prog,
      id: crypto.randomUUID(),
      name: prog.builtIn ? `${prog.name} (copy)` : prog.name,
      kind: 'custom',
      builtIn: false,
    }
    await saveProgram(copy)
    nav('/')
  }

  return (
    <div className="page has-action-bar">
      <div className="page-header">
        <button className="back-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div>
          <h1 style={{ fontSize: 22 }}>{prog.name}</h1>
          <div className="sub">
            {fmtDuration(totalDurationSecs(prog, opts))} total ·{' '}
            {fmtDuration(totalHangSecs(prog, opts))} hanging
            {effUnilateral && ' · one hand at a time'}
          </div>
        </div>
        {!prog.builtIn && (
          <button className="header-action" onClick={() => nav(`/editor/${prog.id}`)}>
            Edit
          </button>
        )}
      </div>

      {isAdvanced(prog) ? (
        <>
          <div className="section-label">Sequence</div>
          <div className="card">
            <Field label="Prep countdown">
              <Stepper value={p.prepSecs} min={0} max={60} step={5} suffix="s" onChange={(v) => setP({ prepSecs: v })} />
            </Field>
            {prog.sequence!.map((b, i) => (
              <div className="field" key={i}>
                <label>
                  Block {i + 1} · {handLabel(b.handPosition)}
                </label>
                <span className="hint">
                  {b.reps} × {b.hangSecs}:{b.restSecs}
                </span>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '10px 2px 0' }}>
            Edit the holds and timing by saving a copy, then opening it from My programs.
          </p>
        </>
      ) : (
        <>
          <div className="section-label">Timing</div>
          <div className="card">
            <Field label="Prep countdown">
              <Stepper value={p.prepSecs} min={0} max={60} step={5} suffix="s" onChange={(v) => setP({ prepSecs: v })} />
            </Field>
            <Field label="Sets">
              <Stepper value={p.sets} min={1} max={20} onChange={(v) => setP({ sets: v })} />
            </Field>
            <Field label="Reps per set">
              <Stepper value={p.repsPerSet} min={1} max={20} onChange={(v) => setP({ repsPerSet: v })} />
            </Field>
            <Field label="Hang">
              <Stepper value={p.hangSecs} min={1} max={120} suffix="s" onChange={(v) => setP({ hangSecs: v })} />
            </Field>
            <Field label="Rest between reps">
              <Stepper value={p.restSecs} min={0} max={120} suffix="s" onChange={(v) => setP({ restSecs: v })} />
            </Field>
            <Field label="Rest between sets">
              <Stepper value={p.restBetweenSetsSecs} min={0} max={600} step={15} suffix="s" onChange={(v) => setP({ restBetweenSetsSecs: v })} />
            </Field>
          </div>

          <WeightedConfig params={p} patch={setP} />

          <div className="section-label">Hand mode</div>
          <Segmented<'two' | 'one'>
            value={effUnilateral ? 'one' : 'two'}
            options={[
              { value: 'two', label: 'Two-handed hangs' },
              { value: 'one', label: 'One-handed lifts' },
            ]}
            onChange={(v) => setP({ unilateral: v === 'one' })}
          />
        </>
      )}

      <div className="section-label">Grip</div>
      <div className="card">
        <Field label="Edge size">
          <Stepper value={prog.grip.edgeSizeMm} min={2} max={60} suffix="mm" onChange={(v) => setGrip({ edgeSizeMm: v })} />
        </Field>
      </div>
      <div className="section-label">Edge type</div>
      <Segmented value={prog.grip.edgeType} options={EDGE_TYPES} onChange={(v) => setGrip({ edgeType: v })} />
      {!isAdvanced(prog) && (
        <>
          <div className="section-label">Hand position</div>
          <div className="chips" style={{ gap: 8 }}>
            {HAND_POSITIONS.map((h) => (
              <button
                key={h.value}
                className={`chip ${prog.grip.handPosition === h.value ? 'accent' : ''}`}
                style={{ fontSize: 13, padding: '8px 12px' }}
                onClick={() => setGrip({ handPosition: h.value })}
              >
                {h.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="action-bar">
        <button className="btn" onClick={saveAsMine}>
          {prog.builtIn ? 'Save copy' : 'Save'}
        </button>
        <button className="btn primary" onClick={start}>
          ▶ Start
        </button>
      </div>
    </div>
  )
}
