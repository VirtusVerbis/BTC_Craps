import type { ChipCharacter } from './chipConstants'
import {
  EYE_COLUMN_LEFT_PX,
  EYE_COLUMN_MARGIN_PX,
  EYE_COLUMN_RIGHT_PX,
  EYE_FACE_RECT,
  EYE_GLANCE_STAGGER_MS,
  EYE_IMAGE_HEIGHT,
  EYE_IMAGE_WIDTH,
  EYE_LOOK_MS,
  type EyeRect,
} from './eyeConstants'

export type EyeColumn = 'left' | 'center' | 'right'

/** `none` leaves the center table painting showing through. */
export type EyeStrip = 'left' | 'right' | 'split' | 'none'

export const EYE_CHARACTERS: readonly ChipCharacter[] = ['wolf', 'oldLady', 'cat', 'oldMan']

export const EYE_TABLE_SRC = '/craps-scene-layout_eyes_center.png'

export const EYE_STRIP_SRC: Record<Exclude<EyeStrip, 'none'>, string> = {
  left: '/craps-scene-layout_eyes_left.png',
  right: '/craps-scene-layout_eyes_right.png',
  split: '/craps-scene-layout_onepiece.png',
}

export const EYE_PATCH_SRC: Record<EyeColumn, string> = {
  left: '/craps-scene-layout_eyes_left.png',
  center: '/craps-scene-layout_eyes_center.png',
  right: '/craps-scene-layout_eyes_right.png',
}

export interface GazeDie {
  x: number
  visible: boolean
}

export interface GazeGlance {
  character: ChipCharacter
  columns: readonly EyeColumn[]
  startedMs: number
  offsetMs: number
}

export interface EyeGaze {
  sticky: [EyeColumn | null, EyeColumn | null]
  strip: EyeStrip
  patches: Partial<Record<ChipCharacter, EyeColumn>>
}

export const columnAt = (x: number): EyeColumn => {
  if (x < EYE_COLUMN_LEFT_PX) return 'left'
  if (x < EYE_COLUMN_RIGHT_PX) return 'center'
  return 'right'
}

/** First sight takes the column the die is in. After that it must clear the line by the margin. */
export const stickyColumn = (x: number, previous: EyeColumn | null): EyeColumn => {
  const raw = columnAt(x)
  if (previous == null || previous === raw) return raw
  if (previous === 'left') return x >= EYE_COLUMN_LEFT_PX + EYE_COLUMN_MARGIN_PX ? raw : 'left'
  if (previous === 'right') return x < EYE_COLUMN_RIGHT_PX - EYE_COLUMN_MARGIN_PX ? raw : 'right'
  if (x < EYE_COLUMN_LEFT_PX - EYE_COLUMN_MARGIN_PX) return 'left'
  if (x >= EYE_COLUMN_RIGHT_PX + EYE_COLUMN_MARGIN_PX) return 'right'
  return 'center'
}

export const pairStrip = (left: EyeColumn | null, right: EyeColumn | null): EyeStrip => {
  const present = [left, right].filter((column): column is EyeColumn => column != null)
  if (present.length === 0) return 'none'
  if (present.length === 1) return present[0] === 'center' ? 'none' : present[0]
  const [a, b] = present
  if (a === 'left' && b === 'left') return 'left'
  if (a === 'right' && b === 'right') return 'right'
  if ((a === 'left' && b === 'right') || (a === 'right' && b === 'left')) return 'split'
  return 'none'
}

/** Distinct columns in first-seen order, so a glance cycle stays stable. */
export const columnsOf = (xs: readonly number[]): EyeColumn[] => {
  const seen = new Set<EyeColumn>()
  const columns: EyeColumn[] = []
  for (const x of xs) {
    const column = columnAt(x)
    if (seen.has(column)) continue
    seen.add(column)
    columns.push(column)
  }
  return columns
}

export const glanceOffsetMs = (character: ChipCharacter): number => {
  const index = EYE_CHARACTERS.indexOf(character)
  return (index < 0 ? 0 : index) * EYE_GLANCE_STAGGER_MS
}

/** One column holds. Several columns step after `EYE_LOOK_MS`, shifted by `offsetMs`. */
export const glanceColumn = (
  columns: readonly EyeColumn[],
  elapsedMs: number,
  offsetMs: number,
): EyeColumn | null => {
  if (columns.length === 0) return null
  if (columns.length === 1) return columns[0]
  const elapsed = Math.max(0, elapsedMs) + Math.max(0, offsetMs)
  const index = Math.floor(elapsed / EYE_LOOK_MS) % columns.length
  return columns[index]
}

const dieSticky = (die: GazeDie | undefined, previous: EyeColumn | null): EyeColumn | null => {
  if (!die?.visible) return null
  return stickyColumn(die.x, previous)
}

/** Strip follows the dice. Patches follow betting glances until the shooter launches. */
export const resolveEyeGaze = (
  dice: readonly GazeDie[],
  previous: readonly (EyeColumn | null)[],
  glances: readonly GazeGlance[],
  nowMs: number,
  launched: boolean,
): EyeGaze => {
  const sticky: [EyeColumn | null, EyeColumn | null] = [
    dieSticky(dice[0], previous[0] ?? null),
    dieSticky(dice[1], previous[1] ?? null),
  ]
  const patches: Partial<Record<ChipCharacter, EyeColumn>> = {}
  if (!launched) {
    for (const glance of glances) {
      const column = glanceColumn(glance.columns, nowMs - glance.startedMs, glance.offsetMs)
      if (column) patches[glance.character] = column
    }
  }
  return { sticky, strip: pairStrip(sticky[0], sticky[1]), patches }
}

export interface EyePatchCrop {
  left: string
  top: string
  width: string
  height: string
  imgLeft: string
  imgTop: string
  imgWidth: string
  imgHeight: string
}

/** Place a face window on the stage and shift a full painting so that window shows through. */
export const eyePatchCrop = (rect: EyeRect = EYE_FACE_RECT.wolf): EyePatchCrop => {
  const left = rect.x / EYE_IMAGE_WIDTH
  const top = rect.y / EYE_IMAGE_HEIGHT
  const width = rect.width / EYE_IMAGE_WIDTH
  const height = rect.height / EYE_IMAGE_HEIGHT
  return {
    left: `${left * 100}%`,
    top: `${top * 100}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
    imgLeft: `${(-left / width) * 100}%`,
    imgTop: `${(-top / height) * 100}%`,
    imgWidth: `${(1 / width) * 100}%`,
    imgHeight: `${(1 / height) * 100}%`,
  }
}
