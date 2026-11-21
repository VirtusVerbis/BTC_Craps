import type { Candle } from '../../candles'
import { candleStats, gapUp, gapDown, instanceOf, isSmallBody } from '../taCandleMetrics'
import type { PatternId, PatternInstance, TrendContext } from '../taTypes'

export const detectContinuation = (
  id: PatternId,
  candles: readonly Candle[],
  ctx: TrendContext,
): PatternInstance[] => {
  const out: PatternInstance[] = []
  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2]!
    const c1 = candles[i - 1]!
    const c2 = candles[i]!
    const s0 = candleStats(c0)
    const s1 = candleStats(c1)
    const s2 = candleStats(c2)

    if (id === 'risingThreeMethods') {
      if (
        s0.bullish &&
        s0.bodyRatio >= 0.5 &&
        isSmallBody(s1) &&
        c1.high <= c0.high &&
        c1.low >= c0.open &&
        s2.bullish &&
        c2.close > c0.high
      ) {
        out.push(
          instanceOf(
            id,
            'Rising three methods',
            'bullish',
            'diagonalUp',
            [i - 2, i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c2.close }],
            candles,
          ),
        )
      }
    } else if (id === 'fallingThreeMethods') {
      if (
        s0.bearish &&
        s0.bodyRatio >= 0.5 &&
        isSmallBody(s1) &&
        c1.low >= c0.low &&
        c1.high <= c0.open &&
        s2.bearish &&
        c2.close < c0.low
      ) {
        out.push(
          instanceOf(
            id,
            'Falling three methods',
            'bearish',
            'diagonalDown',
            [i - 2, i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c2.close }],
            candles,
          ),
        )
      }
    } else if (id === 'sideBySideWhiteLines') {
      if (s0.bullish && s1.bullish && Math.abs(s0.body - s1.body) / Math.max(s0.body, 1e-9) < 0.35 && c1.close > c0.close) {
        out.push(
          instanceOf(
            id,
            'Side-by-side white lines',
            'bullish',
            'diagonalUp',
            [i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c1.close }],
            candles,
          ),
        )
      }
    } else if (id === 'bullishSeparatingLines') {
      if (s0.bearish && s1.bullish && Math.abs(c1.open - c0.open) / c0.open < 0.0008 && c1.close > c0.high) {
        out.push(
          instanceOf(
            id,
            'Bullish separating lines',
            'bullish',
            'diagonalUp',
            [i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c1.close }],
            candles,
          ),
        )
      }
    } else if (id === 'bearishSeparatingLines') {
      if (s0.bullish && s1.bearish && Math.abs(c1.open - c0.open) / c0.open < 0.0008 && c1.close < c0.low) {
        out.push(
          instanceOf(
            id,
            'Bearish separating lines',
            'bearish',
            'diagonalDown',
            [i - 1, i],
            [{ kind: 'body', candleIndex: i, price: c1.close }],
            candles,
          ),
        )
      }
    } else if (id === 'tasukiGapUp' && gapUp(c0, c1) && s1.bearish && s0.bullish && c1.close > c0.open && c1.open < c0.close) {
      out.push(
        instanceOf(id, 'Tasuki gap up', 'bullish', 'diagonalUp', [i - 1, i], [{ kind: 'body', candleIndex: i, price: c1.close }], candles),
      )
    } else if (id === 'tasukiGapDown' && gapDown(c0, c1) && s1.bullish && s0.bearish && c1.close < c0.open && c1.open > c0.close) {
      out.push(
        instanceOf(id, 'Tasuki gap down', 'bearish', 'diagonalDown', [i - 1, i], [{ kind: 'body', candleIndex: i, price: c1.close }], candles),
      )
    } else if (id === 'upsideGapTwoCrows' && gapUp(c0, c1) && s0.bullish && s1.bearish && s2.bearish) {
      out.push(
        instanceOf(id, 'Upside gap two crows', 'bearish', 'down', [i - 2, i - 1, i], [{ kind: 'wickHigh', candleIndex: i - 1, price: c1.high }], candles),
      )
    } else if (id === 'downsideGapThreeMethods' && gapDown(c0, c1) && isSmallBody(s1) && s2.bearish) {
      out.push(
        instanceOf(id, 'Downside gap three methods', 'bearish', 'diagonalDown', [i - 2, i - 1, i], [{ kind: 'body', candleIndex: i, price: c2.close }], candles),
      )
    }
  }

  if (id === 'bullishFlag' || id === 'bearishFlag' || id === 'matHold') {
    for (let i = 4; i < candles.length; i++) {
      const impulse = candles[i - 4]!
      const sImp = candleStats(impulse)
      const pull = [i - 3, i - 2, i - 1].map((j) => candles[j]!)
      const last = candles[i]!
      const trend = ctx.regimeAt(i)
      if (id === 'bullishFlag' && trend === 'up' && sImp.bullish && sImp.bodyRatio > 0.55) {
        const drift = pull.every((p) => candleStats(p).bodyRatio < 0.45)
        const lastBull = candleStats(last).bullish && last.close > impulse.high
        if (drift && lastBull) {
          out.push(
            instanceOf(
              id,
              'Bullish flag',
              'bullish',
              'diagonalUp',
              [i - 4, i - 3, i - 2, i - 1, i],
              [{ kind: 'body', candleIndex: i, price: last.close }],
              candles,
            ),
          )
        }
      } else if (id === 'bearishFlag' && trend === 'down' && sImp.bearish && sImp.bodyRatio > 0.55) {
        const drift = pull.every((p) => candleStats(p).bodyRatio < 0.45)
        const lastBear = candleStats(last).bearish && last.close < impulse.low
        if (drift && lastBear) {
          out.push(
            instanceOf(
              id,
              'Bearish flag',
              'bearish',
              'diagonalDown',
              [i - 4, i - 3, i - 2, i - 1, i],
              [{ kind: 'body', candleIndex: i, price: last.close }],
              candles,
            ),
          )
        }
      } else if (id === 'matHold' && sImp.bullish && sImp.bodyRatio > 0.5) {
        const controlled = pull.every((p) => p.low >= impulse.low && p.high <= impulse.high * 1.002)
        if (controlled && candleStats(last).bullish && last.close > impulse.close) {
          out.push(
            instanceOf(
              id,
              'Mat hold',
              'bullish',
              'diagonalUp',
              [i - 4, i - 3, i - 2, i - 1, i],
              [{ kind: 'body', candleIndex: i, price: last.close }],
              candles,
            ),
          )
        }
      }
    }
  }

  return out
}