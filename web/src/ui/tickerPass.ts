export interface TickerPass {
  start: number
  end: number
  passMs: number
}

/**
 * One crossing of the bar.
 * The phrase starts just off the right edge and ends just off the left, then the loop repeats.
 */
export const tickerPass = (boxWidth: number, phraseWidth: number, speedPxPerSec: number): TickerPass => {
  const distance = boxWidth + phraseWidth
  return {
    start: boxWidth,
    end: -phraseWidth,
    passMs: speedPxPerSec > 0 ? (distance / speedPxPerSec) * 1000 : 0,
  }
}
