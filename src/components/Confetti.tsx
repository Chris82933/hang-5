import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  color: string
  shape: 'rect' | 'tri'
}

const COLORS = ['#e64522', '#2340c8', '#f2c200', '#141210', '#ffffff']

/** Lightweight canvas confetti burst that self-cleans after a few seconds. */
export function Confetti({ durationMs = 3500, count = 150 }: { durationMs?: number; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const parts: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.5 ? 'rect' : 'tri',
    }))

    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const elapsed = t - start
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05 // gravity
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = elapsed > durationMs - 800 ? Math.max(0, (durationMs - elapsed) / 800) : 1
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        } else {
          ctx.beginPath()
          ctx.moveTo(0, -p.size / 2)
          ctx.lineTo(p.size / 2, p.size / 2)
          ctx.lineTo(-p.size / 2, p.size / 2)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
      if (elapsed < durationMs) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationMs, count])

  return <canvas ref={ref} className="confetti" aria-hidden />
}
