import { describe, expect, it } from 'vitest'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import {
  BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH,
  BG2_ARROW_DOWN_TOP_OFFSET_FRACTION,
  BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH,
  BG2_ARROW_UP_TOP_OFFSET_FRACTION,
  BG2_CHART_TOP_OFFSET_FRACTION,
} from './androidMirrorConstants'

const PNG_WIDTH = 345
const PNG_HEIGHT = 240
const GREEN_TIP_PAD_PX = 11
const stage = REFERENCE_WIDTH / REFERENCE_HEIGHT

/** Painted top of a width-fit `object-fit: contain` bitmap inside the square meme box. */
const bitmapTop = (boxTop: number, boxAspect: number): number => {
  const imageAspect = PNG_HEIGHT / PNG_WIDTH
  const letterbox = ((boxAspect - imageAspect) / 2) * stage
  return boxTop + letterbox
}

describe('meme arrow placement', () => {
  it('puts the green tip on the candle chart, not on the stage edge', () => {
    const tipPad = (GREEN_TIP_PAD_PX / PNG_WIDTH) * stage
    const greenTip = bitmapTop(BG2_ARROW_UP_TOP_OFFSET_FRACTION, BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH) + tipPad
    expect(greenTip).toBeCloseTo(BG2_CHART_TOP_OFFSET_FRACTION, 10)
  })

  it('puts the red bitmap top on that same line', () => {
    const redTop = bitmapTop(BG2_ARROW_DOWN_TOP_OFFSET_FRACTION, BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH)
    expect(redTop).toBeCloseTo(BG2_CHART_TOP_OFFSET_FRACTION, 10)
  })
})
