import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { EdgeType, HandPosition, Program } from '../types'
import { resolveProgram } from '../data/programs'
import { saveProgram } from '../data/db'
import { useActive } from '../store/active'
import { useSettings } from '../store/settings'
import { Field, Stepper, Segmented } from '../components/ui'
import { WeightedConfig } from '../components/WeightedConfig'
import { fmtDuration } from '../lib/format'
import { totalDurationSecs, totalHangSecs } from '../engine/segments'

const EDGE_TYPES: { value: EdgeType; label: string }[] = [
  { value: 'wood', label: 'Wood' },
  { value: 'metal', label: 'Metal' },
  { value: 'textured', label: 'Textured' },
  { value: 'pocket', label: 'Pocket' },
]

const HAND_POSITIONS: { value: HandPosition; label: string }[] = [
  { value: 'half-crimp', label: 'Half crimp' },
  { value: 'full-crimp', label: 'Full crimp' },
  { value: 'open-hand', label: 'Open hand' },
  { value: 'drag', label: 'Drag' },
  { value: 'sloper', label: 'Sloper' },
  { value: 'pinch', label: 'Pinch' },
]

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

  const opts = { unilateral, switchSecs }

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
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div>
          <h1 style={{ fontSize: 22 }}>{prog.name}</h1>
          <div className="sub">
            {fmtDuration(totalDurationSecs(prog, opts))} total ·{' '}
            {fmtDuration(totalHangSecs(prog, opts))} hanging
            {unilateral && ' · one hand at a time'}
          </div>
        </div>
      </div>

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

      <div className="section-label">Grip</div>
      <div className="card">
        <Field label="Edge size">
          <Stepper value={prog.grip.edgeSizeMm} min={2} max={60} suffix="mm" onChange={(v) => setGrip({ edgeSizeMm: v })} />
        </Field>
        <Field label="Fingers">
          <Stepper value={prog.grip.fingers} min={1} max={4} onChange={(v) => setGrip({ fingers: v })} />
        </Field>
      </div>
      <div className="section-label">Edge type</div>
      <Segmented value={prog.grip.edgeType} options={EDGE_TYPES} onChange={(v) => setGrip({ edgeType: v })} />
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

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn primary block lg" onClick={start}>
          ▶ Start workout
        </button>
        <button className="btn block" onClick={saveAsMine}>
          {prog.builtIn ? 'Save a copy to My programs' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
