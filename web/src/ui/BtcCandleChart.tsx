import { useCallback, useEffect, useRef } from 'react'
import type { Candle } from '../data/candles'

const CHART_BG = '#000000'
const CANDLE_GREEN = '#00c853'
const CANDLE_RED = '#d50000'
const LABEL = 'rgba(255,255,255,0.8)'
const PADDING = 4
const MIN_CANDLE_WIDTH = 2
const WICK = 1
const AXIS_FONT_PX = 38.4
const X_AXIS_HEIGHT = 60
const NUM_Y_TICKS = 5
const NUM_X_TICKS = 5

const formatPriceShort = (price: number): string => {
  if (price >= 1_000_000) {
    const v = price / 1e6
    return v === Math.trunc(v) ? `${v.toFixed(0)}M` : `${v.toFixed(1)}M`
  }
  if (price >= 1000) {
    const v = price / 1000
    return v === Math.trunc(v) ? `${v.toFixed(0)}K` : `${v.toFixed(1)}K`
  }
  return `${Math.round(price)}`
}

const formatTimeLabel = (openTimeMs: number): string => {
  const date = new Date(openTimeMs)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

interface BtcCandleChartProps {
  candles: Candle[]
  showAxisLabels?: boolean
}

export const BtcCandleChart = ({ candles, showAxisLabels = true }: BtcCandleChartProps) => {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w <= 0 || h <= 0) return
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = CHART_BG
    ctx.fillRect(0, 0, w, h)

    if (candles.length === 0) return

    const lows = candles.map((c) => c.low)
    const highs = candles.map((c) => c.high)
    const priceMin = Math.min(...lows)
    const priceMax = Math.max(...highs)
    const priceRange = Math.max(1, priceMax - priceMin)
    const pad = priceRange * 0.02
    const yMin = priceMin - pad
    const yMax = priceMax + pad
    const yRange = Math.max(1, yMax - yMin)

    const axisH = showAxisLabels ? X_AXIS_HEIGHT : 0
    const chartLeft = 0
    const chartRight = w
    const chartTop = PADDING
    const chartBottom = h - PADDING - axisH
    const chartW = Math.max(1, chartRight - chartLeft)
    const chartH = Math.max(1, chartBottom - chartTop)

    const n = candles.length
    const candleW = Math.max(MIN_CANDLE_WIDTH, chartW / n)
    const gap = n > 1 ? (chartW - candleW * n) / (n - 1) : 0

    candles.forEach((c, index) => {
      const xCenter = chartLeft + (index + 0.5) * (candleW + gap)
      const y = (v: number) => chartBottom - ((v - yMin) / yRange) * chartH
      const openY = y(c.open)
      const closeY = y(c.close)
      const highY = y(c.high)
      const lowY = y(c.low)
      const bodyTop = Math.min(openY, closeY)
      const bodyBottom = Math.max(openY, closeY)
      const bodyHeight = Math.max(1, bodyBottom - bodyTop)
      const color = c.close >= c.open ? CANDLE_GREEN : CANDLE_RED

      ctx.strokeStyle = color
      ctx.lineWidth = WICK
      ctx.beginPath()
      ctx.moveTo(xCenter, highY)
      ctx.lineTo(xCenter, lowY)
      ctx.stroke()

      ctx.fillStyle = color
      ctx.fillRect(xCenter - candleW / 2, bodyTop, candleW, bodyHeight)
    })

    if (showAxisLabels) {
      const yLabelInset = AXIS_FONT_PX * 0.55
      const yLabelTop = Math.min(chartBottom, chartTop + yLabelInset)
      const yLabelBottom = Math.max(yLabelTop, chartBottom - yLabelInset)

      ctx.fillStyle = LABEL
      ctx.font = `${AXIS_FONT_PX}px system-ui`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < NUM_Y_TICKS; i++) {
        const price = yMax - (i * (yMax - yMin)) / (NUM_Y_TICKS - 1)
        const yPos = yLabelTop + (i * (yLabelBottom - yLabelTop)) / (NUM_Y_TICKS - 1)
        ctx.fillText(`$${formatPriceShort(price)}`, w - 2, yPos)
      }

      if (candles.length >= NUM_X_TICKS) {
        const indexSet = new Set<number>()
        for (let i = 0; i < NUM_X_TICKS; i++) {
          indexSet.add(Math.floor((i * (candles.length - 1)) / (NUM_X_TICKS - 1)))
        }
        const indices = [...indexSet]
        ctx.textBaseline = 'top'
        indices.forEach((idx, labelIdx) => {
          const xPos = chartLeft + (idx / (candles.length - 1)) * chartW
          if (labelIdx === 0) {
            ctx.textAlign = 'left'
          } else if (labelIdx === indices.length - 1) {
            ctx.textAlign = 'right'
          } else {
            ctx.textAlign = 'center'
          }
          ctx.fillText(formatTimeLabel(candles[idx]?.openTime ?? 0), xPos, chartBottom + 4)
        })
      }
    }
  }, [candles, showAxisLabels])

  useEffect(() => {
    draw()
    const canvas = ref.current
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  return <canvas ref={ref} className="btc-candle-chart" />
}
