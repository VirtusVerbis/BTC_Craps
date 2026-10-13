import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIE_FACE_ALPHA, DIE_RAINBOW_STEP_MS } from './diceConstants'
import {
  DIE_COLOR_LABELS,
  DIE_COLOR_ORDER,
  dieFaceAlpha,
  diePigment,
  dieRainbowStep,
  loadDieColor,
  nextDieColor,
  saveDieColor,
  type DieColorId,
} from './diceColor'
import { ROLL_STREAK_COLOR_STEP_MS } from './rollStreak'

describe('die color', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts on midnight and walks the list back to midnight', () => {
    let color: DieColorId = DIE_COLOR_ORDER[0]
    const seen: DieColorId[] = [color]
    for (let i = 0; i < DIE_COLOR_ORDER.length; i += 1) {
      color = nextDieColor(color)
      seen.push(color)
    }
    expect(seen).toEqual([...DIE_COLOR_ORDER, 'midnight'])
  })

  it('paints midnight with the orange pigment at full cover', () => {
    expect(dieFaceAlpha('midnight')).toBe(1)
    expect(dieFaceAlpha('orange')).toBe(DIE_FACE_ALPHA)
    expect(diePigment('midnight')).toEqual(diePigment('orange'))
    expect(DIE_COLOR_ORDER.map((id) => DIE_COLOR_LABELS[id])).toEqual([
      'Midnight',
      'Orange',
      'Red',
      'Blue',
      'Green',
      'Purple',
      'Rainbow',
    ])
  })

  it('steps the rainbow on its own clock, matching the roll streak at the default', () => {
    expect(DIE_RAINBOW_STEP_MS).toBe(ROLL_STREAK_COLOR_STEP_MS)
    expect(dieRainbowStep(0)).toBe(0)
    expect(dieRainbowStep(DIE_RAINBOW_STEP_MS - 1)).toBe(0)
    expect(dieRainbowStep(DIE_RAINBOW_STEP_MS)).toBe(1)
    expect(dieRainbowStep(DIE_RAINBOW_STEP_MS * 3)).toBe(3)
  })

  it('reloads the chosen color after a refresh', () => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
    })
    expect(loadDieColor()).toBe('midnight')
    saveDieColor('orange')
    expect(loadDieColor()).toBe('orange')
    saveDieColor('purple')
    expect(loadDieColor()).toBe('purple')
    memory.set('btc-craps.die-color', 'nope')
    expect(loadDieColor()).toBe('midnight')
  })
})