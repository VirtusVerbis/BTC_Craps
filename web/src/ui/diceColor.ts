import { DIE_FACE_ALPHA, DIE_RAINBOW_STEP_MS } from './diceConstants'
import { ROLL_STREAK_COLORS } from './rollStreak'

/** Clock taps walk this list, then return to midnight. */
export const DIE_COLOR_ORDER = ['midnight', 'orange', 'red', 'blue', 'green', 'purple', 'rainbow'] as const

export type DieColorId = (typeof DIE_COLOR_ORDER)[number]

export const DIE_COLOR_LABELS: Record<DieColorId, string> = {
  midnight: 'Midnight',
  orange: 'Orange',
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  rainbow: 'Rainbow',
}

type Rgb = readonly [number, number, number]

export interface DiePigment {
  light: Rgb
  mid: Rgb
  dark: Rgb
}

const STORAGE_KEY = 'btc-craps.die-color'

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

const mix = (color: Rgb, toward: Rgb, amount: number): Rgb => [
  Math.round(color[0] + (toward[0] - color[0]) * amount),
  Math.round(color[1] + (toward[1] - color[1]) * amount),
  Math.round(color[2] + (toward[2] - color[2]) * amount),
]

const hexToRgb = (hex: string): Rgb => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Light top, mid body, dark foot. Same shape as the glossy orange faces. */
export const pigmentFromHex = (hex: string): DiePigment => {
  const mid = hexToRgb(hex)
  return {
    light: mix(mid, WHITE, 0.32),
    mid,
    dark: mix(mid, BLACK, 0.34),
  }
}

/** Same Bitcoin orange as the translucent set. Midnight draws it at full cover. */
const BITCOIN_ORANGE: DiePigment = {
  light: [255, 186, 48],
  mid: [247, 147, 26],
  dark: [214, 96, 0],
}

const SOLID_PIGMENTS: Record<Exclude<DieColorId, 'rainbow'>, DiePigment> = {
  midnight: BITCOIN_ORANGE,
  /** Flat fill was `rgba(247, 147, 26, DIE_FACE_ALPHA)`. */
  orange: BITCOIN_ORANGE,
  /** Flat fill was `rgba(196, 28, 36, DIE_FACE_ALPHA)`. Photo acrylic red replaces that pigment. */
  red: {
    // light: [236, 78, 84],
    // mid: [196, 28, 36],
    // dark: [132, 12, 20],
    light: [247, 80, 66],
    mid: [238, 42, 33],
    dark: [197, 23, 19],
  },
  blue: {
    light: [96, 158, 255],
    mid: [24, 78, 232],
    dark: [8, 36, 148],
  },
  green: {
    light: [72, 228, 118],
    mid: [0, 176, 64],
    dark: [0, 112, 36],
  },
  purple: {
    light: [214, 122, 255],
    mid: [168, 56, 224],
    dark: [108, 18, 156],
  },
}

const isDieColorId = (value: string | null): value is DieColorId =>
  value != null && (DIE_COLOR_ORDER as readonly string[]).includes(value)

const safeLocalStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const nextDieColor = (current: DieColorId): DieColorId => {
  const index = DIE_COLOR_ORDER.indexOf(current)
  const start = index < 0 ? 0 : index
  return DIE_COLOR_ORDER[(start + 1) % DIE_COLOR_ORDER.length]
}

const DEFAULT_DIE_COLOR: DieColorId = 'midnight'

export const loadDieColor = (): DieColorId => {
  const storage = safeLocalStorage()
  if (!storage) return DEFAULT_DIE_COLOR
  try {
    const value = storage.getItem(STORAGE_KEY)
    return isDieColorId(value) ? value : DEFAULT_DIE_COLOR
  } catch {
    return DEFAULT_DIE_COLOR
  }
}

export const saveDieColor = (color: DieColorId): void => {
  const storage = safeLocalStorage()
  if (!storage || !isDieColorId(color)) return
  try {
    storage.setItem(STORAGE_KEY, color)
  } catch {
    // Private mode or a full quota.
  }
}

/** Whole-die rainbow step. Every face uses this same slot. */
export const dieRainbowStep = (elapsedMs: number): number => {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || DIE_RAINBOW_STEP_MS <= 0) return 0
  return Math.floor(elapsedMs / DIE_RAINBOW_STEP_MS)
}

/** Midnight is solid. Every other color keeps `DIE_FACE_ALPHA`. */
export const dieFaceAlpha = (color: DieColorId): number => (color === 'midnight' ? 1 : DIE_FACE_ALPHA)

export const diePigment = (color: DieColorId, rainbowStep = 0): DiePigment => {
  if (color !== 'rainbow') return SOLID_PIGMENTS[color]
  const hex = ROLL_STREAK_COLORS[dieRainbowSlot(rainbowStep)]
  return pigmentFromHex(hex)
}

const dieRainbowSlot = (step: number): number => {
  const count = ROLL_STREAK_COLORS.length
  return ((step % count) + count) % count
}

const rgba = (color: Rgb, alpha: number) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`

export const dieFaceGradient = (pigment: DiePigment, alpha = DIE_FACE_ALPHA): string =>
  `linear-gradient(180deg, ${rgba(pigment.light, alpha)} 0%, ${rgba(pigment.mid, alpha)} 46%, ${rgba(pigment.dark, alpha)} 100%)`

export const dieShade = (pigment: DiePigment): string => `${pigment.dark[0]}, ${pigment.dark[1]}, ${pigment.dark[2]}`
