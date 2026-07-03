import { Field, Stepper, Segmented } from './ui'
import { setWeight } from '../engine/segments'
import { fmtWeight } from '../lib/format'
import { useSettings } from '../store/settings'
import type { ProgramParams } from '../types'

type WeightUi = 'none' | 'progressive' | 'manual'

function currentMode(p: ProgramParams): WeightUi {
  if (!p.weighted) return 'none'
  return p.weightMode ?? 'progressive'
}

/**
 * Weight loading editor with three modes:
 *  - Bodyweight: no added load
 *  - Progressive: a structured per-set ramp (build up safely)
 *  - Manual: just load a plate — dial the weight in live during the session
 */
export function WeightedConfig({
  params,
  patch,
}: {
  params: ProgramParams
  patch: (p: Partial<ProgramParams>) => void
}) {
  const unit = useSettings((s) => s.weightUnit)
  const mode = currentMode(params)

  const setMode = (m: WeightUi) => {
    if (m === 'none') patch({ weighted: false })
    else patch({ weighted: true, weightMode: m })
  }

  const weights = Array.from({ length: params.sets }, (_, i) => setWeight(params, i + 1))
  const max = Math.max(1, ...weights.map((w) => Math.abs(w)))

  return (
    <>
      <div className="section-label">Weight</div>
      <Segmented<WeightUi>
        value={mode}
        options={[
          { value: 'none', label: 'Bodyweight' },
          { value: 'progressive', label: 'Progressive' },
          { value: 'manual', label: 'Manual' },
        ]}
        onChange={setMode}
      />

      {mode === 'progressive' && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <Field label={`Start weight (${unit})`} hint="First set — keep light to warm up">
              <Stepper
                value={params.startWeight ?? 0}
                min={-40}
                max={100}
                step={2.5}
                suffix={unit}
                onChange={(v) => patch({ startWeight: v })}
              />
            </Field>
            <Field label={`Add per set (${unit})`} hint="Increment between sets">
              <Stepper
                value={params.weightStep ?? 0}
                min={0}
                max={20}
                step={2.5}
                suffix={unit}
                onChange={(v) => patch({ weightStep: v })}
              />
            </Field>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-label" style={{ margin: '0 0 14px' }}>
              Per-set ramp
            </div>
            <div className="ramp" style={{ height: 120 }}>
              {weights.map((w, i) => (
                <div
                  key={i}
                  className="bar"
                  style={{ height: `${24 + (Math.abs(w) / max) * 84}px` }}
                  title={`Set ${i + 1}`}
                >
                  <span>{w === 0 ? 'BW' : w}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>
              Builds to a top set of {fmtWeight(weights[weights.length - 1] ?? 0, unit)}
            </div>
          </div>
        </>
      )}

      {mode === 'manual' && (
        <div className="card" style={{ marginTop: 12 }}>
          <Field label={`Starting weight (${unit})`} hint="Dial it up or down live during the workout">
            <Stepper
              value={params.startWeight ?? 0}
              min={-40}
              max={200}
              step={2.5}
              suffix={unit}
              onChange={(v) => patch({ startWeight: v })}
            />
          </Field>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            No fixed structure — adjust the load with the on-screen +/− buttons whenever you like.
            Your heaviest hang is saved to History.
          </p>
        </div>
      )}
    </>
  )
}
