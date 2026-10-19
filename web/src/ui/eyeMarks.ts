import type { ChipCharacter } from './chipConstants'
import { PL_CHARACTERS } from './characterPnl'
import { EYE_MARK_PREVIEW_ON, EYE_MARK_PREVIEW_SKULL_ON, WIN_EYE_MARK, type EyeMark } from './eyeMarkConstants'

export type PhaseBtc = Record<ChipCharacter, number>

export type EyeMarkFrame = Partial<Record<ChipCharacter, EyeMark>>

export interface PhaseRollDelta {
  character: ChipCharacter
  btc: number
}

export interface PhaseStep {
  phase: PhaseBtc
  /** Set when this roll ended the point. Null while the point stays up, and on a come-out. */
  marks: EyeMarkFrame | null
}

export const emptyPhaseBtc = (): PhaseBtc => ({ wolf: 0, oldLady: 0, cat: 0, oldMan: 0 })

export const eyeMarkFor = (character: ChipCharacter, btc: number): EyeMark | null => {
  if (!(btc > 0) && !(btc < 0)) return null
  if (btc < 0) return 'skull'
  return WIN_EYE_MARK[character]
}

export const marksFromPhase = (phase: PhaseBtc): EyeMarkFrame => {
  const marks: EyeMarkFrame = {}
  for (const character of PL_CHARACTERS) {
    const mark = eyeMarkFor(character, phase[character])
    if (mark) marks[character] = mark
  }
  return marks
}

export const markedCharacters = (marks: EyeMarkFrame): ChipCharacter[] =>
  PL_CHARACTERS.filter((character) => marks[character] != null)

/** Win mark on every character, or a skull when `EYE_MARK_PREVIEW_SKULL_ON` is set. */
export const previewEyeMarks = (): EyeMarkFrame => {
  const marks: EyeMarkFrame = {}
  for (const character of PL_CHARACTERS) {
    marks[character] = EYE_MARK_PREVIEW_SKULL_ON ? 'skull' : WIN_EYE_MARK[character]
  }
  return marks
}

/** Preview wins over a live result so a throw does not hide the marks being tuned. */
export const displayedEyeMarks = (live: EyeMarkFrame): EyeMarkFrame =>
  EYE_MARK_PREVIEW_ON ? previewEyeMarks() : live

const addPhaseBtc = (phase: PhaseBtc, deltas: readonly PhaseRollDelta[]): PhaseBtc => {
  const next = { ...phase }
  for (const delta of deltas) next[delta.character] += delta.btc
  return next
}

/**
 * Add this roll when a point is already up. A come-out, including the roll that sets the point, is ignored.
 * The deciding roll (point made or 7-out) is included, then the total is read and the accumulator resets.
 */
export const stepPhaseBtc = (
  phase: PhaseBtc,
  pointBefore: number | null,
  pointAfter: number | null,
  deltas: readonly PhaseRollDelta[],
): PhaseStep => {
  if (pointBefore == null) return { phase, marks: null }
  const next = addPhaseBtc(phase, deltas)
  if (pointAfter === pointBefore) return { phase: next, marks: null }
  return { phase: emptyPhaseBtc(), marks: marksFromPhase(next) }
}

/**
 * Marks leave together. No deciding-roll floaters means they wait for the next throw.
 * A throw that starts first clears them while floaters are still up.
 */
export const eyeMarksShouldClear = (
  floaterIds: readonly number[],
  aliveIds: ReadonlySet<number>,
  throwStarted: boolean,
): boolean => {
  if (throwStarted) return true
  if (floaterIds.length === 0) return false
  return floaterIds.every((id) => !aliveIds.has(id))
}
