import type { Candle } from '../../candles'
import {
  bodyInside,
  bearishEngulfs,
  bullishEngulfs,
  candleStats,
  gapDown,
  gapUp,
  instanceOf,
  isDoji,
  isSmallBody,
} from '../taCandleMetrics'
import type { PatternId, PatternInstance } from '../taTypes'

const midpoint = (c: Candle): number => (c.open + c.close) / 2

export const detectThreeCandle = (id: PatternId, candles: readonly Candle[]): PatternInstance[] => {
  const out: PatternInstance[] = []
  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2]!
    const c1 = candles[i - 1]!
    const c2 = candles[i]!
    const s0 = candleStats(c0)
    const s1 = candleStats(c1)
    const s2 = candleStats(c2)

    if (id === 'morningStar' || id === 'morningDojiStar') {
      const dojiMid = id === 'morningDojiStar' ? isDoji(s1) : isSmallBody(s1)
      if (s0.bearish && s2.bullish && dojiMid && c2.close > midpoint(c0)) {
        out.push(
          instanceOf(
            id,
            id === 'morningDojiStar' ? 'Morning doji star' : 'Morning star',
            'bullish',
            'up',
            [i - 2, i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c2.close }],
            candles,
          ),
        )
      }
    } else if (id === 'eveningStar' || id === 'eveningDojiStar') {
      const dojiMid = id === 'eveningDojiStar' ? isDoji(s1) : isSmallBody(s1)
      if (s0.bullish && s2.bearish && dojiMid && c2.close < midpoint(c0)) {
        out.push(
          instanceOf(
            id,
            id === 'eveningDojiStar' ? 'Evening doji star' : 'Evening star',
            'bearish',
            'down',
            [i - 2, i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c2.close }],
            candles,
          ),
        )
      }
    } else if (id === 'threeWhiteSoldiers' && s0.bullish && s1.bullish && s2.bullish) {
      if (c1.close > c0.close && c2.close > c1.close && s0.bodyRatio > 0.4 && s1.bodyRatio > 0.4 && s2.bodyRatio > 0.4) {
        out.push(
          instanceOf(
            id,
            'Three white soldiers',
            'bullish',
            'diagonalUp',
            [i - 2, i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c2.close }],
            candles,
          ),
        )
      }
    } else if (id === 'threeBlackCrows' && s0.bearish && s1.bearish && s2.bearish) {
      if (c1.close < c0.close && c2.close < c1.close && s0.bodyRatio > 0.4 && s1.bodyRatio > 0.4 && s2.bodyRatio > 0.4) {
        out.push(
          instanceOf(
            id,
            'Three black crows',
            'bearish',
            'diagonalDown',
            [i - 2, i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c2.close }],
            candles,
          ),
        )
      }
    } else if (id === 'threeInsideUp' && s0.bearish && bodyInside(c1, c0) && s2.bullish && c2.close > c0.high) {
      out.push(
        instanceOf(id, 'Three inside up', 'bullish', 'up', [i - 2, i - 1, i], [{ kind: 'body', candleIndex: i, price: c2.close }], candles),
      )
    } else if (id === 'threeInsideDown' && s0.bullish && bodyInside(c1, c0) && s2.bearish && c2.close < c0.low) {
      out.push(
        instanceOf(id, 'Three inside down', 'bearish', 'down', [i - 2, i - 1, i], [{ kind: 'body', candleIndex: i, price: c2.close }], candles),
      )
    } else if (id === 'threeOutsideUp' && s0.bearish && bullishEngulfs(c0, c1) && s2.bullish && c2.close > c1.close) {
      out.push(
        instanceOf(id, 'Three outside up', 'bullish', 'up', [i - 2, i - 1, i], [{ kind: 'engulf', candleIndex: i - 1, price: c1.close }], candles),
      )
    } else if (id === 'threeOutsideDown' && s0.bullish && bearishEngulfs(c0, c1) && s2.bearish && c2.close < c1.close) {
      out.push(
        instanceOf(id, 'Three outside down', 'bearish', 'down', [i - 2, i - 1, i], [{ kind: 'engulf', candleIndex: i - 1, price: c1.close }], candles),
      )
    } else if (id === 'bullishAbandonedBaby' && gapDown(c0, c1) && isDoji(s1) && gapUp(c1, c2) && s2.bullish) {
      out.push(
        instanceOf(id, 'Bullish abandoned baby', 'bullish', 'up', [i - 2, i - 1, i], [{ kind: 'body', candleIndex: i - 1, price: c1.close }], candles),
      )
    } else if (id === 'bearishAbandonedBaby' && gapUp(c0, c1) && isDoji(s1) && gapDown(c1, c2) && s2.bearish) {
      out.push(
        instanceOf(id, 'Bearish abandoned baby', 'bearish', 'down', [i - 2, i - 1, i], [{ kind: 'body', candleIndex: i - 1, price: c1.close }], candles),
      )
    }
  }
  return out
}