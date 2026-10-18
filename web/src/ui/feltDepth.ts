export type DepthBand = 'behind' | 'between' | 'front'

/**
 * Canvas and guide slots inside `.felt-depth`.
 * Far die sits at 2, near die at 4, so each canvas is on one side of the dice.
 */
export const BAND_Z: Record<DepthBand, string> = {
  behind: '1',
  between: '3',
  front: '5',
}

export const FAR_DIE_Z = '2'
export const NEAR_DIE_Z = '4'

/** Puck draws before a chip plate that shares its felt depth. */
export const PUCK_PLATE = -1

/**
 * Felt `z` minus the same toward-camera rise `dieScreenCenter` uses.
 * Tilt is negative, so a positive height makes this smaller (closer).
 */
export const dieDepthKey = (feltZ: number, heightPx: number, tiltDeg: number): number => {
  const tiltRad = (tiltDeg * Math.PI) / 180
  const towardCamera = -heightPx * Math.sin(tiltRad)
  return feltZ - towardCamera
}

/**
 * Which canvas holds an object at `feltZ`.
 * A tie with a die paints in the closer canvas, so the felt object covers that die.
 * No visible dice: everything is in the front canvas.
 */
export const depthBand = (feltZ: number, dieKeys: readonly number[]): DepthBand => {
  if (dieKeys.length === 0) return 'front'
  let far = dieKeys[0]
  let near = dieKeys[0]
  for (let i = 1; i < dieKeys.length; i += 1) {
    const key = dieKeys[i]
    if (key > far) far = key
    if (key < near) near = key
  }
  if (feltZ > far) return 'behind'
  if (feltZ > near) return 'between'
  return 'front'
}

/** Farther felt depth first, then lower plate. Plate order never crosses a felt gap. */
export const compareDepth = (
  a: { feltZ: number; plate: number },
  b: { feltZ: number; plate: number },
): number => {
  if (a.feltZ !== b.feltZ) return b.feltZ - a.feltZ
  return a.plate - b.plate
}
