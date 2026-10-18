import { worldFromBets, type ChipWorld } from './chipPhysics'
import type { ChipBet } from './chipBets'
import {
  CAT_PROFILE_ON,
  OLD_LADY_PROFILE_ON,
  OLD_MAN_PROFILE_ON,
  WOLF_PROFILE_ON,
  STACK_POSITION_PREVIEW_HEIGHT,
  CHARACTER_GUIDE_COLOR,
  SHOOTER_ALL_X,
  SHOOTER_ALL_Y,
  SHOOTER_DONT_X,
  SHOOTER_DONT_Y,
  SHOOTER_PASS_X,
  SHOOTER_PASS_Y,
  CAT_PLACE_10_X,
  CAT_PLACE_10_Y,
  CAT_PLACE_4_X,
  CAT_PLACE_4_Y,
  CAT_PLACE_5_X,
  CAT_PLACE_5_Y,
  CAT_PLACE_6_X,
  CAT_PLACE_6_Y,
  CAT_PLACE_8_X,
  CAT_PLACE_8_Y,
  CAT_PLACE_9_X,
  CAT_PLACE_9_Y,
  OLD_LADY_HARD_6_X,
  OLD_LADY_HARD_6_Y,
  OLD_LADY_HARD_8_X,
  OLD_LADY_HARD_8_Y,
  OLD_LADY_INSIDE_5_X,
  OLD_LADY_INSIDE_5_Y,
  OLD_LADY_INSIDE_6_X,
  OLD_LADY_INSIDE_6_Y,
  OLD_LADY_INSIDE_8_X,
  OLD_LADY_INSIDE_8_Y,
  OLD_LADY_INSIDE_9_X,
  OLD_LADY_INSIDE_9_Y,
  OLD_MAN_FIELD_X,
  OLD_MAN_FIELD_Y,
  OLD_MAN_IRON_5_X,
  OLD_MAN_IRON_5_Y,
  OLD_MAN_IRON_6_X,
  OLD_MAN_IRON_6_Y,
  OLD_MAN_IRON_8_X,
  OLD_MAN_IRON_8_Y,
  OLD_MAN_POINT_10_X,
  OLD_MAN_POINT_10_Y,
  OLD_MAN_POINT_4_X,
  OLD_MAN_POINT_4_Y,
  OLD_MAN_POINT_5_X,
  OLD_MAN_POINT_5_Y,
  OLD_MAN_POINT_6_X,
  OLD_MAN_POINT_6_Y,
  OLD_MAN_POINT_8_X,
  OLD_MAN_POINT_8_Y,
  OLD_MAN_POINT_9_X,
  OLD_MAN_POINT_9_Y,
  OLD_MAN_POINT_LAY_10_X,
  OLD_MAN_POINT_LAY_10_Y,
  OLD_MAN_POINT_LAY_4_X,
  OLD_MAN_POINT_LAY_4_Y,
  OLD_MAN_POINT_LAY_5_X,
  OLD_MAN_POINT_LAY_5_Y,
  OLD_MAN_POINT_LAY_6_X,
  OLD_MAN_POINT_LAY_6_Y,
  OLD_MAN_POINT_LAY_8_X,
  OLD_MAN_POINT_LAY_8_Y,
  OLD_MAN_POINT_LAY_9_X,
  OLD_MAN_POINT_LAY_9_Y,
  WOLF_ACROSS_10_X,
  WOLF_ACROSS_10_Y,
  WOLF_ACROSS_4_X,
  WOLF_ACROSS_4_Y,
  WOLF_ACROSS_5_X,
  WOLF_ACROSS_5_Y,
  WOLF_ACROSS_6_X,
  WOLF_ACROSS_6_Y,
  WOLF_ACROSS_8_X,
  WOLF_ACROSS_8_Y,
  WOLF_ACROSS_9_X,
  WOLF_ACROSS_9_Y,
  WOLF_LAY_10_X,
  WOLF_LAY_10_Y,
  WOLF_LAY_4_X,
  WOLF_LAY_4_Y,
  WOLF_LAY_5_X,
  WOLF_LAY_5_Y,
  WOLF_LAY_6_X,
  WOLF_LAY_6_Y,
  WOLF_LAY_8_X,
  WOLF_LAY_8_Y,
  WOLF_LAY_9_X,
  WOLF_LAY_9_Y,
  WOLF_POINT_10_X,
  WOLF_POINT_10_Y,
  WOLF_POINT_4_X,
  WOLF_POINT_4_Y,
  WOLF_POINT_5_X,
  WOLF_POINT_5_Y,
  WOLF_POINT_6_X,
  WOLF_POINT_6_Y,
  WOLF_POINT_8_X,
  WOLF_POINT_8_Y,
  WOLF_POINT_9_X,
  WOLF_POINT_9_Y,
  WOLF_POINT_LAY_10_X,
  WOLF_POINT_LAY_10_Y,
  WOLF_POINT_LAY_4_X,
  WOLF_POINT_LAY_4_Y,
  WOLF_POINT_LAY_5_X,
  WOLF_POINT_LAY_5_Y,
  WOLF_POINT_LAY_6_X,
  WOLF_POINT_LAY_6_Y,
  WOLF_POINT_LAY_8_X,
  WOLF_POINT_LAY_8_Y,
  WOLF_POINT_LAY_9_X,
  WOLF_POINT_LAY_9_Y,
} from './characterBetConstants'
import { CHIP_ANCHORS, type ChipCharacter, type ChipColor } from './chipConstants'

interface PreviewSpot {
  x: number
  y: number
  label: string
  character: ChipCharacter | 'shooter'
}

const PREVIEW_COLOR: Record<ChipCharacter | 'shooter', ChipColor> = {
  wolf: 'white',
  oldLady: 'green',
  cat: 'blue',
  oldMan: 'black',
  shooter: 'red',
}

const spot = (
  x: number,
  y: number,
  label: string,
  character: ChipCharacter | 'shooter',
): PreviewSpot => ({ x, y, label, character })

const numbered = (
  character: ChipCharacter,
  prefix: string,
  points: ReadonlyArray<readonly [string, number, number]>,
): PreviewSpot[] => points.map(([name, x, y]) => spot(x, y, `${prefix}_${name}`, character))

/** Every chip anchor, including spots that share a pixel. */
export const stackPositionSpots = (): PreviewSpot[] => [
  ...CHIP_ANCHORS.map((anchor) =>
    spot(anchor.x, anchor.y, `${anchor.character} ${anchor.side}`, anchor.character),
  ),
  spot(SHOOTER_PASS_X, SHOOTER_PASS_Y, 'SHOOTER_PASS', 'shooter'),
  spot(SHOOTER_DONT_X, SHOOTER_DONT_Y, 'SHOOTER_DONT', 'shooter'),
  spot(SHOOTER_ALL_X, SHOOTER_ALL_Y, 'SHOOTER_ALL', 'shooter'),
  ...numbered('cat', 'CAT_PLACE', [
    ['4', CAT_PLACE_4_X, CAT_PLACE_4_Y],
    ['5', CAT_PLACE_5_X, CAT_PLACE_5_Y],
    ['6', CAT_PLACE_6_X, CAT_PLACE_6_Y],
    ['8', CAT_PLACE_8_X, CAT_PLACE_8_Y],
    ['9', CAT_PLACE_9_X, CAT_PLACE_9_Y],
    ['10', CAT_PLACE_10_X, CAT_PLACE_10_Y],
  ]),
  ...numbered('oldLady', 'OLD_LADY_INSIDE', [
    ['5', OLD_LADY_INSIDE_5_X, OLD_LADY_INSIDE_5_Y],
    ['6', OLD_LADY_INSIDE_6_X, OLD_LADY_INSIDE_6_Y],
    ['8', OLD_LADY_INSIDE_8_X, OLD_LADY_INSIDE_8_Y],
    ['9', OLD_LADY_INSIDE_9_X, OLD_LADY_INSIDE_9_Y],
  ]),
  ...numbered('oldLady', 'OLD_LADY_HARD', [
    ['6', OLD_LADY_HARD_6_X, OLD_LADY_HARD_6_Y],
    ['8', OLD_LADY_HARD_8_X, OLD_LADY_HARD_8_Y],
  ]),
  ...numbered('oldMan', 'OLD_MAN_POINT', [
    ['4', OLD_MAN_POINT_4_X, OLD_MAN_POINT_4_Y],
    ['5', OLD_MAN_POINT_5_X, OLD_MAN_POINT_5_Y],
    ['6', OLD_MAN_POINT_6_X, OLD_MAN_POINT_6_Y],
    ['8', OLD_MAN_POINT_8_X, OLD_MAN_POINT_8_Y],
    ['9', OLD_MAN_POINT_9_X, OLD_MAN_POINT_9_Y],
    ['10', OLD_MAN_POINT_10_X, OLD_MAN_POINT_10_Y],
  ]),
  ...numbered('oldMan', 'OLD_MAN_POINT_LAY', [
    ['4', OLD_MAN_POINT_LAY_4_X, OLD_MAN_POINT_LAY_4_Y],
    ['5', OLD_MAN_POINT_LAY_5_X, OLD_MAN_POINT_LAY_5_Y],
    ['6', OLD_MAN_POINT_LAY_6_X, OLD_MAN_POINT_LAY_6_Y],
    ['8', OLD_MAN_POINT_LAY_8_X, OLD_MAN_POINT_LAY_8_Y],
    ['9', OLD_MAN_POINT_LAY_9_X, OLD_MAN_POINT_LAY_9_Y],
    ['10', OLD_MAN_POINT_LAY_10_X, OLD_MAN_POINT_LAY_10_Y],
  ]),
  ...numbered('oldMan', 'OLD_MAN_IRON', [
    ['5', OLD_MAN_IRON_5_X, OLD_MAN_IRON_5_Y],
    ['6', OLD_MAN_IRON_6_X, OLD_MAN_IRON_6_Y],
    ['8', OLD_MAN_IRON_8_X, OLD_MAN_IRON_8_Y],
  ]),
  spot(OLD_MAN_FIELD_X, OLD_MAN_FIELD_Y, 'OLD_MAN_FIELD', 'oldMan'),
  ...numbered('wolf', 'WOLF_ACROSS', [
    ['4', WOLF_ACROSS_4_X, WOLF_ACROSS_4_Y],
    ['5', WOLF_ACROSS_5_X, WOLF_ACROSS_5_Y],
    ['6', WOLF_ACROSS_6_X, WOLF_ACROSS_6_Y],
    ['8', WOLF_ACROSS_8_X, WOLF_ACROSS_8_Y],
    ['9', WOLF_ACROSS_9_X, WOLF_ACROSS_9_Y],
    ['10', WOLF_ACROSS_10_X, WOLF_ACROSS_10_Y],
  ]),
  ...numbered('wolf', 'WOLF_POINT', [
    ['4', WOLF_POINT_4_X, WOLF_POINT_4_Y],
    ['5', WOLF_POINT_5_X, WOLF_POINT_5_Y],
    ['6', WOLF_POINT_6_X, WOLF_POINT_6_Y],
    ['8', WOLF_POINT_8_X, WOLF_POINT_8_Y],
    ['9', WOLF_POINT_9_X, WOLF_POINT_9_Y],
    ['10', WOLF_POINT_10_X, WOLF_POINT_10_Y],
  ]),
  ...numbered('wolf', 'WOLF_LAY', [
    ['4', WOLF_LAY_4_X, WOLF_LAY_4_Y],
    ['5', WOLF_LAY_5_X, WOLF_LAY_5_Y],
    ['6', WOLF_LAY_6_X, WOLF_LAY_6_Y],
    ['8', WOLF_LAY_8_X, WOLF_LAY_8_Y],
    ['9', WOLF_LAY_9_X, WOLF_LAY_9_Y],
    ['10', WOLF_LAY_10_X, WOLF_LAY_10_Y],
  ]),
  ...numbered('wolf', 'WOLF_POINT_LAY', [
    ['4', WOLF_POINT_LAY_4_X, WOLF_POINT_LAY_4_Y],
    ['5', WOLF_POINT_LAY_5_X, WOLF_POINT_LAY_5_Y],
    ['6', WOLF_POINT_LAY_6_X, WOLF_POINT_LAY_6_Y],
    ['8', WOLF_POINT_LAY_8_X, WOLF_POINT_LAY_8_Y],
    ['9', WOLF_POINT_LAY_9_X, WOLF_POINT_LAY_9_Y],
    ['10', WOLF_POINT_LAY_10_X, WOLF_POINT_LAY_10_Y],
  ]),
].filter(profileSpotOn)

const profileOn: Record<ChipCharacter, boolean> = {
  cat: CAT_PROFILE_ON,
  oldLady: OLD_LADY_PROFILE_ON,
  oldMan: OLD_MAN_PROFILE_ON,
  wolf: WOLF_PROFILE_ON,
}

/**
 * Pass and Don't Pass stay up. Strategy spots follow that character's profile switch.
 * Wolf cold lays and point lays are drawn whenever the Wolf profile is on, so the
 * spots can be tuned while WOLF_LAY_ON stays off for live betting.
 */
const profileSpotOn = (item: PreviewSpot): boolean => {
  if (item.character === 'shooter') return true
  if (item.label.endsWith(' pass') || item.label.endsWith(' dont')) return true
  return profileOn[item.character]
}

/** One column per distinct pixel. Shared spots keep every constant name on the caption. */
export const stackPositionPreviewBets = (): ChipBet[] => {
  const height = Math.max(1, Math.round(STACK_POSITION_PREVIEW_HEIGHT))
  const groups = new Map<string, PreviewSpot[]>()
  for (const item of stackPositionSpots()) {
    const key = `${item.x},${item.y}`
    const list = groups.get(key) ?? []
    list.push(item)
    groups.set(key, list)
  }
  const bets: ChipBet[] = []
  for (const group of groups.values()) {
    const first = group[0]
    const label = group.map((item) => item.label).join(' / ')
    const color = PREVIEW_COLOR[first.character]
    bets.push({
      id: label,
      character: first.character,
      side: 'pass',
      dollars: 0,
      columns: [Array.from({ length: height }, () => color)],
      anchor: { x: first.x, y: first.y },
      guide: {
        label,
        color: first.character === 'shooter' ? '#ffffff' : CHARACTER_GUIDE_COLOR[first.character],
      },
    })
  }
  return bets
}

let previewWorld: ChipWorld | null = null

/** Stable felt picture. Physics keeps using the live bets. */
export const stackPositionPreviewWorld = (): ChipWorld => {
  if (!previewWorld) previewWorld = worldFromBets(stackPositionPreviewBets(), 1)
  return previewWorld
}
