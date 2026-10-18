import { describe, expect, it } from 'vitest'
import { EYE_COLUMN_LEFT_PX, EYE_COLUMN_MARGIN_PX, EYE_COLUMN_RIGHT_PX, EYE_LOOK_MS } from './eyeConstants'
import {
  columnAt,
  columnsOf,
  eyePatchCrop,
  glanceColumn,
  glanceOffsetMs,
  pairStrip,
  resolveEyeGaze,
  stickyColumn,
} from './eyeGaze'

const leftEdge = EYE_COLUMN_LEFT_PX
const rightEdge = EYE_COLUMN_RIGHT_PX
const margin = EYE_COLUMN_MARGIN_PX

describe('sticky column', () => {
  it('takes the column a die is actually in on the first sample', () => {
    expect(stickyColumn(leftEdge - margin - 1, null)).toBe('left')
    expect(stickyColumn(leftEdge - 10, null)).toBe('left')
    expect(stickyColumn(leftEdge, null)).toBe('center')
    expect(stickyColumn(rightEdge - 1, null)).toBe('center')
    expect(stickyColumn(rightEdge, null)).toBe('right')
  })

  it('holds the current column until the die is 40px past the line', () => {
    expect(stickyColumn(leftEdge + margin - 1, 'left')).toBe('left')
    expect(stickyColumn(leftEdge + margin, 'left')).toBe('center')
    expect(stickyColumn(rightEdge + margin - 1, 'center')).toBe('center')
    expect(stickyColumn(rightEdge + margin, 'center')).toBe('right')
    expect(stickyColumn(leftEdge - margin, 'center')).toBe('center')
    expect(stickyColumn(leftEdge - margin - 1, 'center')).toBe('left')
    expect(stickyColumn(rightEdge - margin, 'right')).toBe('right')
    expect(stickyColumn(rightEdge - margin - 1, 'right')).toBe('center')
  })
})

describe('pair strip', () => {
  it('uses left, right, the cross-look, or the center painting', () => {
    expect(pairStrip('left', 'left')).toBe('left')
    expect(pairStrip('right', 'right')).toBe('right')
    expect(pairStrip('left', 'right')).toBe('split')
    expect(pairStrip('right', 'left')).toBe('split')
    expect(pairStrip('left', 'center')).toBe('none')
    expect(pairStrip('center', 'right')).toBe('none')
    expect(pairStrip('center', 'center')).toBe('none')
    expect(pairStrip(null, null)).toBe('none')
    expect(pairStrip('left', null)).toBe('left')
    expect(pairStrip(null, 'center')).toBe('none')
  })
})

describe('betting glance', () => {
  it('holds a single column and steps the rest once a second', () => {
    expect(glanceColumn(['left'], 2_500, 0)).toBe('left')
    expect(glanceColumn(['left', 'right'], 0, 0)).toBe('left')
    expect(glanceColumn(['left', 'right'], EYE_LOOK_MS, 0)).toBe('right')
    expect(glanceColumn(['left', 'right'], EYE_LOOK_MS * 2, 0)).toBe('left')
    expect(glanceColumn([], 0, 0)).toBeNull()
  })

  it('offsets each character by 250ms', () => {
    expect(glanceOffsetMs('wolf')).toBe(0)
    expect(glanceOffsetMs('oldLady')).toBe(250)
    expect(glanceColumn(['left', 'center'], EYE_LOOK_MS - 250, glanceOffsetMs('oldLady'))).toBe('center')
    expect(glanceColumn(['left', 'center'], EYE_LOOK_MS - 250, glanceOffsetMs('wolf'))).toBe('left')
  })

  it('keeps first-seen column order', () => {
    expect(columnsOf([100, 200, 500, 800, 150])).toEqual(['left', 'center', 'right'])
    expect(columnAt(700)).toBe('center')
  })
})

describe('resolve eye gaze', () => {
  const dice = (x0: number, x1: number, visible = true) => [
    { x: x0, visible },
    { x: x1, visible },
  ]

  it('follows both dice and drops a hidden die', () => {
    const both = resolveEyeGaze(dice(100, 120), [null, null], [], 0, false)
    expect(both.strip).toBe('left')
    expect(both.sticky).toEqual(['left', 'left'])
    const held = resolveEyeGaze(dice(leftEdge + 10, leftEdge + 10), both.sticky, [], 0, false)
    expect(held.strip).toBe('left')
    const one = resolveEyeGaze([{ x: 800, visible: true }, { x: 100, visible: false }], [null, 'left'], [], 0, false)
    expect(one.strip).toBe('right')
    expect(one.sticky).toEqual(['right', null])
  })

  it('shows a betting glance until the shooter launches', () => {
    const glances = [{ character: 'cat' as const, columns: ['left', 'right'] as const, startedMs: 0, offsetMs: 0 }]
    const holding = resolveEyeGaze(dice(540, 540), [null, null], glances, EYE_LOOK_MS, false)
    expect(holding.strip).toBe('none')
    expect(holding.patches.cat).toBe('right')
    const flying = resolveEyeGaze(dice(100, 800), holding.sticky, glances, EYE_LOOK_MS, true)
    expect(flying.patches).toEqual({})
    expect(flying.strip).toBe('split')
  })
})

describe('eye patch crop', () => {
  it('maps the wolf window onto the stage and shifts the painting under it', () => {
    const crop = eyePatchCrop()
    expect(parseFloat(crop.left)).toBeCloseTo((135 / 720) * 100, 6)
    expect(parseFloat(crop.top)).toBeCloseTo((174 / 1280) * 100, 6)
    expect(parseFloat(crop.width)).toBeCloseTo((50 / 720) * 100, 6)
    expect(parseFloat(crop.height)).toBeCloseTo((32 / 1280) * 100, 6)
    expect(parseFloat(crop.imgWidth)).toBeCloseTo((720 / 50) * 100, 6)
    expect(parseFloat(crop.imgHeight)).toBeCloseTo((1280 / 32) * 100, 6)
    expect(parseFloat(crop.imgLeft)).toBeCloseTo((-135 / 50) * 100, 6)
    expect(parseFloat(crop.imgTop)).toBeCloseTo((-174 / 32) * 100, 6)
  })
})
