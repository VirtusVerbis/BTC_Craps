import { useEffect, useRef } from 'react'
import type { DepthSample } from '../../data/microstructure/types'

interface DepthTimelineProps {
  samples: readonly DepthSample[]
}

export const DepthTimeline = ({ samples }: DepthTimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || samples.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const maxBid = Math.max(...samples.map((s) => s.bidNotionalNear), 1)
    const maxAsk = Math.max(...samples.map((s) => s.askNotionalNear), 1)
    const maxVal = Math.max(maxBid, maxAsk)
    const n = samples.length
    samples.forEach((s, i) => {
      const x = n <= 1 ? 0 : (i / (n - 1)) * w
      const bidH = (s.bidNotionalNear / maxVal) * (h * 0.45)
      const askH = (s.askNotionalNear / maxVal) * (h * 0.45)
      ctx.fillStyle = 'rgba(76, 175, 80, 0.55)'
      ctx.fillRect(x, h / 2 - bidH, Math.max(2, w / n), bidH)
      ctx.fillStyle = 'rgba(244, 67, 54, 0.55)'
      ctx.fillRect(x, h / 2, Math.max(2, w / n), askH)
    })
  }, [samples])

  if (samples.length === 0) {
    return <p className="depth-muted">Collecting samples…</p>
  }

  return (
    <canvas
      ref={canvasRef}
      className="depth-timeline-canvas"
      width={900}
      height={120}
      aria-hidden
    />
  )
}