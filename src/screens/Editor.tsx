import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { EdgeType, HandPosition, Program } from '../types'
import { db, saveProgram, deleteProgram } from '../data/db'
import { Field, Stepper, Segmented } from '../components/ui'

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

function blankProgram(): Program {
  return {
    id: crypto.randomUUID(),
    name: '',
    kind: 'custom',
    description: '',
    builtIn: false,
    params: {
      prepSecs: 15,
      sets: 4,
      repsPerSet: 6,
      hangSecs: 7,
      restSecs: 3,
      restBetweenSetsSecs: 120,
    },
    grip: { edgeSizeMm: 20, edgeType: 'wood', fingers: 4, handPosition: 'half-crimp' },
  }
}

export default function Editor() {
  const { id } = useParams()
  const nav = useNavigate()
  const [prog, setProg] = useState<Program>(blankProgram)
  const isEdit = Boolean(id)

  useEffect(() => {
    if (id) void db.programs.get(id).then((p) => p && setProg(p))
  }, [id])

  const p = prog.params
  const setP = (patch: Partial<typeof p>) => setProg({ ...prog, params: { ...p, ...patch } })
  const setGrip = (patch: Partial<Program['grip']>) =>
    setProg({ ...prog, grip: { ...prog.grip, ...patch } })

  const save = async () => {
    const toSave: Program = {
      ...prog,
      name: prog.name.trim() || 'My program',
      kind: 'custom',
      builtIn: false,
      description:
        prog.description.trim() ||
        `${p.sets} sets · ${p.repsPerSet}×${p.hangSecs}:${p.restSecs}`,
    }
    await saveProgram(toSave)
    nav('/', { replace: true })
  }

  const remove = async () => {
    if (id) await deleteProgram(id)
    nav('/', { replace: true })
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <h1 style={{ fontSize: 22 }}>{isEdit ? 'Edit program' : 'New program'}</h1>
      </div>

      <div className="section-label">Name</div>
      <div className="card">
        <div className="field" style={{ borderBottom: 'none' }}>
          <input
            type="text"
            placeholder="e.g. My 7:3 repeaters"
            value={prog.name}
            style={{ flex: 1, textAlign: 'left', minWidth: 0 }}
            onChange={(e) => setProg({ ...prog, name: e.target.value })}
          />
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
        <button className="btn primary block lg" onClick={save}>
          Save program
        </button>
        {isEdit && (
          <button className="btn block danger" onClick={remove}>
            Delete program
          </button>
        )}
      </div>
    </div>
  )
}
