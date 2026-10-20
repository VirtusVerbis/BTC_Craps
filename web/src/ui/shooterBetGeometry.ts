import { BONUS_ALL_X, BONUS_ALL_Y, BONUS_SMALL_X, BONUS_SMALL_Y, BONUS_TALL_X, BONUS_TALL_Y } from './bonusFieldConstants'
import { SHOOTER_DONT_X, SHOOTER_DONT_Y, SHOOTER_PASS_X, SHOOTER_PASS_Y } from './characterBetConstants'
import type { FeltKind } from './shooterSlip'

/** Outlines and marker stacks for tuning shooter anchors. Live bets still resolve. */
export const SHOOTER_BET_AREAS_ON = false

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
): ShooterHit => box(id, kind, number, null, rect(anchor.x - 36, anchor.y - 28, anchor.x + 36, anchor.y + 28), anchor)

const PLACE: Record<number, StageRect> = {
  10: rect(159, 978, 363, 1096),
  9: rect(152, 1104, 357, 1228),
  8: rect(141, 1238, 352, 1356),
  6: rect(134, 1365, 350, 1485),
  5: rect(123, 1494, 345, 1611),
  4: rect(112, 1620, 336, 1742),
}

const LAY: Record<number, StageRect> = {
  10: rect(96, 978, 150, 1095),
  9: rect(82, 1104, 142, 1228),
  8: rect(74, 1238, 134, 1356),
  6: rect(58, 1366, 124, 1485),
  5: rect(48, 1494, 114, 1611),
  4: rect(36, 1622, 105, 1742),
}

const comeAnchor = (number: number): StagePoint => ({
  x: PLACE[number].x + 48,
  y: mid(PLACE[number]).y,
})

const comeOddsAnchor = (number: number): StagePoint => ({
  x: PLACE[number].x + PLACE[number].w - 48,
  y: mid(PLACE[number]).y,
})

const dcAnchor = (number: number): StagePoint => mid(LAY[number])

const dcOddsAnchor = (number: number): StagePoint => ({
  x: LAY[number].x + 18,
  y: LAY[number].y + 22,
})

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
  oddsBox('pass-odds', 'passOdds', null, { x: 280, y: 1892 }),
  oddsBox('dont-odds', 'dontOdds', null, { x: 280, y: 1840 }),
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
  box('eleven', 'eleven', null, 'eleven', rect(840, 1269, 942, 1353)),
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

/** Where a shooter stack sits. Traveled come and don't-come bets use the number anchors. */
export const anchorFor = (kind: FeltKind, number: number | null, spot: string | null): StagePoint => {
  if (kind === 'come' && number != null && comeAnchor(number)) return comeAnchor(number)
  if (kind === 'dontCome' && number != null) return dcAnchor(number)
  const hit = SHOOTER_HITS.find((item) => item.kind === kind && item.number === number && item.spot === spot)
    ?? SHOOTER_HITS.find((item) => item.kind === kind && item.number === number)
  return hit?.anchor ?? { x: SHOOTER_PASS_X, y: SHOOTER_PASS_Y }
}
