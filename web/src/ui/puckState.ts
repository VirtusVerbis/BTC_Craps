import {
  PUCK_OFF_SCALE,
  PUCK_OFF_X,
  PUCK_OFF_Y,
  PUCK_ON_10_SCALE,
  PUCK_ON_10_X,
  PUCK_ON_10_Y,
  PUCK_ON_4_SCALE,
  PUCK_ON_4_X,
  PUCK_ON_4_Y,
  PUCK_ON_5_SCALE,
  PUCK_ON_5_X,
  PUCK_ON_5_Y,
  PUCK_ON_6_SCALE,
  PUCK_ON_6_X,
  PUCK_ON_6_Y,
  PUCK_ON_8_SCALE,
  PUCK_ON_8_X,
  PUCK_ON_8_Y,
  PUCK_ON_9_SCALE,
  PUCK_ON_9_X,
  PUCK_ON_9_Y,
} from './diceConstants'

const POINT_NUMBERS = new Set([4, 5, 6, 8, 9, 10])

export interface PuckSpot {
  x: number
  y: number
  scale: number
}

const ON_SPOTS: Record<number, PuckSpot> = {
  10: { x: PUCK_ON_10_X, y: PUCK_ON_10_Y, scale: PUCK_ON_10_SCALE },
  9: { x: PUCK_ON_9_X, y: PUCK_ON_9_Y, scale: PUCK_ON_9_SCALE },
  8: { x: PUCK_ON_8_X, y: PUCK_ON_8_Y, scale: PUCK_ON_8_SCALE },
  6: { x: PUCK_ON_6_X, y: PUCK_ON_6_Y, scale: PUCK_ON_6_SCALE },
  5: { x: PUCK_ON_5_X, y: PUCK_ON_5_Y, scale: PUCK_ON_5_SCALE },
  4: { x: PUCK_ON_4_X, y: PUCK_ON_4_Y, scale: PUCK_ON_4_SCALE },
}

export interface PuckPlacement extends PuckSpot {
  src: '/Off_Puck.png' | '/On_Puck.png'
}

/** Next pass-line point and the words that sit under the dice total. */
export const applyRoll = (
  point: number | null,
  total: number,
): { point: number | null; label: string | null } => {
  if (point == null) {
    if (total === 7 || total === 11) return { point: null, label: 'Pass Line' }
    if (total === 2 || total === 3 || total === 12) return { point: null, label: 'Pass Line loses' }
    if (POINT_NUMBERS.has(total)) return { point: total, label: null }
    return { point: null, label: null }
  }
  if (total === point) return { point: null, label: 'Point' }
  if (total === 7) return { point: null, label: 'Seven Out!' }
  return { point, label: null }
}

/** OFF in the Don't Come bar, or ON on the established point. */
export const puckPlacement = (point: number | null): PuckPlacement => {
  if (point == null || !ON_SPOTS[point]) {
    return { src: '/Off_Puck.png', x: PUCK_OFF_X, y: PUCK_OFF_Y, scale: PUCK_OFF_SCALE }
  }
  return { src: '/On_Puck.png', ...ON_SPOTS[point] }
}
