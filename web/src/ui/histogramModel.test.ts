import { describe, expect, it } from 'vitest'
import {
  HISTOGRAM_FALL_MS,
  HISTOGRAM_HIDDEN_MS,
  HISTOGRAM_RISE_MS,
  HISTOGRAM_VISIBLE_MS,
  HISTOGRAM_WINDOW,
} from './histogramConstants'
import { histogramColumns, histogramPhase, pushRoll } from './histogramModel'

describe('roll histogram window', () => {
  it('keeps only the totals it is given', () => {
    expect(pushRoll([], 7)).toEqual([7])
    expect(pushRoll([7], 11)).toEqual([7, 11])
  })

  it('drops the oldest total once the window is full', () => {
    let rolls = [2, ...Array.from({ length: HISTOGRAM_WINDOW - 1 }, () => 7)]
    rolls = pushRoll(rolls, 12)
    expect(rolls).toHaveLength(HISTOGRAM_WINDOW)
    expect(rolls[0]).toBe(7)
    expect(rolls.at(-1)).toBe(12)
    expect(rolls.filter((total) => total === 2)).toHaveLength(0)
  })

  it('stretches columns against the busiest total', () => {
    const rolls = [7, 7, 7, 7, 4, 4]
    const columns = histogramColumns(rolls)
    expect(columns.map((column) => column.total)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(columns.find((column) => column.total === 7)).toMatchObject({ count: 4, scale: 1 })
    expect(columns.find((column) => column.total === 4)).toMatchObject({ count: 2, scale: 0.5 })
    expect(columns.find((column) => column.total === 2)).toMatchObject({ count: 0, scale: 0 })
  })

  it('gives every leader a full column when the busiest count is tied', () => {
    const columns = histogramColumns([7, 7, 11, 11])
    expect(columns.find((column) => column.total === 7)?.scale).toBe(1)
    expect(columns.find((column) => column.total === 11)?.scale).toBe(1)
    expect(columns.find((column) => column.total === 6)?.scale).toBe(0)
  })

  it('draws no columns before any counted roll', () => {
    expect(histogramColumns([]).every((column) => column.scale === 0 && column.count === 0)).toBe(true)
  })
})

describe('histogram show cycle', () => {
  const riseEnd = HISTOGRAM_RISE_MS
  const upEnd = riseEnd + HISTOGRAM_VISIBLE_MS
  const fallEnd = upEnd + HISTOGRAM_FALL_MS
  const cycle = fallEnd + HISTOGRAM_HIDDEN_MS

  it('starts on the rise when the splash ends', () => {
    expect(histogramPhase(0)).toMatchObject({
      motion: 'rising',
      reveal: 0,
      transitionMs: HISTOGRAM_RISE_MS,
      msUntilNext: HISTOGRAM_RISE_MS,
    })
    expect(histogramPhase(HISTOGRAM_RISE_MS / 2).reveal).toBeCloseTo(0.5)
  })

  it('holds up through the visible window, then falls', () => {
    expect(histogramPhase(riseEnd)).toMatchObject({ motion: 'up', reveal: 1, transitionMs: 0 })
    expect(histogramPhase(upEnd - 1).motion).toBe('up')
    expect(histogramPhase(upEnd)).toMatchObject({
      motion: 'falling',
      reveal: 1,
      transitionMs: HISTOGRAM_FALL_MS,
    })
    expect(histogramPhase(upEnd + HISTOGRAM_FALL_MS / 2).reveal).toBeCloseTo(0.5)
  })

  it('stays hidden until the next rise', () => {
    expect(histogramPhase(fallEnd)).toMatchObject({ motion: 'hidden', reveal: 0, transitionMs: 0 })
    expect(histogramPhase(fallEnd + HISTOGRAM_HIDDEN_MS / 2)).toMatchObject({ motion: 'hidden', reveal: 0 })
    expect(histogramPhase(cycle)).toMatchObject({ motion: 'rising', reveal: 0 })
    expect(histogramPhase(cycle + 1).motion).toBe('rising')
  })
})
