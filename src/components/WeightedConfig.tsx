import { Field, Toggle, Stepper } from './ui'
import { setWeight } from '../engine/segments'
import { fmtWeight } from '../lib/format'
import { useSettings } from '../store/settings'
import type { ProgramParams } from '../types'

/**
 * Editor for progressive weighted loading. Starts light and ramps up each set —
 * warming the fingers/tendons and building max load safely. Shows a live
 * per-set ramp so the build-up is obvious before starting.
 */
export function WeightedConfig({
  params,
  patch,
}: {
  params: ProgramParams
  patch: (p: Partial<ProgramParams>) => void
}) {
  const unit = useSettings((s) => s.weightUnit)
  const on = !!params.weighted
  const weights = Array.from({ length: params.sets }, (_, i) => setWeight(params, i + 1))
  const max = Math.max(1, ...weights.map((w) => Math.abs(w)))

  return (
    <>
      <div className="section-label">Weighted loading</div>
      <div className="card">
        <Field label="Progressive weight" hint="Ramp up load each set to build safely">
          <Toggle on={on} onChange={(v) => patch({ weighted: v })} />
        </Field>
        {on && (
          <>
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
          </>
        )}
      </div>

      {on && (
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
      )}
    </>
  )
}
