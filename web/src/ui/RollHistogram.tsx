import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { BONUS_CIRCLE_COLOR, BONUS_CIRCLE_DIAMETER_PX, BONUS_CIRCLE_FLASH_MS } from './bonusConstants'
import {
  HISTOGRAM_COLUMN_WIDTH_FRACTION,
  HISTOGRAM_COUNT_FONT_RATIO,
  HISTOGRAM_HEIGHT,
  HISTOGRAM_NUMBER_FONT_PX,
  HISTOGRAM_ORANGE,
  HISTOGRAM_PLATE_ALPHA,
  HISTOGRAM_WIDTH,
  HISTOGRAM_X,
  HISTOGRAM_Y,
} from './histogramConstants'
import { histogramColumns } from './histogramModel'

interface RollHistogramProps {
  rolls: readonly number[]
  reveal: number
  animate: boolean
  transitionMs: number
  hits: readonly number[]
  flashing: readonly number[]
}

export const RollHistogram = ({
  rolls,
  reveal,
  animate,
  transitionMs,
  hits,
  flashing,
}: RollHistogramProps) => {
  const columns = histogramColumns(rolls)
  const countFontPx = HISTOGRAM_NUMBER_FONT_PX * HISTOGRAM_COUNT_FONT_RATIO
  const columnsRef = useRef<HTMLDivElement>(null)
  const [aboveTotals, setAboveTotals] = useState<ReadonlySet<number>>(() => new Set())
  useLayoutEffect(() => {
    const root = columnsRef.current
    if (!root) return
    const bars = Array.from(root.querySelectorAll<HTMLElement>('.roll-histogram-bar'))
    const measure = () => {
      const above = new Set<number>()
      for (const bar of bars) {
        if (bar.offsetHeight < countFontPx) above.add(Number(bar.dataset.total))
      }
      setAboveTotals((current) => {
        if (current.size === above.size && [...above].every((total) => current.has(total))) return current
        return above
      })
    }
    const observer = new ResizeObserver(measure)
    for (const bar of bars) observer.observe(bar)
    measure()
    return () => observer.disconnect()
  }, [rolls, countFontPx])
  const sheetStyle: CSSProperties = {
    transform: `translateY(${(1 - reveal) * 100}%)`,
    transition: animate ? `transform ${transitionMs}ms linear` : 'none',
    backgroundColor: `rgba(0, 0, 0, ${HISTOGRAM_PLATE_ALPHA})`,
  }

  return (
    <div
      className="roll-histogram"
      style={{
        left: HISTOGRAM_X,
        top: HISTOGRAM_Y,
        width: HISTOGRAM_WIDTH,
        height: HISTOGRAM_HEIGHT,
      }}
    >
      <div
        className="roll-histogram-sheet"
        data-reveal={reveal.toFixed(3)}
        style={{
          ...sheetStyle,
          ['--bonus-circle' as string]: `${BONUS_CIRCLE_DIAMETER_PX}px`,
          ['--bonus-circle-color' as string]: BONUS_CIRCLE_COLOR,
          ['--bonus-flash-half' as string]: `${BONUS_CIRCLE_FLASH_MS}ms`,
        }}
      >
        <div
          className="roll-histogram-columns"
          ref={columnsRef}
          style={{ ['--histogram-count-font' as string]: `${countFontPx}px` }}
        >
          {columns.map((column) => (
            <div className="roll-histogram-slot" key={column.total}>
              <div className="roll-histogram-track">
                {column.scale > 0 ? (
                  <div
                    className="roll-histogram-bar"
                    data-total={column.total}
                    style={{
                      height: `${column.scale * 100}%`,
                      width: `${HISTOGRAM_COLUMN_WIDTH_FRACTION * 100}%`,
                      background: HISTOGRAM_ORANGE,
                    }}
                  >
                    <span className={aboveTotals.has(column.total) ? 'roll-histogram-count is-above' : 'roll-histogram-count'}>
                      {column.count}
                    </span>
                  </div>
                ) : null}
              </div>
              <div
                className="roll-histogram-number"
                style={{ fontSize: HISTOGRAM_NUMBER_FONT_PX, color: HISTOGRAM_ORANGE }}
              >
                {hits.includes(column.total) ? (
                  <span className={flashing.includes(column.total) ? 'bonus-circle is-flashing' : 'bonus-circle'} />
                ) : null}
                <span className="roll-histogram-digit">{column.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
