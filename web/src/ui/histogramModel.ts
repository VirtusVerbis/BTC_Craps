import {
  HISTOGRAM_FALL_MS,
  HISTOGRAM_HIDDEN_MS,
  HISTOGRAM_RISE_MS,
  HISTOGRAM_VISIBLE_MS,
  HISTOGRAM_WINDOW,
} from './histogramConstants'

export const HISTOGRAM_TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export type HistogramTotal = (typeof HISTOGRAM_TOTALS)[number]

export interface HistogramColumn {
  total: HistogramTotal
  count: number
  /** 0 hides the column. The busiest totals are 1, and a tie shares 1. */
  scale: number
}

export type HistogramMotion = 'rising' | 'up' | 'falling' | 'hidden'

export interface HistogramPhase {
  motion: HistogramMotion
  /** 0 is fully below the cut line. 1 is fully up. */
  reveal: number
  /** Milliseconds left in the current rise or fall. 0 when the plate is settled. */
  transitionMs: number
  /** Milliseconds until the next motion boundary. */
  msUntilNext: number
}

const CYCLE_MS = HISTOGRAM_RISE_MS + HISTOGRAM_VISIBLE_MS + HISTOGRAM_FALL_MS + HISTOGRAM_HIDDEN_MS

/** Last counted totals. A refresh reads this back as the histogram's save point. */
export const HISTOGRAM_ROLLS_KEY = 'btc-craps.histogram-rolls'

const COUNTED_TOTALS = new Set<number>(HISTOGRAM_TOTALS)

const isCountedTotal = (value: unknown): value is number =>
  typeof value === 'number' && COUNTED_TOTALS.has(value)

const safeLocalStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Totals saved in this browser. Bad or oversized cache entries are dropped. */
export const readStoredRolls = (storage: Storage | null): number[] => {
  if (!storage) return []
  try {
    const raw = storage.getItem(HISTOGRAM_ROLLS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const rolls = parsed.filter(isCountedTotal)
    return rolls.length > HISTOGRAM_WINDOW ? rolls.slice(-HISTOGRAM_WINDOW) : rolls
  } catch {
    return []
  }
}

/** Writes the current window. A full or blocked store leaves memory as the source of truth. */
export const writeStoredRolls = (storage: Storage | null, rolls: readonly number[]): void => {
  if (!storage) return
  try {
    storage.setItem(HISTOGRAM_ROLLS_KEY, JSON.stringify(rolls))
  } catch {
    // Private mode or a full quota.
  }
}

export const loadHistogramRolls = (): number[] => readStoredRolls(safeLocalStorage())

export const saveHistogramRolls = (rolls: readonly number[]): void => {
  writeStoredRolls(safeLocalStorage(), rolls)
}

/** Append one counted total and drop the oldest once the window is full. */
export const pushRoll = (rolls: readonly number[], total: number): number[] => {
  const next = rolls.length >= HISTOGRAM_WINDOW ? rolls.slice(rolls.length - HISTOGRAM_WINDOW + 1) : rolls.slice()
  next.push(total)
  return next
}

/** Counts for 2–12. Column height is a fraction of the busiest count in this window. */
export const histogramColumns = (rolls: readonly number[]): HistogramColumn[] => {
  const counts = new Map<number, number>(HISTOGRAM_TOTALS.map((total) => [total, 0]))
  for (const roll of rolls) {
    if (!counts.has(roll)) continue
    counts.set(roll, (counts.get(roll) ?? 0) + 1)
  }
  let busiest = 0
  for (const total of HISTOGRAM_TOTALS) busiest = Math.max(busiest, counts.get(total) ?? 0)
  return HISTOGRAM_TOTALS.map((total) => {
    const count = counts.get(total) ?? 0
    return {
      total,
      count,
      scale: busiest > 0 && count > 0 ? count / busiest : 0,
    }
  })
}

/** Where the plate is on the rise → hold → fall → hidden cycle. Elapsed is measured from splash end. */
export const histogramPhase = (elapsedMs: number): HistogramPhase => {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  const pos = CYCLE_MS > 0 ? elapsed % CYCLE_MS : 0
  const riseEnd = HISTOGRAM_RISE_MS
  const upEnd = riseEnd + HISTOGRAM_VISIBLE_MS
  const fallEnd = upEnd + HISTOGRAM_FALL_MS

  if (pos < riseEnd) {
    const left = riseEnd - pos
    return {
      motion: 'rising',
      reveal: pos / riseEnd,
      transitionMs: left,
      msUntilNext: left,
    }
  }
  if (pos < upEnd) {
    const left = upEnd - pos
    return { motion: 'up', reveal: 1, transitionMs: 0, msUntilNext: left }
  }
  if (pos < fallEnd) {
    const into = pos - upEnd
    const left = HISTOGRAM_FALL_MS - into
    return {
      motion: 'falling',
      reveal: 1 - into / HISTOGRAM_FALL_MS,
      transitionMs: left,
      msUntilNext: left,
    }
  }
  const left = CYCLE_MS - pos
  return {
    motion: 'hidden',
    reveal: 0,
    transitionMs: 0,
    msUntilNext: left,
  }
}
