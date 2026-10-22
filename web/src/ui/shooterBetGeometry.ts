import { BONUS_ALL_X, BONUS_ALL_Y, BONUS_SMALL_X, BONUS_SMALL_Y, BONUS_TALL_X, BONUS_TALL_Y } from './bonusFieldConstants'
import { SHOOTER_DONT_X, SHOOTER_DONT_Y, SHOOTER_PASS_X, SHOOTER_PASS_Y } from './characterBetConstants'
import { CHIP_MAX_STACK, type ChipColor, type ChipMarker } from './chipConstants'
import type { ChipBet } from './chipBets'
import { chipDiameter, worldFromBets, type ChipWorld } from './chipPhysics'
import { markerForKind, type FeltKind } from './shooterSlip'

/** Outlines and a full chip stack on every shooter bet and odds spot. Live bets still resolve. */
export const SHOOTER_BET_AREAS_ON = false

/** Solid chip-sized squares on every odds hit box. Live bets still resolve. */
export const SHOOTER_ODDS_HITBOX_ON = true//false// false

/** Pass and Don't Pass odds squares. X,Y is the center. The square stays one chip wide. */
export const SHOOTER_PASS_ODDS_X = 280
export const SHOOTER_PASS_ODDS_Y = 1892
export const SHOOTER_DONT_ODDS_X = 280
export const SHOOTER_DONT_ODDS_Y = 1840

/**
 * Left column, stage pixels (1080×1920). Each number has three independent spots.
 * Lay X,Y is the top-left of that click box; W,H is its size. The lay stack sits at the box center.
 * DC X,Y is the traveled Don't Come chip.
 * DC Lay X,Y is the center of the Don't Come odds square. That square stays one chip wide.
 */
export const SHOOTER_LAY_10_X = 96
export const SHOOTER_LAY_10_Y = 978
export const SHOOTER_LAY_10_W = 54
export const SHOOTER_LAY_10_H = 117
export const SHOOTER_DC_10_X = 123
export const SHOOTER_DC_10_Y = 1037
export const SHOOTER_DC_LAY_10_X = 114
export const SHOOTER_DC_LAY_10_Y = 1000

export const SHOOTER_LAY_9_X = 82
export const SHOOTER_LAY_9_Y = 1104
export const SHOOTER_LAY_9_W = 60
export const SHOOTER_LAY_9_H = 124
export const SHOOTER_DC_9_X = 112
export const SHOOTER_DC_9_Y = 1166
export const SHOOTER_DC_LAY_9_X = 100
export const SHOOTER_DC_LAY_9_Y = 1126

export const SHOOTER_LAY_8_X = 74
export const SHOOTER_LAY_8_Y = 1238
export const SHOOTER_LAY_8_W = 60
export const SHOOTER_LAY_8_H = 118
export const SHOOTER_DC_8_X = 104
export const SHOOTER_DC_8_Y = 1297
export const SHOOTER_DC_LAY_8_X = 92
export const SHOOTER_DC_LAY_8_Y = 1260

export const SHOOTER_LAY_6_X = 58
export const SHOOTER_LAY_6_Y = 1366
export const SHOOTER_LAY_6_W = 66
export const SHOOTER_LAY_6_H = 119
export const SHOOTER_DC_6_X = 91
export const SHOOTER_DC_6_Y = 1426
export const SHOOTER_DC_LAY_6_X = 76
export const SHOOTER_DC_LAY_6_Y = 1388

export const SHOOTER_LAY_5_X = 48
export const SHOOTER_LAY_5_Y = 1494
export const SHOOTER_LAY_5_W = 66
export const SHOOTER_LAY_5_H = 117
export const SHOOTER_DC_5_X = 81
export const SHOOTER_DC_5_Y = 1553
export const SHOOTER_DC_LAY_5_X = 66
export const SHOOTER_DC_LAY_5_Y = 1516

export const SHOOTER_LAY_4_X = 36
export const SHOOTER_LAY_4_Y = 1622
export const SHOOTER_LAY_4_W = 69
export const SHOOTER_LAY_4_H = 120
export const SHOOTER_DC_4_X = 71
export const SHOOTER_DC_4_Y = 1682
export const SHOOTER_DC_LAY_4_X = 54
export const SHOOTER_DC_LAY_4_Y = 1644

/**
 * Place click box, stage pixels (1080×1920). X,Y is the top-left; W,H is the size.
 * The place stack sits at the box center.
 */
export const SHOOTER_PLACE_10_X = 159
export const SHOOTER_PLACE_10_Y = 978
export const SHOOTER_PLACE_10_W = 204
export const SHOOTER_PLACE_10_H = 118

export const SHOOTER_PLACE_9_X = 152
export const SHOOTER_PLACE_9_Y = 1104
export const SHOOTER_PLACE_9_W = 205
export const SHOOTER_PLACE_9_H = 124

export const SHOOTER_PLACE_8_X = 141
export const SHOOTER_PLACE_8_Y = 1238
export const SHOOTER_PLACE_8_W = 211
export const SHOOTER_PLACE_8_H = 118

export const SHOOTER_PLACE_6_X = 134
export const SHOOTER_PLACE_6_Y = 1365
export const SHOOTER_PLACE_6_W = 216
export const SHOOTER_PLACE_6_H = 120

export const SHOOTER_PLACE_5_X = 123
export const SHOOTER_PLACE_5_Y = 1494
export const SHOOTER_PLACE_5_W = 222
export const SHOOTER_PLACE_5_H = 117

export const SHOOTER_PLACE_4_X = 112
export const SHOOTER_PLACE_4_Y = 1620
export const SHOOTER_PLACE_4_W = 224
export const SHOOTER_PLACE_4_H = 122

/**
 * Traveled Come chip, and the Come odds square, stage pixels (1080×1920).
 * Come X,Y is the chip. Come Lay X,Y is the center of the odds square. That square stays one chip wide.
 */
export const SHOOTER_COME_10_X = 207
export const SHOOTER_COME_10_Y = 1037
export const SHOOTER_COME_LAY_10_X = 315
export const SHOOTER_COME_LAY_10_Y = 1037

export const SHOOTER_COME_9_X = 200
export const SHOOTER_COME_9_Y = 1166
export const SHOOTER_COME_LAY_9_X = 309
export const SHOOTER_COME_LAY_9_Y = 1166

export const SHOOTER_COME_8_X = 189
export const SHOOTER_COME_8_Y = 1297
export const SHOOTER_COME_LAY_8_X = 304
export const SHOOTER_COME_LAY_8_Y = 1297

export const SHOOTER_COME_6_X = 182
export const SHOOTER_COME_6_Y = 1425
export const SHOOTER_COME_LAY_6_X = 302
export const SHOOTER_COME_LAY_6_Y = 1425

export const SHOOTER_COME_5_X = 171
export const SHOOTER_COME_5_Y = 1553
export const SHOOTER_COME_LAY_5_X = 297
export const SHOOTER_COME_LAY_5_Y = 1553

export const SHOOTER_COME_4_X = 160
export const SHOOTER_COME_4_Y = 1681
export const SHOOTER_COME_LAY_4_X = 288
export const SHOOTER_COME_LAY_4_Y = 1681

export interface StageRect {
  x: number
  y: number
  w: number
  h: number
}

export interface StagePoint {
  x: number
  y: number
}

export interface ShooterHit {
  id: string
  kind: FeltKind
  number: number | null
  spot: string | null
  rects: readonly StageRect[]
  polygon?: readonly StagePoint[]
  anchor: StagePoint
}

const rect = (x0: number, y0: number, x1: number, y1: number): StageRect => ({
  x: x0,
  y: y0,
  w: x1 - x0,
  h: y1 - y0,
})

const sized = (x: number, y: number, w: number, h: number): StageRect => ({ x, y, w, h })

const mid = (box: StageRect): StagePoint => ({
  x: Math.round(box.x + box.w / 2),
  y: Math.round(box.y + box.h / 2),
})

const box = (
  id: string,
  kind: FeltKind,
  number: number | null,
  spot: string | null,
  bounds: StageRect,
  anchor = mid(bounds),
): ShooterHit => ({ id, kind, number, spot, rects: [bounds], anchor })

const passCurve: readonly StagePoint[] = [
  { x: 957, y: 1526 }, { x: 960, y: 1538 }, { x: 960, y: 1550 }, { x: 960, y: 1562 },
  { x: 962, y: 1574 }, { x: 963, y: 1586 }, { x: 963, y: 1598 }, { x: 968, y: 1610 },
  { x: 968, y: 1622 }, { x: 968, y: 1634 }, { x: 968, y: 1646 }, { x: 968, y: 1658 },
  { x: 969, y: 1670 }, { x: 969, y: 1682 }, { x: 970, y: 1694 }, { x: 970, y: 1706 },
  { x: 970, y: 1718 }, { x: 970, y: 1730 }, { x: 972, y: 1742 }, { x: 966, y: 1754 },
  { x: 960, y: 1766 }, { x: 958, y: 1778 }, { x: 950, y: 1790 }, { x: 940, y: 1802 },
  { x: 927, y: 1814 }, { x: 915, y: 1826 }, { x: 892, y: 1838 }, { x: 876, y: 1850 },
  { x: 849, y: 1862 }, { x: 810, y: 1874 }, { x: 771, y: 1886 }, { x: 702, y: 1898 },
  { x: 552, y: 1908 }, { x: 418, y: 1908 }, { x: 426, y: 1898 }, { x: 426, y: 1886 },
  { x: 423, y: 1874 }, { x: 708, y: 1862 }, { x: 756, y: 1850 }, { x: 783, y: 1838 },
  { x: 810, y: 1826 }, { x: 832, y: 1814 }, { x: 846, y: 1802 }, { x: 860, y: 1790 },
  { x: 867, y: 1778 }, { x: 876, y: 1766 }, { x: 880, y: 1754 }, { x: 886, y: 1742 },
  { x: 890, y: 1730 }, { x: 888, y: 1718 }, { x: 888, y: 1706 }, { x: 888, y: 1694 },
  { x: 886, y: 1682 }, { x: 885, y: 1670 }, { x: 885, y: 1658 }, { x: 885, y: 1646 },
  { x: 884, y: 1634 }, { x: 884, y: 1622 }, { x: 882, y: 1610 }, { x: 880, y: 1598 },
  { x: 880, y: 1586 }, { x: 880, y: 1574 }, { x: 879, y: 1562 }, { x: 878, y: 1550 },
  { x: 876, y: 1538 }, { x: 878, y: 1526 },
]

const placeBox = (number: number, bounds: StageRect): ShooterHit =>
  box(`place-${number}`, 'place', number, null, bounds)

const layBox = (number: number, bounds: StageRect): ShooterHit =>
  box(`lay-${number}`, 'lay', number, null, bounds)

const oddsBox = (
  id: string,
  kind: FeltKind,
  number: number | null,
  anchor: StagePoint,
): ShooterHit => {
  const half = chipDiameter() / 2
  return box(id, kind, number, null, rect(anchor.x - half, anchor.y - half, anchor.x + half, anchor.y + half), anchor)
}

const ODDS_KINDS = new Set<FeltKind>(['passOdds', 'dontOdds', 'comeOdds', 'dontComeOdds'])

export const isOddsHit = (hit: ShooterHit): boolean => ODDS_KINDS.has(hit.kind)

const PLACE: Record<number, StageRect> = {
  10: sized(SHOOTER_PLACE_10_X, SHOOTER_PLACE_10_Y, SHOOTER_PLACE_10_W, SHOOTER_PLACE_10_H),
  9: sized(SHOOTER_PLACE_9_X, SHOOTER_PLACE_9_Y, SHOOTER_PLACE_9_W, SHOOTER_PLACE_9_H),
  8: sized(SHOOTER_PLACE_8_X, SHOOTER_PLACE_8_Y, SHOOTER_PLACE_8_W, SHOOTER_PLACE_8_H),
  6: sized(SHOOTER_PLACE_6_X, SHOOTER_PLACE_6_Y, SHOOTER_PLACE_6_W, SHOOTER_PLACE_6_H),
  5: sized(SHOOTER_PLACE_5_X, SHOOTER_PLACE_5_Y, SHOOTER_PLACE_5_W, SHOOTER_PLACE_5_H),
  4: sized(SHOOTER_PLACE_4_X, SHOOTER_PLACE_4_Y, SHOOTER_PLACE_4_W, SHOOTER_PLACE_4_H),
}

const LAY: Record<number, StageRect> = {
  10: sized(SHOOTER_LAY_10_X, SHOOTER_LAY_10_Y, SHOOTER_LAY_10_W, SHOOTER_LAY_10_H),
  9: sized(SHOOTER_LAY_9_X, SHOOTER_LAY_9_Y, SHOOTER_LAY_9_W, SHOOTER_LAY_9_H),
  8: sized(SHOOTER_LAY_8_X, SHOOTER_LAY_8_Y, SHOOTER_LAY_8_W, SHOOTER_LAY_8_H),
  6: sized(SHOOTER_LAY_6_X, SHOOTER_LAY_6_Y, SHOOTER_LAY_6_W, SHOOTER_LAY_6_H),
  5: sized(SHOOTER_LAY_5_X, SHOOTER_LAY_5_Y, SHOOTER_LAY_5_W, SHOOTER_LAY_5_H),
  4: sized(SHOOTER_LAY_4_X, SHOOTER_LAY_4_Y, SHOOTER_LAY_4_W, SHOOTER_LAY_4_H),
}

const DC_PLACE: Record<number, StagePoint> = {
  10: { x: SHOOTER_DC_10_X, y: SHOOTER_DC_10_Y },
  9: { x: SHOOTER_DC_9_X, y: SHOOTER_DC_9_Y },
  8: { x: SHOOTER_DC_8_X, y: SHOOTER_DC_8_Y },
  6: { x: SHOOTER_DC_6_X, y: SHOOTER_DC_6_Y },
  5: { x: SHOOTER_DC_5_X, y: SHOOTER_DC_5_Y },
  4: { x: SHOOTER_DC_4_X, y: SHOOTER_DC_4_Y },
}

const DC_LAY: Record<number, StagePoint> = {
  10: { x: SHOOTER_DC_LAY_10_X, y: SHOOTER_DC_LAY_10_Y },
  9: { x: SHOOTER_DC_LAY_9_X, y: SHOOTER_DC_LAY_9_Y },
  8: { x: SHOOTER_DC_LAY_8_X, y: SHOOTER_DC_LAY_8_Y },
  6: { x: SHOOTER_DC_LAY_6_X, y: SHOOTER_DC_LAY_6_Y },
  5: { x: SHOOTER_DC_LAY_5_X, y: SHOOTER_DC_LAY_5_Y },
  4: { x: SHOOTER_DC_LAY_4_X, y: SHOOTER_DC_LAY_4_Y },
}

const COME: Record<number, StagePoint> = {
  10: { x: SHOOTER_COME_10_X, y: SHOOTER_COME_10_Y },
  9: { x: SHOOTER_COME_9_X, y: SHOOTER_COME_9_Y },
  8: { x: SHOOTER_COME_8_X, y: SHOOTER_COME_8_Y },
  6: { x: SHOOTER_COME_6_X, y: SHOOTER_COME_6_Y },
  5: { x: SHOOTER_COME_5_X, y: SHOOTER_COME_5_Y },
  4: { x: SHOOTER_COME_4_X, y: SHOOTER_COME_4_Y },
}

const COME_LAY: Record<number, StagePoint> = {
  10: { x: SHOOTER_COME_LAY_10_X, y: SHOOTER_COME_LAY_10_Y },
  9: { x: SHOOTER_COME_LAY_9_X, y: SHOOTER_COME_LAY_9_Y },
  8: { x: SHOOTER_COME_LAY_8_X, y: SHOOTER_COME_LAY_8_Y },
  6: { x: SHOOTER_COME_LAY_6_X, y: SHOOTER_COME_LAY_6_Y },
  5: { x: SHOOTER_COME_LAY_5_X, y: SHOOTER_COME_LAY_5_Y },
  4: { x: SHOOTER_COME_LAY_4_X, y: SHOOTER_COME_LAY_4_Y },
}

const comeAnchor = (number: number): StagePoint => COME[number]

const comeOddsAnchor = (number: number): StagePoint => COME_LAY[number]

const dcAnchor = (number: number): StagePoint => DC_PLACE[number]

const dcOddsAnchor = (number: number): StagePoint => DC_LAY[number]

const NUMBERS = [4, 5, 6, 8, 9, 10] as const

export const SHOOTER_HITS: readonly ShooterHit[] = [
  {
    id: 'pass',
    kind: 'pass',
    number: null,
    spot: null,
    rects: [rect(24, 1874, 430, 1910)],
    polygon: passCurve,
    anchor: { x: SHOOTER_PASS_X, y: SHOOTER_PASS_Y },
  },
  {
    id: 'dont',
    kind: 'dont',
    number: null,
    spot: null,
    rects: [rect(26, 1818, 567, 1864), rect(766, 1526, 870, 1824)],
    anchor: { x: SHOOTER_DONT_X, y: SHOOTER_DONT_Y },
  },
  box('come', 'come', null, null, rect(348, 1526, 566, 1809)),
  box('dont-come', 'dontCome', null, null, rect(30, 1752, 334, 1809)),
  box('field', 'field', null, null, rect(579, 1526, 762, 1864)),
  ...NUMBERS.flatMap((number) => [
    placeBox(number, PLACE[number]),
    layBox(number, LAY[number]),
    oddsBox(`come-odds-${number}`, 'comeOdds', number, comeOddsAnchor(number)),
    oddsBox(`dc-odds-${number}`, 'dontComeOdds', number, dcOddsAnchor(number)),
  ]),
  oddsBox('pass-odds', 'passOdds', null, { x: SHOOTER_PASS_ODDS_X, y: SHOOTER_PASS_ODDS_Y }),
  oddsBox('dont-odds', 'dontOdds', null, { x: SHOOTER_DONT_ODDS_X, y: SHOOTER_DONT_ODDS_Y }),
  box('any-seven', 'anySeven', null, null, rect(430, 1269, 504, 1446)),
  box('hard-10', 'hard', 10, null, rect(514, 1269, 609, 1354)),
  box('hard-4', 'hard', 4, null, rect(620, 1269, 722, 1354)),
  box('horn-12', 'hornNumber', 12, null, rect(732, 1269, 830, 1354)),
  box('craps', 'anyCraps', null, 'craps', rect(952, 1269, 1028, 1446)),
  box('hard-6', 'hard', 6, null, rect(514, 1364, 609, 1446)),
  box('hard-8', 'hard', 8, null, rect(620, 1364, 724, 1446)),
  box('horn-2', 'hornNumber', 2, null, rect(734, 1364, 834, 1446)),
  box('horn-3', 'hornNumber', 3, null, rect(844, 1362, 948, 1446)),
  box('c', 'anyCraps', null, 'c', rect(496, 1466, 724, 1504)),
  box('e', 'eleven', null, 'e', rect(818, 1466, 1030, 1504)),
  box('horn-11', 'hornNumber', 11, null, rect(840, 1269, 942, 1353)),
  box('horn', 'horn', null, null, rect(801, 1336, 874, 1377)),
  box('tall', 'tall', null, null, rect(BONUS_TALL_X - 41, BONUS_TALL_Y - 41, BONUS_TALL_X + 41, BONUS_TALL_Y + 41), { x: BONUS_TALL_X, y: BONUS_TALL_Y }),
  box('all', 'all', null, null, rect(BONUS_ALL_X - 41, BONUS_ALL_Y - 41, BONUS_ALL_X + 41, BONUS_ALL_Y + 41), { x: BONUS_ALL_X, y: BONUS_ALL_Y }),
  box('small', 'small', null, null, rect(BONUS_SMALL_X - 41, BONUS_SMALL_Y - 41, BONUS_SMALL_X + 41, BONUS_SMALL_Y + 41), { x: BONUS_SMALL_X, y: BONUS_SMALL_Y }),
]

const pointInPolygon = (point: StagePoint, polygon: readonly StagePoint[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const cross = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y + 0.00001) + a.x
    if (cross) inside = !inside
  }
  return inside
}

const inRect = (point: StagePoint, box: StageRect): boolean =>
  point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h

/** Top-most listed hit wins. Odds and traveled come spots are listed before the big come box. */
export const hitAt = (point: StagePoint): ShooterHit | null => {
  for (let i = SHOOTER_HITS.length - 1; i >= 0; i -= 1) {
    const hit = SHOOTER_HITS[i]
    if (hit.rects.some((bounds) => inRect(point, bounds))) return hit
    if (hit.polygon && pointInPolygon(point, hit.polygon)) return hit
  }
  return null
}

export const hitById = (id: string): ShooterHit | undefined => SHOOTER_HITS.find((hit) => hit.id === id)

const stackColumn = (): ChipColor[] => Array.from({ length: CHIP_MAX_STACK }, () => 'red')

/** One full red stack at every bet, traveled come, don't-come, and odds spot. */
export const shooterAreaPreviewBets = (): ChipBet[] => {
  const spots: { id: string; x: number; y: number; marker: ChipMarker | null }[] = SHOOTER_HITS.map((hit) => ({
    id: hit.id,
    x: hit.anchor.x,
    y: hit.anchor.y,
    marker: markerForKind(hit.kind),
  }))
  for (const number of NUMBERS) {
    const come = comeAnchor(number)
    const dc = dcAnchor(number)
    spots.push({ id: `come-${number}`, x: come.x, y: come.y, marker: 'come' })
    spots.push({ id: `dc-${number}`, x: dc.x, y: dc.y, marker: 'dc' })
  }
  const seen = new Set<string>()
  const bets: ChipBet[] = []
  for (const spot of spots) {
    const key = `${spot.x},${spot.y}`
    if (seen.has(key)) continue
    seen.add(key)
    bets.push({
      id: `shooter-area-${spot.id}`,
      character: 'shooter',
      side: 'felt',
      dollars: 0,
      columns: [stackColumn()],
      anchor: { x: spot.x, y: spot.y },
      marker: spot.marker,
    })
  }
  return bets
}

let areaPreviewWorld: ChipWorld | null = null

/** Stable marker stacks. Physics keeps using the live bets. */
export const shooterAreaPreviewWorld = (): ChipWorld => {
  areaPreviewWorld ??= worldFromBets(shooterAreaPreviewBets(), 1)
  return areaPreviewWorld
}

/** Where a shooter stack sits. Traveled come and don't-come bets use the number anchors. */
export const anchorFor = (kind: FeltKind, number: number | null, spot: string | null): StagePoint => {
  if (kind === 'come' && number != null && comeAnchor(number)) return comeAnchor(number)
  if (kind === 'dontCome' && number != null) return dcAnchor(number)
  const hit = SHOOTER_HITS.find((item) => item.kind === kind && item.number === number && item.spot === spot)
    ?? SHOOTER_HITS.find((item) => item.kind === kind && item.number === number)
  return hit?.anchor ?? { x: SHOOTER_PASS_X, y: SHOOTER_PASS_Y }
}
