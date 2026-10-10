/**
 * Longest shooter hand shown under the P/L line.
 * A hand is every decided roll until a seven-out. Come-out rolls count.
 * Hitting the point does not end the hand. The seven-out roll does not count.
 */

/** Rainbow starts once the longest streak is greater than this. */
export const ROLL_STREAK_THRESHOLD = 10

/** How long the rainbow stays on after a new record above the threshold. */
export const ROLL_STREAK_RAINBOW_MS = 5_000

/**
 * How long one character keeps a color before stepping to the next.
 * The rightmost character leads. Each character to its left follows one step behind.
 */
export const ROLL_STREAK_COLOR_STEP_MS = 50

/** One step around the rainbow. The wave walks this list. */
export const ROLL_STREAK_COLORS = [
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#32ade6',
  '#5856d6',
  '#af52de',
] as const

const STORAGE_KEY = 'btc-craps.roll-streak'

export interface RollStreak {
  /** Best count shown on the label. */
  longest: number
  /** Rolls in the hand that is still going. Hidden until it beats `longest`. */
  current: number
}

export interface RollStreakView {
  longest: number
  /** Increments when a roll sets a new record above the threshold. */
  rainbowSeq: number
  /** Increments on seven-out so the label returns to the plain style. */
  resetSeq: number
}

export interface RollStreakStep {
  streak: RollStreak
  /** This roll raised the number on the label. */
  record: boolean
  /** Point was on and the roll was a 7. That roll is not counted. */
  sevenOut: boolean
}

export const emptyRollStreak = (): RollStreak => ({ longest: 0, current: 0 })

export const formatRollStreak = (longest: number): string => `Roll Streak ${longest}`

export const rollStreakNeedsRainbow = (longest: number): boolean => longest > ROLL_STREAK_THRESHOLD

/** Color slot for one character. `step` advances with `ROLL_STREAK_COLOR_STEP_MS`. */
export const rollStreakColorIndex = (indexFromLeft: number, step: number, colorCount: number): number => {
  if (colorCount <= 0) return 0
  return ((step + indexFromLeft) % colorCount + colorCount) % colorCount
}

export const rollStreakColorStep = (elapsedMs: number): number => {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  return Math.floor(elapsedMs / ROLL_STREAK_COLOR_STEP_MS)
}

/**
 * Count a decided roll.
 * Point off: every total counts, including a come-out 7.
 * Point on: every total counts except 7, which ends the hand.
 */
export const applyRollStreak = (streak: RollStreak, pointOn: boolean, total: number): RollStreakStep => {
  if (pointOn && total === 7) {
    return {
      streak: { longest: streak.longest, current: 0 },
      record: false,
      sevenOut: true,
    }
  }
  const current = streak.current + 1
  const record = current > streak.longest
  return {
    streak: {
      longest: record ? current : streak.longest,
      current,
    },
    record,
    sevenOut: false,
  }
}

const safeLocalStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const loadRollStreakLongest = (): number => {
  const storage = safeLocalStorage()
  if (!storage) return 0
  try {
    const value = Number(storage.getItem(STORAGE_KEY))
    if (!Number.isFinite(value) || value < 0) return 0
    return Math.floor(value)
  } catch {
    return 0
  }
}

export const saveRollStreakLongest = (longest: number): void => {
  const storage = safeLocalStorage()
  if (!storage || !Number.isFinite(longest) || longest < 0) return
  try {
    storage.setItem(STORAGE_KEY, String(Math.floor(longest)))
  } catch {
    // Private mode or a full quota.
  }
}

export const emptyRollStreakView = (): RollStreakView => ({
  longest: loadRollStreakLongest(),
  rainbowSeq: 0,
  resetSeq: 0,
})
