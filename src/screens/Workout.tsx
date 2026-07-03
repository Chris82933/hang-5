import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActive } from '../store/active'
import { useSettings } from '../store/settings'
import { useWorkout } from '../engine/useWorkout'
import { fmtWeight } from '../lib/format'
import type { SegmentType } from '../types'

export default function Workout() {
  const nav = useNavigate()
  const program = useActive((s) => s.program)
  const setLastLog = useActive((s) => s.setLastLog)
  const cueColors = useSettings((s) => s.cueColors)
  const weightUnit = useSettings((s) => s.weightUnit)
  const started = useRef(false)
  const saved = useRef(false)

  // Redirect out if we somehow landed here without a program.
  useEffect(() => {
    if (!program) nav('/', { replace: true })
  }, [program, nav])

  const workout = useWorkout(program!)
  const { state, start, pause, resume, stop, skipNext, skipPrev, adjustTime, summary } = workout

  useEffect(() => {
    if (program && !started.current) {
      started.current = true
      void start()
    }
  }, [program, start])

  // On completion, log the session and move to the summary screen.
  useEffect(() => {
    if (state.status === 'done' && program && !saved.current) {
      saved.current = true
      const s = summary()
      setLastLog({
        date: Date.now(),
        programId: program.id,
        programName: program.name,
        grip: program.grip,
        plannedSets: program.params.sets,
        completedSets: s.completedSets,
        completedReps: s.completedReps,
        totalHangSecs: s.totalHangSecs,
        weighted: program.params.weighted,
        topWeight: s.topWeight,
        weightUnit,
      })
      nav('/complete', { replace: true })
    }
  }, [state.status, program, summary, setLastLog, nav])

  if (!program) return null

  const colorFor = (t: SegmentType): string => {
    switch (t) {
      case 'prep':
        return cueColors.prep
      case 'hang':
        return cueColors.hang
      case 'rest':
      case 'rest-set':
        return cueColors.rest
      case 'switch':
        return cueColors.switch
      default:
        return cueColors.done
    }
  }

  const quit = () => {
    stop()
    nav('/', { replace: true })
  }

  // Per-rep pips showing progress through the current set (distinct from the
  // thin total-progress bar above). Done = filled, current hang = active.
  const showPips = state.setIndex >= 1 && state.repsInSet > 1
  const pipState = (k: number): 'done' | 'active' | 'todo' => {
    if (state.segType === 'hang' && k === state.repIndex) return 'active'
    if (k < state.repIndex || (k === state.repIndex && state.segType !== 'hang')) return 'done'
    return 'todo'
  }

  const isRestLike = state.segType !== 'hang' // rest / rest-set / switch / prep

  return (
    <div className="workout" style={{ backgroundColor: colorFor(state.segType) }}>
      <div className="top">
        <span>{program.name}</span>
        <span>
          Set {Math.max(1, state.setIndex)}/{state.totalSets}
        </span>
      </div>
      <div className="progress-bar">
        <div style={{ width: `${state.progress * 100}%` }} />
      </div>
      {showPips && (
        <div className="set-pips" aria-label="set progress">
          {Array.from({ length: state.repsInSet }, (_, i) => (
            <span key={i} className={`pip ${pipState(i + 1)}`} />
          ))}
        </div>
      )}

      <div className="center">
        <div className="phase">{state.label}</div>
        <div className="count">{state.secondsRemaining}</div>
        {state.segType === 'hang' && state.repsInSet > 1 && (
          <div className="setrep">
            Rep {state.repIndex} of {state.repsInSet}
          </div>
        )}
        {state.segType === 'hang' && state.targetWeight != null && (
          <div className="weight-badge">{fmtWeight(state.targetWeight, weightUnit)}</div>
        )}
        {isRestLike && (
          <div className="rest-adjust">
            <button onClick={() => adjustTime(-10)}>−10s</button>
            <button onClick={() => adjustTime(10)}>+10s</button>
          </div>
        )}
        {state.status === 'paused' && <div className="setrep">Paused</div>}
      </div>

      <div className="controls">
        <button onClick={skipPrev} aria-label="previous segment">
          ⏮
        </button>
        {state.status === 'running' ? (
          <button onClick={pause}>Pause</button>
        ) : (
          <button onClick={() => void resume()}>Resume</button>
        )}
        <button className="wide" onClick={skipNext}>
          Skip ⏭
        </button>
        <button onClick={quit} aria-label="stop workout">
          ✕
        </button>
      </div>
    </div>
  )
}
