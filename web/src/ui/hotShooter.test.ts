import { describe, expect, it } from 'vitest'
import { ROLL_STREAK_THRESHOLD } from './rollStreak'
import { HOT_SHOOTER_MS, HOT_SHOOTER_TEXT, openHotShooterGate, stepHotShooterGate } from './hotShooter'

describe('hot shooter banner', () => {
  it('starts once when the current hand passes the threshold', () => {
    let gate = openHotShooterGate(0)
    for (let current = 0; current <= ROLL_STREAK_THRESHOLD; current += 1) {
      const next = stepHotShooterGate(gate, current)
      expect(next).toEqual(gate)
      gate = next
    }
    const started = stepHotShooterGate(gate, ROLL_STREAK_THRESHOLD + 1)
    expect(started).toEqual({ armed: false, playId: 1 })
    expect(stepHotShooterGate(started, ROLL_STREAK_THRESHOLD + 5)).toEqual(started)
    expect(HOT_SHOOTER_TEXT).toBe('Hot Shooter!')
    expect(HOT_SHOOTER_MS).toBe(13_000)
  })

  it('arms again after the hand ends and starts on the next pass', () => {
    const hot = stepHotShooterGate(openHotShooterGate(0), ROLL_STREAK_THRESHOLD + 1)
    const ended = stepHotShooterGate(hot, 0)
    expect(ended).toEqual({ armed: true, playId: 1 })
    expect(stepHotShooterGate(ended, ROLL_STREAK_THRESHOLD)).toEqual(ended)
    expect(stepHotShooterGate(ended, ROLL_STREAK_THRESHOLD + 1)).toEqual({ armed: false, playId: 2 })
  })

  it('does not replay a hand that is already hot when the gate opens', () => {
    const primed = openHotShooterGate(ROLL_STREAK_THRESHOLD + 1)
    expect(primed).toEqual({ armed: false, playId: 0 })
    expect(stepHotShooterGate(primed, ROLL_STREAK_THRESHOLD + 4)).toEqual(primed)
    const ended = stepHotShooterGate(primed, 0)
    expect(stepHotShooterGate(ended, ROLL_STREAK_THRESHOLD + 1).playId).toBe(1)
  })
})
