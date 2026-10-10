import { REFERENCE_WIDTH } from '../config/constants'
import {
  BONUS_ALL_X,
  BONUS_ALL_Y,
  BONUS_FIELD_FONT_PX,
  BONUS_FIELD_LEAN_DEG,
  BONUS_FIELD_PERSPECTIVE_PX,
  BONUS_FIELD_RADIUS_RATIO,
  BONUS_FIELD_SIZE_PX,
  BONUS_FIELD_SLOPE_DEG,
  BONUS_FIELD_TILT_DEG,
  BONUS_SMALL_X,
  BONUS_SMALL_Y,
  BONUS_TALL_X,
  BONUS_TALL_Y,
} from './bonusFieldConstants'

/** -1 at the left rail, 0 at center, 1 at the right rail. */
const fromCenter = (x: number): number => (x - REFERENCE_WIDTH / 2) / (REFERENCE_WIDTH / 2)

const fieldTransform = (x: number): string => {
  const side = fromCenter(x)
  return `translate(-50%, -50%) perspective(${BONUS_FIELD_PERSPECTIVE_PX}px) rotateX(${BONUS_FIELD_TILT_DEG}deg) skewX(${side * BONUS_FIELD_LEAN_DEG}deg) skewY(${side * BONUS_FIELD_SLOPE_DEG}deg)`
}

const FIELDS = [
  { id: 'small', name: 'A_SML', odds: '30-1', x: BONUS_SMALL_X, y: BONUS_SMALL_Y },
  { id: 'all', name: 'M_ALL', odds: '150-1', x: BONUS_ALL_X, y: BONUS_ALL_Y },
  { id: 'tall', name: 'A_TAL', odds: '30-1', x: BONUS_TALL_X, y: BONUS_TALL_Y },
] as const

export const BonusFields = () => {
  const fontPx = BONUS_FIELD_FONT_PX
  const radiusPx = BONUS_FIELD_SIZE_PX * BONUS_FIELD_RADIUS_RATIO
  return (
    <div className="bonus-fields" aria-hidden>
      {FIELDS.map((field) => (
        <div
          key={field.id}
          className="bonus-field"
          style={{
            left: field.x,
            top: field.y,
            width: BONUS_FIELD_SIZE_PX,
            height: BONUS_FIELD_SIZE_PX,
            borderRadius: radiusPx,
            fontSize: fontPx,
            transform: fieldTransform(field.x),
          }}
        >
          <span>{field.name}</span>
          <span>{field.odds}</span>
        </div>
      ))}
    </div>
  )
}
