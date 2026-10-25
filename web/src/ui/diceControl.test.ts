import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addGrids,
  DEFAULT_DICE_CONTROL,
  diceControlCharts,
  loadDiceControlSettings,
  parseShakeAxisInput,
  recordDiceControlRoll,
  saveDiceControlSettings,
  stepShakeAxis,
  type DiceControlBook,
  type DiceControlSettings,
} from './diceControl'

const settings = (comeOut: DiceControlSettings['comeOut'], point: DiceControlSettings['point'], stacked = false): DiceControlSettings => ({
  ...DEFAULT_DICE_CONTROL,
  comeOut,
  point,
  stacked,
})

const roll = (
  book: DiceControlBook,
  phase: 'come-out' | 'point',
  setId: string,
  left: number,
  right: number,
  stacked = false,
) => recordDiceControlRoll(book, { phase, setId, stacked, left, right })

describe('dice control profiles', () => {
  it('keeps come-out, point, and stacked grids apart', () => {
    let book: DiceControlBook = {}
    book = roll(book, 'come-out', 'all-sevens', 4, 3, true)
    book = roll(book, 'point', 'all-sevens', 6, 1, true)
    book = roll(book, 'come-out', 'all-sevens', 5, 2, false)
    expect(book['come-out|all-sevens|stacked']).toEqual(expect.any(Array))
    expect(book['come-out|all-sevens|stacked']?.reduce((sum, count) => sum + count, 0)).toBe(1)
    expect(book['point|all-sevens|stacked']?.reduce((sum, count) => sum + count, 0)).toBe(1)
    expect(book['come-out|all-sevens|side']?.reduce((sum, count) => sum + count, 0)).toBe(1)
    expect(book['come-out|all-sevens|stacked']?.[0]).toBe(0)
  })

  it('shows one chart when the dropdowns match and two when they differ', () => {
    let book: DiceControlBook = {}
    book = roll(book, 'come-out', 'hard-way', 3, 3)
    book = roll(book, 'point', 'hard-way', 4, 4)
    const same = diceControlCharts(settings('hard-way', 'hard-way'), book)
    expect(same).toHaveLength(1)
    expect(same[0].label).toBe('Hard Way')
    expect(same[0].n).toBe(2)
    const split = diceControlCharts(settings('hard-way', '3v'), book)
    expect(split.map((view) => view.label)).toEqual(['Come Out · Hard Way', 'Point · 3 V'])
    expect(split[0].n).toBe(1)
    expect(split[1].n).toBe(0)
  })

  it('sits a fair sample on the zero line and lifts a run of sevens', () => {
    const fair = addGrids(undefined, undefined)
    expect(fair).toBeUndefined()
    let book: DiceControlBook = {}
    const pairs: Array<[number, number]> = [
      [1, 1],
      [1, 2],
      [1, 2],
      [1, 3],
      [1, 3],
      [1, 3],
      [1, 4],
      [1, 4],
      [1, 4],
      [1, 4],
      [1, 5],
      [1, 5],
      [1, 5],
      [1, 5],
      [1, 5],
      [1, 6],
      [1, 6],
      [1, 6],
      [1, 6],
      [1, 6],
      [1, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [3, 6],
      [3, 6],
      [3, 6],
      [3, 6],
      [4, 6],
      [4, 6],
      [4, 6],
      [5, 6],
      [5, 6],
      [6, 6],
    ]
    for (const [left, right] of pairs) book = roll(book, 'come-out', 'random', left, right)
    const fairView = diceControlCharts(settings('random', 'random'), book)[0]
    expect(fairView.n).toBe(36)
    for (const column of fairView.columns) expect(column.gap).toBeCloseTo(0)
    expect(fairView.columns.every((column) => !column.solid)).toBe(true)

    let sevens: DiceControlBook = {}
    for (let i = 0; i < 360; i += 1) sevens = roll(sevens, 'point', 'all-sevens', 1, 6)
    const hot = diceControlCharts(settings('all-sevens', 'all-sevens'), sevens)[0]
    const seven = hot.columns.find((column) => column.total === 7)
    const six = hot.columns.find((column) => column.total === 6)
    expect(seven?.gap).toBeGreaterThan(0)
    expect(seven?.solid).toBe(true)
    expect(seven && six ? seven.gap > six.gap : false).toBe(true)
  })
})

describe('dice control settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips shake to roll and treats a missing key as off', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    })
    saveDiceControlSettings({ ...DEFAULT_DICE_CONTROL, shakeToRoll: true })
    expect(loadDiceControlSettings().shakeToRoll).toBe(true)
    const key = [...store.keys()][0]
    const saved = JSON.parse(store.get(key) ?? '{}') as { shakeToRoll?: boolean }
    delete saved.shakeToRoll
    store.set(key, JSON.stringify(saved))
    expect(loadDiceControlSettings().shakeToRoll).toBe(false)
  })

  it('stores shake axes and restores a missing axis to the factory line', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    })
    saveDiceControlSettings({
      ...DEFAULT_DICE_CONTROL,
      shakeThresholdX: 12.6,
      shakeThresholdY: 8,
      shakeThresholdZ: 30,
    })
    expect(loadDiceControlSettings()).toMatchObject({ shakeThresholdX: 12.6, shakeThresholdY: 8, shakeThresholdZ: 30 })
    const key = [...store.keys()][0]
    const saved = JSON.parse(store.get(key) ?? '{}') as {
      shakeThresholdX?: number
      shakeThresholdY?: number
      shakeThresholdZ?: number
    }
    saved.shakeThresholdX = 30.26
    saved.shakeThresholdY = 0.2
    delete saved.shakeThresholdZ
    store.set(key, JSON.stringify(saved))
    expect(loadDiceControlSettings()).toMatchObject({ shakeThresholdX: 30, shakeThresholdY: 1, shakeThresholdZ: 10 })
  })
})

describe('shake axis entry', () => {
  it('steps to whole numbers and keeps one decimal from the keyboard', () => {
    expect(stepShakeAxis(10.6, 1)).toBe(11)
    expect(stepShakeAxis(10.6, -1)).toBe(10)
    expect(stepShakeAxis(10, 1)).toBe(11)
    expect(stepShakeAxis(10, -1)).toBe(9)
    expect(stepShakeAxis(1, -1)).toBe(1)
    expect(stepShakeAxis(30, 1)).toBe(30)
    expect(parseShakeAxisInput('10.64')).toBe(10.6)
    expect(parseShakeAxisInput('10.65')).toBe(10.7)
    expect(parseShakeAxisInput('10.')).toBe(10)
    expect(parseShakeAxisInput('99')).toBe(30)
    expect(parseShakeAxisInput('0.4')).toBe(1)
    expect(parseShakeAxisInput('')).toBeNull()
    expect(parseShakeAxisInput('abc')).toBeNull()
  })
})
