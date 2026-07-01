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
  const { state, start, pause, resume, stop, skipNext, skipPrev, summary } = workout

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
      default:
        return cueColors.done
    }
  }

  const quit = () => {
    stop()
    nav('/', { replace: true })
  }

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
