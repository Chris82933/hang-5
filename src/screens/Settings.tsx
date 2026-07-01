import { useSettings, type SoundTheme, type ThemeMode } from '../store/settings'
import { soundEngine } from '../engine/audio'
import { Field, Toggle, Segmented } from '../components/ui'

const SOUND_THEMES: { value: SoundTheme; label: string }[] = [
  { value: 'beeps', label: '🔔 Beeps' },
  { value: 'piano', label: '🎹 Piano' },
  { value: 'duck', label: '🦆 Duck' },
]

const CUE_KEYS: { key: 'prep' | 'hang' | 'rest' | 'done'; label: string }[] = [
  { key: 'prep', label: 'Prepare' },
  { key: 'hang', label: 'Hang' },
  { key: 'rest', label: 'Rest' },
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

      <div className="section-label">Sync</div>
      <div className="card">
        <Field label="Google account sync" hint="Coming soon — your data is saved locally on this device">
          <span className="chip">Soon</span>
        </Field>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 24 }}>
        Hangboard Trainer · data stored locally on your device
      </p>
    </div>
  )
}
