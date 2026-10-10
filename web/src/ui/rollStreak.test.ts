import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ROLL_STREAK_COLOR_STEP_MS,
  ROLL_STREAK_COLORS,
  ROLL_STREAK_THRESHOLD,
  applyRollStreak,
  emptyRollStreak,
  formatRollStreak,
  loadRollStreakLongest,
  rollStreakColorIndex,
  rollStreakColorStep,
  rollStreakNeedsRainbow,
  saveRollStreakLongest,
} from './rollStreak'

const roll = (pointOn: boolean, total: number, streak = emptyRollStreak()) => applyRollStreak(streak, pointOn, total)

describe('roll streak', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('counts every decided roll until a seven-out, and leaves that 7 out of the total', () => {
    let streak = emptyRollStreak()
    const hand: Array<[boolean, number]> = [
      [false, 7],
      [false, 11],
      [false, 6],
      [true, 8],
      [true, 2],
      [true, 6],
      [false, 12],
      [false, 9],
      [true, 5],
    ]
    for (const [pointOn, total] of hand) {
      const step = applyRollStreak(streak, pointOn, total)
      expect(step.sevenOut).toBe(false)
      streak = step.streak
    }
    expect(streak).toEqual({ longest: hand.length, current: hand.length })

    const out = applyRollStreak(streak, true, 7)
    expect(out.sevenOut).toBe(true)
    expect(out.record).toBe(false)
    expect(out.streak).toEqual({ longest: hand.length, current: 0 })
  })

  it('keeps the record on screen and only raises it when a later hand is longer', () => {
    let streak = emptyRollStreak()
    for (const total of [4, 5, 6]) streak = applyRollStreak(streak, streak.current > 0, total).streak
    streak = applyRollStreak(streak, true, 7).streak
    expect(streak).toEqual({ longest: 3, current: 0 })

    const shorter = applyRollStreak(streak, false, 8)
    expect(shorter.record).toBe(false)
    expect(shorter.streak).toEqual({ longest: 3, current: 1 })

    let next = shorter.streak
    next = applyRollStreak(next, true, 9).streak
    const tied = applyRollStreak(next, true, 10)
    expect(tied.record).toBe(false)
    expect(tied.streak.longest).toBe(3)

    const beaten = applyRollStreak(tied.streak, true, 8)
    expect(beaten.record).toBe(true)
    expect(beaten.streak).toEqual({ longest: 4, current: 4 })
  })

  it('does not treat a come-out 7 as seven-out', () => {
    const step = roll(false, 7)
    expect(step.sevenOut).toBe(false)
    expect(step.streak).toEqual({ longest: 1, current: 1 })
  })

  it('starts the rainbow only after the streak exceeds the threshold', () => {
    expect(rollStreakNeedsRainbow(ROLL_STREAK_THRESHOLD)).toBe(false)
    expect(rollStreakNeedsRainbow(ROLL_STREAK_THRESHOLD + 1)).toBe(true)
    expect(formatRollStreak(36)).toBe('Roll Streak 36')
  })

  it('lets the character on the right lead the color change', () => {
    const colors = ROLL_STREAK_COLORS.length
    expect(rollStreakColorIndex(0, 0, colors)).toBe(0)
    expect(rollStreakColorIndex(1, 0, colors)).toBe(1)
    expect(rollStreakColorStep(ROLL_STREAK_COLOR_STEP_MS - 1)).toBe(0)
    expect(rollStreakColorStep(ROLL_STREAK_COLOR_STEP_MS)).toBe(1)
    expect(rollStreakColorIndex(0, 1, colors)).toBe(1)
    expect(rollStreakColorIndex(colors - 1, 1, colors)).toBe(0)
  })

  it('reloads the longest streak after a refresh', () => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    })
    expect(loadRollStreakLongest()).toBe(0)
    saveRollStreakLongest(36)
    expect(loadRollStreakLongest()).toBe(36)
    memory.set('btc-craps.roll-streak', 'nope')
    expect(loadRollStreakLongest()).toBe(0)
  })
})
