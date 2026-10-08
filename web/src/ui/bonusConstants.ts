/** Blue behind a number that has been rolled in the current bonus hand. */
export const BONUS_CIRCLE_COLOR = '#2f6bff'

/** Circle diameter, in stage pixels. Larger than the 36px totals so the glyph sits inside it. */
export const BONUS_CIRCLE_DIAMETER_PX = 50//64

/** Half of one on/off blink. 800ms on, then 800ms off. */
export const BONUS_CIRCLE_FLASH_MS = 800

/** How long a winning set's circles blink before they sit solid again. */
export const BONUS_FLASH_MS = 10_000

/**
 * Added to the normal dice-result hold. Winner lines stay up this much longer,
 * and the next throw does not start until they leave.
 */
export const BONUS_LABEL_EXTRA_MS = 4_000

export const BONUS_SMALL_PAYS = 30
export const BONUS_TALL_PAYS = 30
export const BONUS_ALL_PAYS = 150
