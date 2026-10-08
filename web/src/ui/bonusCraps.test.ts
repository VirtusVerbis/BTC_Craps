import { describe, expect, it } from 'vitest'
import { applyBonusRoll, bonusFlashTotals, emptyBonusHand, type BonusHand, type BonusStep } from './bonusCraps'

const play = (totals: readonly number[], start: BonusHand = emptyBonusHand()): BonusStep => {
  let hand = start
  let step: BonusStep = { hand, lines: [], flash: null }
  for (const total of totals) {
    step = applyBonusRoll(hand, total)
    hand = step.hand
  }
  return step
}

describe('bonus craps hand', () => {
  it('ignores come-out totals before the first point', () => {
    for (const total of [2, 3, 7, 11, 12]) {
      expect(applyBonusRoll(emptyBonusHand(), total)).toEqual({
        hand: emptyBonusHand(),
        lines: [],
        flash: null,
      })
    }
  })

  it('starts on the first point number and marks it', () => {
    const step = applyBonusRoll(emptyBonusHand(), 6)
    expect(step.hand).toMatchObject({ started: true, hits: [6], wonSmall: false })
    expect(step.lines).toEqual([])
  })

  it('counts 2, 3, 11, and 12 after the hand has started', () => {
    let hand = applyBonusRoll(emptyBonusHand(), 4).hand
    for (const total of [2, 3, 11, 12]) {
      const step = applyBonusRoll(hand, total)
      expect(step.hand.hits).toContain(total)
      hand = step.hand
    }
    expect(hand.hits).toEqual([2, 3, 4, 11, 12])
  })

  it('does not add a second circle for a repeat', () => {
    const started = applyBonusRoll(emptyBonusHand(), 4).hand
    expect(applyBonusRoll(started, 4).hand.hits).toEqual([4])
  })

  it('wins All Small once and flashes only 2 through 6', () => {
    const step = play([4, 2, 3, 5, 6])
    expect(step.lines).toEqual(['All Small Winner! 30 to 1'])
    expect(step.flash).toBe('small')
    expect(bonusFlashTotals(step.flash)).toEqual([2, 3, 4, 5, 6])
    expect(step.hand.wonSmall).toBe(true)
    expect(step.hand.wonAll).toBe(false)
    expect(applyBonusRoll(step.hand, 6).lines).toEqual([])
  })

  it('wins All Tall and Make \'Em All together when Small is already won', () => {
    const small = play([4, 2, 3, 5, 6]).hand
    const step = play([8, 9, 10, 11, 12], small)
    expect(step.lines).toEqual(['All Tall Winner! 30 to 1', "Make 'Em All Winner! 150 to 1"])
    expect(step.flash).toBe('all')
    expect(bonusFlashTotals('all')).toEqual([2, 3, 4, 5, 6, 8, 9, 10, 11, 12])
  })

  it('wins All Small and Make \'Em All together when Tall is already won', () => {
    const tall = play([8, 9, 10, 11, 12]).hand
    const step = play([2, 3, 4, 5, 6], tall)
    expect(step.lines).toEqual(['All Small Winner! 30 to 1', "Make 'Em All Winner! 150 to 1"])
    expect(step.flash).toBe('all')
  })

  it('cannot newly win all three sets on one roll', () => {
    const missingBothSides = play([4, 2, 3, 5, 8, 9, 10, 11]).hand
    const step = applyBonusRoll(missingBothSides, 6)
    expect(step.lines).toEqual(['All Small Winner! 30 to 1'])
    expect(step.flash).toBe('small')
    expect(step.hand.wonAll).toBe(false)
  })

  it('clears the hand on any 7 so the sets can be won again', () => {
    const won = play([4, 2, 3, 5, 6]).hand
    const cleared = applyBonusRoll(won, 7)
    expect(cleared.hand).toEqual(emptyBonusHand())
    expect(cleared.lines).toEqual([])
    expect(cleared.flash).toBeNull()
    expect(play([4, 2, 3, 5, 6], cleared.hand).lines).toEqual(['All Small Winner! 30 to 1'])
  })
})
