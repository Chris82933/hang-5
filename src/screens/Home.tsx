import { useNavigate } from 'react-router-dom'
import { usePrograms } from '../data/programs'
import { useSettings } from '../store/settings'
import type { Program } from '../types'
import { gripSummary, programSummary, fmtDuration } from '../lib/format'
import { totalDurationSecs } from '../engine/segments'

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2 L15 9 L22 9.3 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.3 L9 9 Z"
        fill={filled ? 'var(--accent-yellow)' : 'none'}
        stroke="var(--border-col)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProgramCard({
  program,
  onClick,
  favorite,
  onToggleFav,
}: {
  program: Program
  onClick: () => void
  favorite: boolean
  onToggleFav: () => void
}) {
  const total = totalDurationSecs(program, { unilateral: !!program.params.unilateral })
  return (
    <div className="card program-card" role="button" tabIndex={0} onClick={onClick}>
      <div className="pc-head">
        <h3>{program.name}</h3>
        <button
          className={`star ${favorite ? 'on' : ''}`}
          aria-label={favorite ? 'Unfavourite' : 'Favourite'}
          aria-pressed={favorite}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFav()
          }}
        >
          <StarIcon filled={favorite} />
        </button>
      </div>
      <div className="prog-summary">{programSummary(program)}</div>
      <div className="pc-foot">
        <div className="chips">
          <span className="chip">{gripSummary(program.grip)}</span>
          {program.params.weighted ? (
            <span className="chip strength">Weighted</span>
          ) : (
            <span className="chip endurance">Endurance</span>
          )}
          {program.params.unilateral && <span className="chip">1-hand</span>}
        </div>
        <div className="time-badge" title="Total session time">
          <span className="tb-clock">◷</span>
          {fmtDuration(total)}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { presets, custom } = usePrograms()
  const favorites = useSettings((s) => s.favorites)
  const toggleFavorite = useSettings((s) => s.toggleFavorite)

  const isFav = (p: Program) => favorites.includes(p.id)
  const open = (p: Program) => nav(`/configure/${p.id}`)

  const card = (p: Program) => (
    <ProgramCard
      key={p.id}
      program={p}
      favorite={isFav(p)}
      onToggleFav={() => toggleFavorite(p.id)}
      onClick={() => open(p)}
    />
  )

  // Favourites float to the very top; everything else stays in its section.
  const favs = [...custom, ...presets].filter(isFav)
  const restCustom = custom.filter((p) => !isFav(p))
  const restPresets = presets.filter((p) => !isFav(p))

  // Once you have custom programs, that section moves above the built-ins.
  const hasCustom = custom.length > 0

  const builtInSection = restPresets.length > 0 && (
    <>
      <div className="section-label">Built-in programs</div>
      {restPresets.map(card)}
    </>
  )

  const customSection = hasCustom
    ? restCustom.length > 0 && (
        <>
          <div className="section-label">My programs</div>
          {restCustom.map(card)}
        </>
      )
    : (
        <>
          <div className="section-label">My programs</div>
          <div className="card" style={{ color: 'var(--muted)', fontSize: 14 }}>
            No custom programs yet. Tap Create to build one with your own edge, grip and timing.
          </div>
        </>
      )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Hang 5</h1>
          <div className="sub">Pick a protocol to start training</div>
        </div>
      </div>

      {favs.length > 0 && (
        <>
          <div className="section-label">Favourites</div>
          {favs.map(card)}
        </>
      )}

      {hasCustom ? (
        <>
          {customSection}
          {builtInSection}
        </>
      ) : (
        <>
          {builtInSection}
          {customSection}
        </>
      )}

      <button className="fab" onClick={() => nav('/editor')} aria-label="Create program">
        Create <span className="plus">+</span>
      </button>
    </div>
  )
}
