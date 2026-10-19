import { describe, expect, it } from 'vitest'
import { EYE_MARK_PREVIEW_ON, EYE_MARK_PREVIEW_SKULL_ON, WIN_EYE_MARK } from './eyeMarkConstants'
import { displayedEyeMarks, emptyPhaseBtc, eyeMarkFor, eyeMarksShouldClear, previewEyeMarks, stepPhaseBtc } from './eyeMarks'

const delta = (character: 'wolf' | 'oldLady' | 'cat' | 'oldMan', btc: number) => ({ character, btc })

describe('eye mark choice', () => {
  it('uses the skull for a loss and the character win mark for a gain', () => {
    expect(eyeMarkFor('wolf', -1)).toBe('skull')
    expect(eyeMarkFor('oldMan', -0.5)).toBe('skull')
    expect(eyeMarkFor('cat', -2)).toBe('skull')
    expect(eyeMarkFor('oldLady', -2)).toBe('skull')
    expect(eyeMarkFor('cat', 1)).toBe('bitcoin')
    expect(eyeMarkFor('oldLady', 0.25)).toBe('bitcoin')
    expect(eyeMarkFor('wolf', 3)).toBe('dollar')
    expect(eyeMarkFor('oldMan', 3)).toBe('dollar')
  })

  it('leaves a flat result unmarked', () => {
    expect(eyeMarkFor('cat', 0)).toBeNull()
    expect(eyeMarkFor('wolf', Number.NaN)).toBeNull()
  })
})

describe('point phase totals', () => {
  it('keeps a place win in the phase until the point is decided', () => {
    const mid = stepPhaseBtc(emptyPhaseBtc(), 8, 8, [delta('cat', 2)])
    expect(mid.marks).toBeNull()
    expect(mid.phase.cat).toBe(2)
    const made = stepPhaseBtc(mid.phase, 8, null, [delta('cat', 1), delta('wolf', -1)])
    expect(made.phase).toEqual(emptyPhaseBtc())
    expect(made.marks).toEqual({ cat: 'bitcoin', wolf: 'skull' })
  })

  it('ignores the come-out that sets the point', () => {
    const comeOut = stepPhaseBtc(emptyPhaseBtc(), null, 6, [delta('oldMan', 4)])
    expect(comeOut.marks).toBeNull()
    expect(comeOut.phase).toEqual(emptyPhaseBtc())
  })

  it('marks a character from earlier rolls when the deciding roll is flat for them', () => {
    const during = stepPhaseBtc(emptyPhaseBtc(), 9, 9, [delta('oldLady', 5), delta('cat', 0)])
    const out = stepPhaseBtc(during.phase, 9, null, [delta('wolf', -2)])
    expect(out.marks).toEqual({ oldLady: 'bitcoin', wolf: 'skull' })
    expect(out.marks?.cat).toBeUndefined()
  })

  it('uses the skull when a 7-out wipes out an earlier win', () => {
    const during = stepPhaseBtc(emptyPhaseBtc(), 5, 5, [delta('cat', 1)])
    const out = stepPhaseBtc(during.phase, 5, null, [delta('cat', -4)])
    expect(out.marks?.cat).toBe('skull')
  })
})

describe('eye mark preview', () => {
  it('pins a mark on every character', () => {
    expect(previewEyeMarks()).toEqual({
      wolf: EYE_MARK_PREVIEW_SKULL_ON ? 'skull' : WIN_EYE_MARK.wolf,
      oldLady: EYE_MARK_PREVIEW_SKULL_ON ? 'skull' : WIN_EYE_MARK.oldLady,
      cat: EYE_MARK_PREVIEW_SKULL_ON ? 'skull' : WIN_EYE_MARK.cat,
      oldMan: EYE_MARK_PREVIEW_SKULL_ON ? 'skull' : WIN_EYE_MARK.oldMan,
    })
    const shown = displayedEyeMarks({ wolf: 'skull' })
    expect(shown.wolf).toBe(EYE_MARK_PREVIEW_ON ? previewEyeMarks().wolf : 'skull')
  })
})

describe('clearing eye marks', () => {
  it('clears when every deciding-roll floater is gone', () => {
    expect(eyeMarksShouldClear([3, 4], new Set([3]), false)).toBe(false)
    expect(eyeMarksShouldClear([3, 4], new Set([9]), false)).toBe(true)
  })

  it('clears on the next throw even while floaters are still up', () => {
    expect(eyeMarksShouldClear([3], new Set([3]), true)).toBe(true)
  })

  it('waits for the next throw when the decision spawned no floater', () => {
    expect(eyeMarksShouldClear([], new Set(), false)).toBe(false)
    expect(eyeMarksShouldClear([], new Set(), true)).toBe(true)
  })
})
