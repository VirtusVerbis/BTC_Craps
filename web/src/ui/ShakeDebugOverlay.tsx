import { SHAKE_THRESHOLD_X_MPS2, SHAKE_THRESHOLD_Y_MPS2, SHAKE_THRESHOLD_Z_MPS2 } from './diceConstants'
import type { ShakeDebugView } from './useShakeThrow'

/** Factory bar width. A higher saved line grows the scale so the mark stays on screen. */
const BAR_FULL_MPS2 = 30
const BAR_CLEAR_MULTIPLE = 3

const fullScale = (threshold: number): number => Math.max(BAR_FULL_MPS2, threshold * BAR_CLEAR_MULTIPLE)

const fill = (value: number, full: number): { left: string; width: string } => {
  const clipped = Math.max(-full, Math.min(full, value)) / full
  if (clipped >= 0) return { left: '50%', width: `${clipped * 50}%` }
  return { left: `${50 + clipped * 50}%`, width: `${-clipped * 50}%` }
}

const mark = (value: number, full: number): string =>
  `${50 + (Math.max(-full, Math.min(full, value)) / full) * 50}%`

const signed = (value: number, positive: string, negative: string): string => {
  const text = value.toFixed(1)
  if (value > 0) return `${text} ${positive}`
  if (value < 0) return `${text} ${negative}`
  return text
}

const Bar = ({ label, value, threshold }: { label: string; value: number; threshold: number }) => {
  const full = fullScale(threshold)
  const box = fill(value, full)
  return (
    <div className="shake-debug-row">
      <span className="shake-debug-axis">{label}</span>
      <span className="shake-debug-track">
        <span className="shake-debug-fill" style={box} />
        <span className="shake-debug-zero" />
        <span className="shake-debug-threshold" style={{ left: mark(-threshold, full) }} />
        <span className="shake-debug-threshold" style={{ left: mark(threshold, full) }} />
      </span>
      <span className="shake-debug-value">{value.toFixed(1)}</span>
    </div>
  )
}

/** Live axes and the totals a shake launch would use. Marks sit on the saved thresholds. */
export const ShakeDebugOverlay = ({
  view,
  thresholdX = SHAKE_THRESHOLD_X_MPS2,
  thresholdY = SHAKE_THRESHOLD_Y_MPS2,
  thresholdZ = SHAKE_THRESHOLD_Z_MPS2,
}: {
  view: ShakeDebugView
  thresholdX?: number
  thresholdY?: number
  thresholdZ?: number
}) => (
  <div className="shake-debug" aria-live="polite">
    <Bar label="X" value={view.x} threshold={thresholdX} />
    <Bar label="Y" value={view.y} threshold={thresholdY} />
    <Bar label="Z" value={view.z} threshold={thresholdZ} />
    <p className="shake-debug-totals">
      hammer {view.xTotal.toFixed(1)} · book {view.pushTotal.toFixed(1)} · lift {view.yTotal.toFixed(1)}
    </p>
    <p className="shake-debug-totals">
      roll {signed(view.roll, 'forward', 'back')} · spin {signed(view.spin, 'right', 'left')}
    </p>
    <p className="shake-debug-meta">
      {view.note}
      {view.remainingMs > 0 ? ` · ${(view.remainingMs / 1000).toFixed(1)}s` : ''}
    </p>
  </div>
)
