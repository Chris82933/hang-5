import { useSettings, type SoundTheme, type ThemeMode } from '../store/settings'
import { soundEngine } from '../engine/audio'
import { Field, Toggle, Segmented, Stepper } from '../components/ui'
import { useInstallState, promptInstall } from '../lib/pwaInstall'
import type { WeightUnit } from '../types'

function InstallSection() {
  const { installed, canPrompt, ios } = useInstallState()

  return (
    <>
      <div className="section-label">Install app</div>
      {installed ? (
        <div className="card">
          <div style={{ fontWeight: 700 }}>✓ Installed</div>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            You’re running Hang 5 as an app. It works fully offline — no internet needed.
          </p>
        </div>
      ) : (
        <div className="card">
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5 }}>
            Add Hang 5 to your home screen for full-screen, offline training — once installed it
            works with no internet connection.
          </p>
          {canPrompt && (
            <button className="btn primary block" onClick={() => void promptInstall()}>
              ＋ Add to home screen
            </button>
          )}
          <div className="install-steps">
            <div className={ios ? 'ihi' : undefined}>
              <strong>iPhone / iPad (Safari):</strong> tap the Share button, then{' '}
              <strong>“Add to Home Screen”</strong>.
            </div>
            <div className={!ios ? 'ihi' : undefined}>
              <strong>Android (Chrome):</strong> tap the menu (⋮), then <strong>“Install app”</strong>{' '}
              or “Add to Home screen”.
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const SOUND_THEMES: { value: SoundTheme; label: string }[] = [
  { value: 'beeps', label: 'Beeps' },
  { value: 'piano', label: 'Piano' },
  { value: 'piano-warm', label: 'Warm piano' },
  { value: 'piano-bright', label: 'Bright piano' },
  { value: 'marimba', label: 'Marimba' },
  { value: 'bells', label: 'Bells' },
  { value: 'chiptune', label: 'Chiptune' },
  { value: 'cow', label: 'Cow' },
  { value: 'bird', label: 'Bird' },
  { value: 'duck', label: 'Duck' },
]

const CUE_KEYS: { key: 'prep' | 'hang' | 'rest' | 'switch' | 'done'; label: string }[] = [
  { key: 'prep', label: 'Prepare' },
  { key: 'hang', label: 'Hang' },
  { key: 'rest', label: 'Rest' },
  { key: 'switch', label: 'Switch hands' },
  { key: 'done', label: 'Done' },
]

export default function Settings() {
  const s = useSettings()

  const previewTheme = (theme: SoundTheme) => {
    s.setSoundTheme(theme)
    soundEngine.setTheme(theme)
    soundEngine.preview('go')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <div className="sub">Appearance, sound &amp; sync</div>
        </div>
      </div>

      <div className="section-label">Appearance</div>
      <Segmented<ThemeMode>
        value={s.themeMode}
        options={[
          { value: 'dark', label: '🌙 Dark' },
          { value: 'light', label: '☀️ Light' },
        ]}
        onChange={s.setThemeMode}
      />

      <div className="section-label">Sound theme</div>
      <div className="card" style={{ padding: 8 }}>
        {SOUND_THEMES.map((t) => (
          <button
            key={t.value}
            className="field"
            style={{ width: '100%', cursor: 'pointer' }}
            onClick={() => previewTheme(t.value)}
          >
            <label style={{ pointerEvents: 'none' }}>{t.label}</label>
            <span className="chip accent">
              {s.soundTheme === t.value ? '✓ Selected · tap to preview' : 'Preview'}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <Field label="Volume">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => s.setVolume(Number(e.target.value))}
          />
        </Field>
        <Field label="Keep screen awake" hint="Prevents the phone sleeping mid-workout">
          <Toggle on={s.keepAwake} onChange={s.setKeepAwake} />
        </Field>
      </div>

      <div className="section-label">Weight unit</div>
      <Segmented<WeightUnit>
        value={s.weightUnit}
        options={[
          { value: 'kg', label: 'Kilograms' },
          { value: 'lb', label: 'Pounds' },
        ]}
        onChange={s.setWeightUnit}
      />

      <div className="section-label">Single-hand lifts</div>
      <div className="card">
        <Field
          label="One hand at a time"
          hint="Fingerboard lifts — alternate left & right each rep"
        >
          <Toggle on={s.unilateral} onChange={s.setUnilateral} />
        </Field>
        {s.unilateral && (
          <Field label="Switch time" hint="Rest to swap hands between left and right">
            <Stepper
              value={s.switchSecs}
              min={1}
              max={60}
              suffix="s"
              onChange={s.setSwitchSecs}
            />
          </Field>
        )}
      </div>

      <div className="section-label">Workout cue colours</div>
      <div className="card">
        {CUE_KEYS.map((c) => (
          <Field key={c.key} label={c.label}>
            <input
              type="color"
              value={s.cueColors[c.key]}
              onChange={(e) => s.setCueColor(c.key, e.target.value)}
              style={{ width: 48, height: 34, border: 'none', background: 'none', padding: 0 }}
            />
          </Field>
        ))}
        <div style={{ paddingTop: 10 }}>
          <button className="btn" onClick={s.resetCueColors}>
            Reset colours
          </button>
        </div>
      </div>

      <InstallSection />

      <div className="section-label">Sync</div>
      <div className="card">
        <Field label="Google account sync" hint="Coming soon — your data is saved locally on this device">
          <span className="chip">Soon</span>
        </Field>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 24 }}>
        Hang 5 · works offline · data stored locally on your device
      </p>
    </div>
  )
}
