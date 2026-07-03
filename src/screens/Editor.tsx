import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Program, SetBlock } from '../types'
import { db, saveProgram, deleteProgram } from '../data/db'
import { Field, Stepper, Segmented } from '../components/ui'
import { WeightedConfig } from '../components/WeightedConfig'
import { SequenceEditor } from '../components/SequenceEditor'
import { EDGE_TYPES, HAND_POSITIONS } from '../lib/gripOptions'

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

  const advanced = !!prog.sequence
  const setAdvanced = (on: boolean) => {
    if (on) {
      const seq: SetBlock[] = prog.sequence ?? [
        { handPosition: prog.grip.handPosition, reps: p.repsPerSet, hangSecs: p.hangSecs, restSecs: p.restSecs },
      ]
      setProg({ ...prog, sequence: seq })
    } else {
      setProg({ ...prog, sequence: undefined })
    }
  }
  const setSequence = (sequence: SetBlock[]) => setProg({ ...prog, sequence })

  const save = async () => {
    const seq = prog.sequence
    const desc = seq
      ? `${seq.length} holds · ${seq.reduce((n, b) => n + b.reps, 0)} hangs`
      : `${p.sets} sets · ${p.repsPerSet}×${p.hangSecs}:${p.restSecs}`
    const toSave: Program = {
      ...prog,
      name: prog.name.trim() || 'My program',
      kind: 'custom',
      builtIn: false,
      description: prog.description.trim() || desc,
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

      <div className="section-label">Structure</div>
      <Segmented<'simple' | 'advanced'>
        value={advanced ? 'advanced' : 'simple'}
        options={[
          { value: 'simple', label: 'Simple' },
          { value: 'advanced', label: 'Per-set holds' },
        ]}
        onChange={(v) => setAdvanced(v === 'advanced')}
      />

      <div className="section-label">Prep</div>
      <div className="card">
        <Field label="Prep countdown">
          <Stepper value={p.prepSecs} min={0} max={60} step={5} suffix="s" onChange={(v) => setP({ prepSecs: v })} />
        </Field>
      </div>

      {advanced ? (
        <>
          <div className="section-label">Blocks · each on its own hold</div>
          <SequenceEditor sequence={prog.sequence!} onChange={setSequence} />
        </>
      ) : (
        <>
          <div className="section-label">Timing</div>
          <div className="card">
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
        </>
      )}

      <WeightedConfig params={p} patch={setP} />

      <div className="section-label">Hand mode</div>
      <Segmented<'two' | 'one'>
        value={p.unilateral ? 'one' : 'two'}
        options={[
          { value: 'two', label: 'Two-handed hangs' },
          { value: 'one', label: 'One-handed lifts' },
        ]}
        onChange={(v) => setP({ unilateral: v === 'one' })}
      />

      <div className="section-label">Grip</div>
      <div className="card">
        <Field label="Edge size">
          <Stepper value={prog.grip.edgeSizeMm} min={2} max={60} suffix="mm" onChange={(v) => setGrip({ edgeSizeMm: v })} />
        </Field>
      </div>
      <div className="section-label">Edge type</div>
      <Segmented value={prog.grip.edgeType} options={EDGE_TYPES} onChange={(v) => setGrip({ edgeType: v })} />
      {!advanced && (
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
