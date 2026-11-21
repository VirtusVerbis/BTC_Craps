import { rollStreakNeedsRainbow } from './rollStreak'

export const HOT_SHOOTER_TEXT = 'Hot Shooter!'

export interface HotShooterGate {
  armed: boolean
  playId: number
}

/** A hand already past the threshold does not replay when the gate is created. */
export const openHotShooterGate = (current: number): HotShooterGate => ({
  armed: !rollStreakNeedsRainbow(current),
  playId: 0,
})

/**
 * One play each time the current hand passes the roll-streak threshold.
 * Dropping back to the threshold, including a seven-out, arms the next hand.
 */
export const stepHotShooterGate = (gate: HotShooterGate, current: number): HotShooterGate => {
  if (!rollStreakNeedsRainbow(current)) return gate.armed ? gate : { ...gate, armed: true }
  if (!gate.armed) return gate
  return { armed: false, playId: gate.playId + 1 }
}
