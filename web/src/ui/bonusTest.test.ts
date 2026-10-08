import { describe, expect, it } from 'vitest'
import { applyBonusRoll } from './bonusCraps'
import { bonusTestHand, bonusTestMissingTotal, isBonusTestSeed } from './bonusTest'

describe('bonus test seeds', () => {
  it('accepts the three query values', () => {
    expect(isBonusTestSeed('small')).toBe(true)
    expect(isBonusTestSeed('tall')).toBe(true)
    expect(isBonusTestSeed('both')).toBe(true)
    expect(isBonusTestSeed('1')).toBe(false)
    expect(isBonusTestSeed(null)).toBe(false)
  })

  it('finishes All Small on 6', () => {
    const step = applyBonusRoll(bonusTestHand('small'), bonusTestMissingTotal('small'))
    expect(step.lines).toEqual(['All Small Winner! 30 to 1'])
    expect(step.flash).toBe('small')
  })

  it('finishes All Tall on 8', () => {
    const step = applyBonusRoll(bonusTestHand('tall'), bonusTestMissingTotal('tall'))
    expect(step.lines).toEqual(['All Tall Winner! 30 to 1'])
    expect(step.flash).toBe('tall')
  })

  it('finishes All Tall and Make Em All together on 8', () => {
    const step = applyBonusRoll(bonusTestHand('both'), bonusTestMissingTotal('both'))
    expect(step.lines).toEqual(['All Tall Winner! 30 to 1', "Make 'Em All Winner! 150 to 1"])
    expect(step.flash).toBe('all')
  })
})
