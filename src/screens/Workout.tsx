import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActive } from '../store/active'
import { useSettings } from '../store/settings'
import { useWorkout } from '../engine/useWorkout'
import type { SegmentType } from '../types'

export default function Workout() {
  const nav = useNavigate()
  const program = useActive((s) => s.program)
  const setLastLog = useActive((s) => s.setLastLog)
  const cueColors = useSettings((s) => s.cueColors)
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

  const isRest = state.segType === 'rest' || state.segType === 'rest-set'

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
        {state.repsInSet > 1 && !isRest && state.segType === 'hang' && (
          <div className="setrep">
            Rep {state.repIndex} of {state.repsInSet}
          </div>
        )}
        {state.status === 'paused' && <div className="setrep">Paused</div>}
      </div>

      <div className="controls">
        <button onClick={skipPrev} aria-label="previous">
          ⏮
        </button>
        {state.status === 'running' ? (
          <button className="wide" onClick={pause}>
            Pause
          </button>
        ) : (
          <button className="wide" onClick={() => void resume()}>
            Resume
          </button>
        )}
        <button onClick={skipNext} aria-label="next">
          ⏭
        </button>
        <button onClick={quit} aria-label="stop">
          ✕
        </button>
      </div>
    </div>
  )
}
