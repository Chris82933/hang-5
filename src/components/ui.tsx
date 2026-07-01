import type { ReactNode } from 'react'

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="stepper">
      <button onClick={() => onChange(clamp(value - step))} aria-label="decrease">
        −
      </button>
      <span className="val">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </span>
      <button onClick={() => onChange(clamp(value + step))} aria-label="increase">
        +
      </button>
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      className={`toggle ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    />
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <div>
        <label>{label}</label>
        {hint && <div className="hint">{hint}</div>}
      </div>
      {children}
    </div>
  )
}
