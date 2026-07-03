import type { HandPosition, SetBlock } from '../types'
import { HAND_POSITIONS } from '../lib/gripOptions'
import { Field, Stepper } from './ui'

/**
 * Advanced routine editor: an ordered list of blocks, each a run of hangs on a
 * chosen hold. Lets users build multi-hold routines (e.g. Abrahamsson's daily).
 */
export function SequenceEditor({
  sequence,
  onChange,
}: {
  sequence: SetBlock[]
  onChange: (s: SetBlock[]) => void
}) {
  const update = (i: number, patch: Partial<SetBlock>) =>
    onChange(sequence.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  const remove = (i: number) => onChange(sequence.filter((_, idx) => idx !== i))
  const add = () => {
    const last = sequence[sequence.length - 1]
    onChange([
      ...sequence,
      {
        handPosition: 'half-crimp',
        reps: last?.reps ?? 6,
        hangSecs: last?.hangSecs ?? 10,
        restSecs: last?.restSecs ?? 20,
      },
    ])
  }

  return (
    <>
      {sequence.map((b, i) => (
        <div className="card" key={i}>
          <div className="block-head">
            <span className="block-num">Block {i + 1}</span>
            <button className="btn danger" style={{ padding: '6px 11px' }} onClick={() => remove(i)}>
              Remove
            </button>
          </div>
          <div className="field">
            <label>Hold</label>
            <select
              value={b.handPosition}
              onChange={(e) => update(i, { handPosition: e.target.value as HandPosition })}
            >
              {HAND_POSITIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <Field label="Reps">
            <Stepper value={b.reps} min={1} max={30} onChange={(v) => update(i, { reps: v })} />
          </Field>
          <Field label="Hang">
            <Stepper value={b.hangSecs} min={1} max={120} suffix="s" onChange={(v) => update(i, { hangSecs: v })} />
          </Field>
          <Field label="Rest">
            <Stepper value={b.restSecs} min={0} max={300} step={5} suffix="s" onChange={(v) => update(i, { restSecs: v })} />
          </Field>
        </div>
      ))}
      <button className="btn block" style={{ marginTop: 12 }} onClick={add}>
        + Add block
      </button>
    </>
  )
}
