import { useNavigate } from 'react-router-dom'
import { usePrograms } from '../data/programs'
import type { Program } from '../types'
import { gripSummary, programSummary } from '../lib/format'

function ProgramCard({ program, onClick }: { program: Program; onClick: () => void }) {
  return (
    <button className="card program-card" onClick={onClick}>
      <div className="title-row">
        <h3>{program.name}</h3>
        <span style={{ fontSize: 22, opacity: 0.5 }}>›</span>
      </div>
      <p>{program.description}</p>
      <div className="chips">
        <span className="chip accent">{programSummary(program)}</span>
      </div>
      <div className="chips">
        <span className="chip">{gripSummary(program.grip)}</span>
      </div>
    </button>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { presets, custom } = usePrograms()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Hangboard</h1>
          <div className="sub">Pick a protocol to start training</div>
        </div>
      </div>

      <div className="section-label">Built-in programs</div>
      {presets.map((p) => (
        <ProgramCard key={p.id} program={p} onClick={() => nav(`/configure/${p.id}`)} />
      ))}

      <div className="section-label">My programs</div>
      {custom.length === 0 ? (
        <div className="card" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No custom programs yet. Tap ＋ to build one with your own edge, grip and timing.
        </div>
      ) : (
        custom.map((p) => (
          <ProgramCard key={p.id} program={p} onClick={() => nav(`/configure/${p.id}`)} />
        ))
      )}

      <button className="fab" onClick={() => nav('/editor')} aria-label="New program">
        ＋
      </button>
    </div>
  )
}
