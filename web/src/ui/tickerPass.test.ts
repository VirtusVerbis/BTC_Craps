import { describe, expect, it } from 'vitest'
import { LIQ_TICKER_SPEED_PX_PER_SEC } from './overlayConstants'
import { tickerPass } from './tickerPass'

describe('ticker pass', () => {
  it('carries a short phrase fully off the left edge before the loop repeats', () => {
    const boxWidth = 1080
    const phraseWidth = 360
    const pass = tickerPass(boxWidth, phraseWidth, LIQ_TICKER_SPEED_PX_PER_SEC)
    expect(pass.start).toBe(boxWidth)
    expect(pass.end).toBe(-phraseWidth)
    expect(pass.start - pass.end).toBe(boxWidth + phraseWidth)
    expect(pass.passMs).toBe(((boxWidth + phraseWidth) / LIQ_TICKER_SPEED_PX_PER_SEC) * 1000)
  })
})
