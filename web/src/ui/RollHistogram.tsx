import type { CSSProperties } from 'react'
import { BONUS_CIRCLE_COLOR, BONUS_CIRCLE_DIAMETER_PX, BONUS_CIRCLE_FLASH_MS } from './bonusConstants'
import {
  HISTOGRAM_COLUMN_WIDTH_FRACTION,
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
        <div className="roll-histogram-columns">
          {columns.map((column) => (
            <div className="roll-histogram-slot" key={column.total}>
              <div className="roll-histogram-track">
                {column.scale > 0 ? (
                  <div
                    className="roll-histogram-bar"
                    style={{
                      height: `${column.scale * 100}%`,
                      width: `${HISTOGRAM_COLUMN_WIDTH_FRACTION * 100}%`,
                      background: HISTOGRAM_ORANGE,
                    }}
                  />
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
