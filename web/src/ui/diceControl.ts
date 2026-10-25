import { diceSet, isDiceSetId, type DiceSetId } from './diceSets'
import type { DiceHold } from './dicePhysics'

export type DicePhase = 'come-out' | 'point'
export type DiceGrip = 'side' | 'stacked'

export interface DiceControlSettings {
  comeOut: DiceSetId
  point: DiceSetId
  stacked: boolean
  /** Shooter mode uses the precision aim flow when this is on. Off keeps the flick. */
  precisionTargeting: boolean
  /** Phone pull-back and launch can release a held shot. Off until the shooter opts in. */
  shakeToRoll: boolean
}

export const DEFAULT_DICE_CONTROL: DiceControlSettings = {
  comeOut: 'random',
  point: 'random',
  stacked: false,
  precisionTargeting: false,
  shakeToRoll: false,
}

/** Face-pair counts. Index is `(left - 1) * 6 + (right - 1)` with faces 1 through 6. */
export type FaceGrid = readonly number[]

export type DiceControlBook = Readonly<Record<string, FaceGrid>>

export interface DiceControlRoll {
  phase: DicePhase
  setId: string
  stacked: boolean
  left: number
  right: number
}

export interface DifferenceColumn {
  total: number
  /** Observed share minus the fair share. Positive means more than fair. */
  gap: number
  solid: boolean
  /** Same gap for the Random profile. Null when that profile has no rolls, or this view is Random. */
  randomGap: number | null
}

export interface HardCount {
  total: 4 | 6 | 8 | 10
  count: number
  fair: number
  random: number | null
}

export interface ChartView {
  label: string
  n: number
  columns: DifferenceColumn[]
  hard: HardCount[]
}

const SETTINGS_KEY = 'btc-craps.dice-control-settings'
const COUNTS_KEY = 'btc-craps.dice-control-counts'

const FAIR_BY_TOTAL = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1] as const
const HARD_FACE: Record<4 | 6 | 8 | 10, number> = { 4: 2, 6: 3, 8: 4, 10: 5 }

export const profileKey = (phase: DicePhase, setId: string, grip: DiceGrip): string => `${phase}|${setId}|${grip}`

/** The set the live phase will throw, including its fixed quaternions. */
export const holdFor = (settings: DiceControlSettings, point: number | null): DiceHold => {
  const set = diceSet(point == null ? settings.comeOut : settings.point)
  return { setId: set.id, stacked: settings.stacked, quats: set.quats }
}

const gripOf = (stacked: boolean): DiceGrip => (stacked ? 'stacked' : 'side')

const emptyGrid = (): number[] => Array.from({ length: 36 }, () => 0)

const isGrid = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === 36 &&
  value.every((count) => typeof count === 'number' && Number.isInteger(count) && count >= 0)

const safeStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const loadDiceControlSettings = (): DiceControlSettings => {
  const storage = safeStorage()
  if (!storage) return { ...DEFAULT_DICE_CONTROL }
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? '')
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_DICE_CONTROL }
    const row = parsed as {
      comeOut?: unknown
      point?: unknown
      stacked?: unknown
      precisionTargeting?: unknown
      shakeToRoll?: unknown
    }
    return {
      comeOut: isDiceSetId(row.comeOut) ? row.comeOut : 'random',
      point: isDiceSetId(row.point) ? row.point : 'random',
      stacked: row.stacked === true,
      precisionTargeting: row.precisionTargeting === true,
      shakeToRoll: row.shakeToRoll === true,
    }
  } catch {
    return { ...DEFAULT_DICE_CONTROL }
  }
}

export const saveDiceControlSettings = (settings: DiceControlSettings): void => {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Private mode or a full quota. Memory stays current.
  }
}

export const loadDiceControlBook = (): DiceControlBook => {
  const storage = safeStorage()
  if (!storage) return {}
  try {
    const parsed: unknown = JSON.parse(storage.getItem(COUNTS_KEY) ?? '')
    if (!parsed || typeof parsed !== 'object') return {}
    const profiles = (parsed as { profiles?: unknown }).profiles
    if (!profiles || typeof profiles !== 'object') return {}
    const book: Record<string, FaceGrid> = {}
    for (const [key, grid] of Object.entries(profiles)) {
      if (!isGrid(grid) || grid.every((count) => count === 0)) continue
      book[key] = grid
    }
    return book
  } catch {
    return {}
  }
}

export const saveDiceControlBook = (book: DiceControlBook): void => {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(COUNTS_KEY, JSON.stringify({ v: 1, profiles: book }))
  } catch {
    // Private mode or a full quota. Memory stays current.
  }
}

const cellIndex = (left: number, right: number): number => (left - 1) * 6 + (right - 1)

export const gridTotal = (grid: FaceGrid | undefined): number => {
  if (!grid) return 0
  let n = 0
  for (const count of grid) n += count
  return n
}

export const addGrids = (left: FaceGrid | undefined, right: FaceGrid | undefined): FaceGrid | undefined => {
  if (!left && !right) return undefined
  const next = emptyGrid()
  for (let i = 0; i < 36; i += 1) next[i] = (left?.[i] ?? 0) + (right?.[i] ?? 0)
  return gridTotal(next) > 0 ? next : undefined
}

export const recordDiceControlRoll = (book: DiceControlBook, roll: DiceControlRoll): DiceControlBook => {
  if (roll.left < 1 || roll.left > 6 || roll.right < 1 || roll.right > 6) return book
  const key = profileKey(roll.phase, roll.setId, gripOf(roll.stacked))
  const cells = book[key] ? [...book[key]] : emptyGrid()
  cells[cellIndex(roll.left, roll.right)] += 1
  return { ...book, [key]: cells }
}

const totalsOf = (grid: FaceGrid | undefined): number[] => {
  const totals = Array.from({ length: 13 }, () => 0)
  if (!grid) return totals
  for (let left = 1; left <= 6; left += 1) {
    for (let right = 1; right <= 6; right += 1) {
      totals[left + right] += grid[cellIndex(left, right)] ?? 0
    }
  }
  return totals
}

const hardCount = (grid: FaceGrid | undefined, face: number): number => {
  if (!grid) return 0
  return grid[cellIndex(face, face)] ?? 0
}

const columnsFor = (grid: FaceGrid | undefined, randomGrid: FaceGrid | undefined, compareRandom: boolean): DifferenceColumn[] => {
  const n = gridTotal(grid)
  const totals = totalsOf(grid)
  const randomN = gridTotal(randomGrid)
  const randomTotals = totalsOf(randomGrid)
  return Array.from({ length: 11 }, (_, index) => {
    const total = index + 2
    const fair = FAIR_BY_TOTAL[total] / 36
    const gap = n > 0 ? totals[total] / n - fair : 0
    const error = n > 0 ? Math.sqrt((fair * (1 - fair)) / n) : Number.POSITIVE_INFINITY
    const randomGap = compareRandom && randomN > 0 ? randomTotals[total] / randomN - fair : null
    return {
      total,
      gap,
      solid: n > 0 && Math.abs(gap) > 2 * error,
      randomGap,
    }
  })
}

const hardFor = (grid: FaceGrid | undefined, randomGrid: FaceGrid | undefined, compareRandom: boolean): HardCount[] => {
  const n = gridTotal(grid)
  const randomN = gridTotal(randomGrid)
  return ([4, 6, 8, 10] as const).map((total) => ({
    total,
    count: hardCount(grid, HARD_FACE[total]),
    fair: n / 36,
    random: compareRandom && randomN > 0 ? hardCount(randomGrid, HARD_FACE[total]) : null,
  }))
}

const viewFor = (label: string, grid: FaceGrid | undefined, randomGrid: FaceGrid | undefined, compareRandom: boolean): ChartView => ({
  label,
  n: gridTotal(grid),
  columns: columnsFor(grid, randomGrid, compareRandom),
  hard: hardFor(grid, randomGrid, compareRandom),
})

const phaseGrid = (book: DiceControlBook, phase: DicePhase, setId: string, grip: DiceGrip): FaceGrid | undefined =>
  book[profileKey(phase, setId, grip)]

/** One chart when both dropdowns match. Two charts when they name different sets. */
export const diceControlCharts = (settings: DiceControlSettings, book: DiceControlBook): ChartView[] => {
  const grip = gripOf(settings.stacked)
  const stackedLabel = settings.stacked ? ' · stacked' : ''
  if (settings.comeOut === settings.point) {
    const set = diceSet(settings.comeOut)
    const grid = addGrids(phaseGrid(book, 'come-out', set.id, grip), phaseGrid(book, 'point', set.id, grip))
    const randomGrid =
      set.id === 'random'
        ? undefined
        : addGrids(phaseGrid(book, 'come-out', 'random', grip), phaseGrid(book, 'point', 'random', grip))
    return [viewFor(`${set.label}${stackedLabel}`, grid, randomGrid, set.id !== 'random')]
  }
  return (['come-out', 'point'] as const).map((phase) => {
    const set = diceSet(phase === 'come-out' ? settings.comeOut : settings.point)
    const prefix = phase === 'come-out' ? 'Come Out' : 'Point'
    return viewFor(
      `${prefix} · ${set.label}${stackedLabel}`,
      phaseGrid(book, phase, set.id, grip),
      set.id === 'random' ? undefined : phaseGrid(book, phase, 'random', grip),
      set.id !== 'random',
    )
  })
}
