import type { Candle } from '../../candles'
import {
  bearishEngulfs,
  bodyInside,
  bullishEngulfs,
  candleStats,
  equalWithinBps,
  gapDown,
  gapUp,
  instanceOf,
  isDoji,
} from '../taCandleMetrics'
import { TWEEZER_BPS } from '../taConstants'
import type { PatternId, PatternInstance } from '../taTypes'

export const detectTwoCandle = (id: PatternId, candles: readonly Candle[]): PatternInstance[] => {
  const out: PatternInstance[] = []
  for (let i = 1; i < candles.length; i++) {
    const a = candles[i - 1]!
    const b = candles[i]!
    const mid = (a.close + b.close) / 2

    if (id === 'bullishEngulfing' && bullishEngulfs(a, b)) {
      out.push(
        instanceOf(
          id,
          'Bullish engulfing',
          'bullish',
          'up',
          [i - 1, i],
          [
            { kind: 'engulf', candleIndex: i, price: b.close },
            { kind: 'body', candleIndex: i - 1, price: a.close },
          ],
          candles,
        ),
      )
    } else if (id === 'bearishEngulfing' && bearishEngulfs(a, b)) {
      out.push(
        instanceOf(
          id,
          'Bearish engulfing',
          'bearish',
          'down',
          [i - 1, i],
          [{ kind: 'engulf', candleIndex: i, price: b.close }],
          candles,
        ),
      )
    } else if (id === 'piercingLine') {
      const aStats = candleStats(a)
      const bStats = candleStats(b)
      const aMid = (a.open + a.close) / 2
      if (aStats.bearish && bStats.bullish && b.open < a.close && b.close > aMid) {
        out.push(
          instanceOf(
            id,
            'Piercing line',
            'bullish',
            'up',
            [i - 1, i],
            [{ kind: 'body', candleIndex: i, price: b.close }],
            candles,
          ),
        )
      }
    } else if (id === 'darkCloudCover') {
      const aStats = candleStats(a)
      const bStats = candleStats(b)
      const aMid = (a.open + a.close) / 2
      if (aStats.bullish && bStats.bearish && b.open > a.close && b.close < aMid) {
        out.push(
          instanceOf(
            id,
            'Dark cloud cover',
            'bearish',
            'down',
            [i - 1, i],
            [{ kind: 'body', candleIndex: i, price: b.close }],
            candles,
          ),
        )
      }
    } else if (id === 'harami' && bodyInside(b, a)) {
      const outer = candleStats(a)
      const inner = candleStats(b)
      if (outer.bodyRatio > inner.bodyRatio + 0.2 && !isDoji(inner)) {
        out.push(
          instanceOf(
            id,
            'Harami',
            'neutral',
            'none',
            [i - 1, i],
            [{ kind: 'body', candleIndex: i, price: (b.open + b.close) / 2 }],
            candles,
          ),
        )
      }
    } else if (id === 'haramiCross' && bodyInside(b, a) && isDoji(candleStats(b))) {
      out.push(
        instanceOf(
          id,
          'Harami cross',
          'neutral',
          'none',
          [i - 1, i],
          [{ kind: 'body', candleIndex: i, price: b.close }],
          candles,
        ),
      )
    } else if (id === 'tweezerBottom' && equalWithinBps(a.low, b.low, mid, TWEEZER_BPS) && candleStats(b).bullish) {
      out.push(
        instanceOf(
          id,
          'Tweezer bottom',
          'bullish',
          'up',
          [i - 1, i],
          [
            { kind: 'wickLow', candleIndex: i - 1, price: a.low },
            { kind: 'wickLow', candleIndex: i, price: b.low },
          ],
          candles,
        ),
      )
    } else if (id === 'tweezerTop' && equalWithinBps(a.high, b.high, mid, TWEEZER_BPS) && candleStats(b).bearish) {
      out.push(
        instanceOf(
          id,
          'Tweezer top',
          'bearish',
          'down',
          [i - 1, i],
          [
            { kind: 'wickHigh', candleIndex: i - 1, price: a.high },
            { kind: 'wickHigh', candleIndex: i, price: b.high },
          ],
          candles,
        ),
      )
    } else if (id === 'bullishKicker' && candleStats(a).bearish && candleStats(b).bullish && gapUp(a, b)) {
      out.push(
        instanceOf(id, 'Bullish kicker', 'bullish', 'up', [i - 1, i], [{ kind: 'body', candleIndex: i, price: b.close }], candles),
      )
    } else if (id === 'bearishKicker' && candleStats(a).bullish && candleStats(b).bearish && gapDown(a, b)) {
      out.push(
        instanceOf(id, 'Bearish kicker', 'bearish', 'down', [i - 1, i], [{ kind: 'body', candleIndex: i, price: b.close }], candles),
      )
    }
  }
  return out
}