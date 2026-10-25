import { SHAKE_THRESHOLD_X_MPS2, SHAKE_THRESHOLD_Y_MPS2, SHAKE_THRESHOLD_Z_MPS2 } from './diceConstants'
import type { ShakeDebugView } from './useShakeThrow'

const FULL_MPS2 = 30

const fill = (value: number): { left: string; width: string } => {
  const clipped = Math.max(-FULL_MPS2, Math.min(FULL_MPS2, value)) / FULL_MPS2
  if (clipped >= 0) return { left: '50%', width: `${clipped * 50}%` }
  return { left: `${50 + clipped * 50}%`, width: `${-clipped * 50}%` }
}

const mark = (value: number): string => `${50 + (Math.max(-FULL_MPS2, Math.min(FULL_MPS2, value)) / FULL_MPS2) * 50}%`

const Bar = ({ label, value, threshold }: { label: string; value: number; threshold: number }) => {
  const box = fill(value)
  return (
    <div className="shake-debug-row">
      <span className="shake-debug-axis">{label}</span>
      <span className="shake-debug-track">
        <span className="shake-debug-fill" style={box} />
        <span className="shake-debug-zero" />
        <span className="shake-debug-threshold" style={{ left: mark(-threshold) }} />
        <span className="shake-debug-threshold" style={{ left: mark(threshold) }} />
      </span>
      <span className="shake-debug-value">{value.toFixed(1)}</span>
    </div>
  )
}

/** Live axes and the totals a shake launch would use. */
export const ShakeDebugOverlay = ({ view }: { view: ShakeDebugView }) => (
  <div className="shake-debug" aria-live="polite">
    <Bar label="X" value={view.x} threshold={SHAKE_THRESHOLD_X_MPS2} />
    <Bar label="Y" value={view.y} threshold={SHAKE_THRESHOLD_Y_MPS2} />
    <Bar label="Z" value={view.z} threshold={SHAKE_THRESHOLD_Z_MPS2} />
    <p className="shake-debug-totals">
      hammer {view.xTotal.toFixed(1)} · book {view.pushTotal.toFixed(1)} · lift {view.yTotal.toFixed(1)}
    </p>
    <p className="shake-debug-meta">
      {view.note}
      {view.remainingMs > 0 ? ` · ${(view.remainingMs / 1000).toFixed(1)}s` : ''}
    </p>
  </div>
)
