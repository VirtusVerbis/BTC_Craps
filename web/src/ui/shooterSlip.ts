import { applyBonusRoll, emptyBonusHand, type BonusHand } from './bonusCraps'
import { CHIP_FACE_VALUE, chipsForDollars, splitColumns, type ChipBet } from './chipBets'
import { CHIP_MAX_BET_CHIPS, type ChipColor, type ChipMarker } from './chipConstants'
import {
  settleAnyCraps,
  settleAnySeven,
  settleCome,
  settleComeOdds,
  settleDontCome,
  settleDontComeOdds,
  settleDontPass,
  settleDontPassOdds,
  settleEleven,
  settleField,
  settleHard,
  settleHorn,
  settleHornBox,
  settleLay,
  settlePassLine,
  settlePassOdds,
  settlePlace,
  maxOddsDollars,
  isPointNumber,
  HORN_NUMBERS,
  type BetSettlement,
  type PointNumber,
} from './crapsPayouts'
import { anchorFor } from './shooterBetGeometry'
import { SHOOTER_RED } from './shooterProfile'

export const SHOOTER_WHITE = CHIP_FACE_VALUE.white
export const SHOOTER_BANK = CHIP_FACE_VALUE.black * 10
export const SHOOTER_RULE_LIMIT = 10
export const BET_CLOCK_MS = 60_000

export type FeltKind =
  | 'pass'
  | 'dont'
  | 'come'
  | 'dontCome'
  | 'field'
  | 'place'
  | 'lay'
  | 'hard'
  | 'hornNumber'
  | 'horn'
  | 'anySeven'
  | 'anyCraps'
  | 'eleven'
  | 'tall'
  | 'all'
  | 'small'
  | 'passOdds'
  | 'dontOdds'
  | 'comeOdds'
  | 'dontComeOdds'

export type RulePhase = 'comeOut' | 'point'

export interface FeltBet {
  id: string
  kind: FeltKind
  number: number | null
  spot: string | null
  dollars: number
  /** Profile or saved-rule dollars. Undo cannot take the bet below this. */
  preset: number
}

export interface SlipClick {
  betId: string
  added: number
}

export interface ShooterSlip {
  bets: FeltBet[]
  purse: number
  undo: SlipClick[]
  /** True after this shooter has established a point. Bonus bets stay closed until a 7-out. */
  pointSeen: boolean
  /** Opening profile has been placed for this hand. */
  handOpen: boolean
  /** Side currently standing on the felt. A flip during a point waits for the next come-out. */
  darkSide: boolean
}

export interface ShooterRule {
  id: string
  phase: RulePhase
  kind: FeltKind | null
  number: number | null
  spot: string | null
  dollars: number
  locked: boolean
}

export interface ShooterBetSettings {
  sameBet: boolean
  darkSide: boolean
  comeOut: ShooterRule[]
  point: ShooterRule[]
}

const KEY = 'btc-craps.shooter-bets'

export const emptySlip = (): ShooterSlip => ({
  bets: [],
  purse: SHOOTER_BANK,
  undo: [],
  pointSeen: false,
  handOpen: false,
  darkSide: false,
})

const lockedRule = (kind: 'pass' | 'dont'): ShooterRule => ({
  id: `locked-${kind}`,
  phase: 'comeOut',
  kind,
  number: null,
  spot: null,
  dollars: SHOOTER_RED,
  locked: true,
})

export const defaultBetSettings = (): ShooterBetSettings => ({
  sameBet: false,
  darkSide: false,
  comeOut: [lockedRule('pass')],
  point: [],
})

const isRule = (value: unknown): value is ShooterRule => {
  if (!value || typeof value !== 'object') return false
  const row = value as ShooterRule
  return typeof row.id === 'string'
    && typeof row.dollars === 'number'
    && 'kind' in row
    && (row.kind === null || typeof row.kind === 'string')
}

export const loadBetSettings = (): ShooterBetSettings => {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (!raw) return defaultBetSettings()
    const parsed = JSON.parse(raw) as Partial<ShooterBetSettings>
    return withLockedRule({
      sameBet: parsed.sameBet === true,
      darkSide: parsed.darkSide === true,
      comeOut: Array.isArray(parsed.comeOut) ? parsed.comeOut.filter(isRule) : [],
      point: Array.isArray(parsed.point) ? parsed.point.filter(isRule) : [],
    })
  } catch {
    return defaultBetSettings()
  }
}

export const saveBetSettings = (settings: ShooterBetSettings): void => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Private mode or a full quota.
  }
}

/** Light keeps Pass. Dark keeps Don't Pass. Either switch puts that line back to one red. */
export const setTableSide = (settings: ShooterBetSettings, darkSide: boolean): ShooterBetSettings => {
  if (settings.darkSide === darkSide) return settings
  const kind: 'pass' | 'dont' = darkSide ? 'dont' : 'pass'
  const comeOut = settings.comeOut.filter((rule) => rule.kind !== 'pass' && rule.kind !== 'dont')
  return withLockedRule({ ...settings, darkSide, comeOut: [lockedRule(kind), ...comeOut] })
}

const migrateRule = (rule: ShooterRule): ShooterRule => {
  if (rule.kind === 'eleven' && rule.spot === 'eleven') {
    return { ...rule, kind: 'hornNumber', number: 11, spot: null }
  }
  if (rule.kind === 'eleven') return { ...rule, number: null, spot: 'e' }
  return rule
}

const ruleKey = (rule: ShooterRule): string | null => {
  if (rule.kind == null) return null
  return `${rule.kind}|${rule.number ?? ''}|${rule.spot ?? ''}`
}

/** One row per bet. A locked row wins. Dollars become the higher amount. One blank stays. */
const pruneRules = (rules: readonly ShooterRule[]): ShooterRule[] => {
  const kept: ShooterRule[] = []
  const indexByKey = new Map<string, number>()
  let blank: ShooterRule | null = null
  for (const rule of rules) {
    const key = ruleKey(rule)
    if (key == null) {
      blank ??= rule
      continue
    }
    const index = indexByKey.get(key)
    if (index == null) {
      indexByKey.set(key, kept.length)
      kept.push(rule)
      continue
    }
    const current = kept[index]
    const survivor = current.locked ? current : rule.locked ? rule : current
    kept[index] = { ...survivor, dollars: Math.max(current.dollars, rule.dollars) }
  }
  if (blank) kept.push(blank)
  return kept
}

export const withLockedRule = (settings: ShooterBetSettings): ShooterBetSettings => {
  const kind: 'pass' | 'dont' = settings.darkSide ? 'dont' : 'pass'
  const comeOut = pruneRules(settings.comeOut.map(migrateRule)).map((rule) => {
    const locked = rule.phase === 'comeOut' && rule.kind === kind && rule.number == null && rule.spot == null
    return {
      ...rule,
      locked,
      dollars: locked ? Math.max(rule.dollars, SHOOTER_RED) : rule.dollars,
    }
  })
  if (!comeOut.some((rule) => rule.locked)) comeOut.unshift(lockedRule(kind))
  return {
    ...settings,
    comeOut: comeOut.slice(0, SHOOTER_RULE_LIMIT),
    point: pruneRules(settings.point.map(migrateRule)).slice(0, SHOOTER_RULE_LIMIT),
  }
}

export const PLACE_NUMBERS = [4, 5, 6, 8, 9, 10] as const
export const HARD_NUMBERS = [4, 6, 8, 10] as const
export const CRAPS_SPOTS = ['craps', 'c'] as const

export interface RuleVariant {
  number: number | null
  spot: string | null
}

export const variantsOf = (kind: FeltKind): readonly RuleVariant[] => {
  if (kind === 'place' || kind === 'lay' || kind === 'comeOdds' || kind === 'dontComeOdds') {
    return PLACE_NUMBERS.map((number) => ({ number, spot: null }))
  }
  if (kind === 'hard') return HARD_NUMBERS.map((number) => ({ number, spot: null }))
  if (kind === 'hornNumber') return HORN_NUMBERS.map((number) => ({ number, spot: null }))
  if (kind === 'anyCraps') return CRAPS_SPOTS.map((spot) => ({ number: null, spot }))
  if (kind === 'eleven') return [{ number: null, spot: 'e' }]
  return [{ number: null, spot: null }]
}

export const variantTaken = (
  rules: readonly ShooterRule[],
  ruleId: string,
  kind: FeltKind,
  number: number | null,
  spot: string | null,
): boolean => rules.some((rule) =>
  rule.id !== ruleId && rule.kind === kind && rule.number === number && rule.spot === spot)

export const kindExhausted = (rules: readonly ShooterRule[], ruleId: string, kind: FeltKind): boolean =>
  variantsOf(kind).every((variant) => variantTaken(rules, ruleId, kind, variant.number, variant.spot))

export const firstFreeVariant = (rules: readonly ShooterRule[], ruleId: string, kind: FeltKind): RuleVariant =>
  variantsOf(kind).find((variant) => !variantTaken(rules, ruleId, kind, variant.number, variant.spot))
  ?? variantsOf(kind)[0]

const sameBet = (bet: FeltBet, kind: FeltKind, number: number | null, spot: string | null): boolean =>
  bet.kind === kind && bet.number === number && bet.spot === spot

const oddsUnitWhites = (take: boolean, number: number): number => {
  if (take) return number === 5 || number === 9 ? 2 : number === 6 || number === 8 ? 5 : 1
  return number === 4 || number === 10 ? 2 : number === 5 || number === 9 ? 3 : 6
}

/** Smallest odds stack that is at least one red and pays a whole chip. */
export const oddsMinimumDollars = (take: boolean, number: number): number => {
  const unit = oddsUnitWhites(take, number)
  const whites = Math.ceil(Math.max(5, unit) / unit) * unit
  return whites * SHOOTER_WHITE
}

export const minimumDollars = (kind: FeltKind, number: number | null): number => {
  if (kind === 'place') return number === 6 || number === 8 ? SHOOTER_RED + SHOOTER_WHITE : SHOOTER_RED
  if (kind === 'lay') return number === 4 || number === 10 ? SHOOTER_RED : SHOOTER_RED + SHOOTER_WHITE
  if (kind === 'horn') return SHOOTER_WHITE * 4
  if (kind === 'hard' || kind === 'hornNumber' || kind === 'anySeven' || kind === 'anyCraps' || kind === 'eleven') {
    return SHOOTER_WHITE
  }
  if (kind === 'passOdds' || kind === 'comeOdds') return number == null ? SHOOTER_RED : oddsMinimumDollars(true, number)
  if (kind === 'dontOdds' || kind === 'dontComeOdds') return number == null ? SHOOTER_RED + SHOOTER_WHITE : oddsMinimumDollars(false, number)
  return SHOOTER_RED
}

const roundUpOdds = (dollars: number, take: boolean, number: number): number => {
  const unit = oddsUnitWhites(take, number) * SHOOTER_WHITE
  const min = oddsMinimumDollars(take, number)
  const rounded = Math.ceil((Math.max(dollars, min) - 1e-6) / unit) * unit
  return rounded
}

const takeOdds = (kind: FeltKind): boolean => kind === 'passOdds' || kind === 'comeOdds'

const lineKind = (kind: FeltKind): FeltKind | null => {
  if (kind === 'passOdds') return 'pass'
  if (kind === 'dontOdds') return 'dont'
  if (kind === 'comeOdds') return 'come'
  if (kind === 'dontComeOdds') return 'dontCome'
  return null
}

const findBet = (slip: ShooterSlip, kind: FeltKind, number: number | null, spot: string | null): FeltBet | undefined =>
  slip.bets.find((bet) => sameBet(bet, kind, number, spot))

const flatForOdds = (slip: ShooterSlip, kind: FeltKind, number: number | null): FeltBet | undefined => {
  const line = lineKind(kind)
  if (!line) return undefined
  if (line === 'come' || line === 'dontCome') return findBet(slip, line, number, null)
  return findBet(slip, line, null, null)
}

export const canAdd = (
  slip: ShooterSlip,
  kind: FeltKind,
  number: number | null,
  point: number | null,
): boolean => {
  if ((kind === 'pass' || kind === 'dont') && point != null) return false
  if ((kind === 'tall' || kind === 'all' || kind === 'small') && (point != null || slip.pointSeen)) return false
  if ((kind === 'come' || kind === 'dontCome') && number != null) return false
  if (kind === 'passOdds' || kind === 'dontOdds') {
    if (point == null) return false
    return flatForOdds(slip, kind, null) != null
  }
  if (kind === 'comeOdds' || kind === 'dontComeOdds') {
    return number != null && flatForOdds(slip, kind, number) != null
  }
  return true
}

/** The odds hit can still take a chip. A full cap hides the box. */
export const oddsSpotOpen = (
  bets: readonly FeltBet[],
  kind: FeltKind,
  number: number | null,
  point: number | null,
): boolean => {
  if (lineKind(kind) == null) return false
  const slip = { ...emptySlip(), bets: [...bets] }
  if (!canAdd(slip, kind, number, point)) return false
  const oddsNumber = kind === 'passOdds' || kind === 'dontOdds' ? point : number
  if (oddsNumber == null || !isPointNumber(oddsNumber)) return false
  const flat = flatForOdds(slip, kind, kind === 'passOdds' || kind === 'dontOdds' ? null : oddsNumber)
  const cap = flat ? maxOddsDollars(flat.dollars) : 0
  if (!(cap > 0)) return false
  const unit = oddsUnitWhites(takeOdds(kind), oddsNumber) * SHOOTER_WHITE
  const room = Math.floor(cap / unit) * unit
  const current = findBet(slip, kind, number, null)?.dollars ?? 0
  return room > current
}

const hasLine = (slip: ShooterSlip, kind: 'pass' | 'dont'): boolean =>
  slip.bets.some((bet) => bet.kind === kind && bet.dollars > 0)

/** Come-out keeps at least one of Pass or Don't Pass. Pass is a contract once a point is up. */
export const canClear = (slip: ShooterSlip, bet: FeltBet, point: number | null): boolean => {
  if (bet.kind === 'pass') {
    if (point != null) return false
    return hasLine(slip, 'dont')
  }
  if (bet.kind === 'dont' && point == null) return hasLine(slip, 'pass')
  if (bet.kind === 'come' && bet.number != null) return false
  return true
}

const fitsChipCap = (dollars: number): boolean => {
  const chips = chipsForDollars(dollars, 1)
  const covered = chips.reduce((sum, color) => sum + CHIP_FACE_VALUE[color], 0)
  return chips.length <= CHIP_MAX_BET_CHIPS && covered + 1 >= dollars
}

const spend = (slip: ShooterSlip, amount: number): ShooterSlip | null => {
  if (!(amount > 0) || slip.purse + 1e-6 < amount) return null
  return { ...slip, purse: slip.purse - amount }
}

const refund = (slip: ShooterSlip, amount: number): ShooterSlip => ({
  ...slip,
  purse: slip.purse + Math.max(0, amount),
})

const betId = (kind: FeltKind, number: number | null, spot: string | null): string =>
  `shooter-${kind}-${number ?? 'flat'}-${spot ?? 'main'}`

export const addChip = (
  slip: ShooterSlip,
  kind: FeltKind,
  number: number | null,
  spot: string | null,
  color: ChipColor,
  point: number | null,
): ShooterSlip => {
  if (!canAdd(slip, kind, number, point)) return slip
  const oddsNumber = kind === 'passOdds' || kind === 'dontOdds' ? point : number
  const chip = CHIP_FACE_VALUE[color]
  const existing = findBet(slip, kind, kind === 'come' || kind === 'dontCome' ? number : number, spot)
  const current = existing?.dollars ?? 0
  let nextDollars = Math.max(current + chip, minimumDollars(kind, oddsNumber))
  if (takeOdds(kind) || kind === 'dontOdds' || kind === 'dontComeOdds') {
    if (oddsNumber == null) return slip
    nextDollars = roundUpOdds(Math.max(current + chip, minimumDollars(kind, oddsNumber)), takeOdds(kind), oddsNumber)
    const flat = flatForOdds(slip, kind, kind === 'passOdds' || kind === 'dontOdds' ? null : oddsNumber)
    const cap = flat ? maxOddsDollars(flat.dollars) : 0
    if (!(cap > 0)) return slip
    if (nextDollars > cap) {
      const unit = oddsUnitWhites(takeOdds(kind), oddsNumber) * SHOOTER_WHITE
      const floored = Math.floor(cap / unit) * unit
      if (!(floored > current)) return slip
      nextDollars = floored
    }
  }
  const added = nextDollars - current
  if (!fitsChipCap(nextDollars)) return slip
  const paid = spend(slip, added)
  if (!paid) return slip
  const id = existing?.id ?? betId(kind, number, spot)
  const bet: FeltBet = {
    id,
    kind,
    number,
    spot,
    dollars: nextDollars,
    preset: existing?.preset ?? 0,
  }
  const bets = existing
    ? paid.bets.map((item) => (item.id === existing.id ? bet : item))
    : [...paid.bets, bet]
  return { ...paid, bets, undo: [...paid.undo, { betId: id, added }] }
}

export const undoLast = (slip: ShooterSlip, point: number | null): ShooterSlip => {
  const click = slip.undo[slip.undo.length - 1]
  if (!click) return slip
  const bet = slip.bets.find((item) => item.id === click.betId)
  if (!bet) return { ...slip, undo: slip.undo.slice(0, -1) }
  const nextDollars = Math.max(bet.preset, bet.dollars - click.added)
  if (nextDollars === bet.dollars) return { ...slip, undo: slip.undo.slice(0, -1) }
  const removed = { ...bet, dollars: nextDollars }
  const bets = nextDollars > 0
    ? slip.bets.map((item) => (item.id === bet.id ? removed : item))
    : slip.bets.filter((item) => item.id !== bet.id)
  const trial = { ...slip, bets }
  if (point == null && (bet.kind === 'pass' || bet.kind === 'dont') && !hasLine(trial, 'pass') && !hasLine(trial, 'dont')) {
    return slip
  }
  return refund({ ...trial, undo: slip.undo.slice(0, -1) }, bet.dollars - nextDollars)
}

export const clearBet = (slip: ShooterSlip, betIdToClear: string, point: number | null): ShooterSlip => {
  const bet = slip.bets.find((item) => item.id === betIdToClear)
  if (!bet || !canClear(slip, bet, point)) return slip
  const dropped = new Set([bet.id])
  if (bet.kind === 'pass' || bet.kind === 'dont' || bet.kind === 'come' || bet.kind === 'dontCome') {
    for (const odds of slip.bets) {
      if (flatForOdds({ ...slip, bets: [bet] }, odds.kind, odds.number)?.id === bet.id) dropped.add(odds.id)
    }
  }
  const returning = slip.bets.filter((item) => dropped.has(item.id)).reduce((sum, item) => sum + item.dollars, 0)
  return refund({
    ...slip,
    bets: slip.bets.filter((item) => !dropped.has(item.id)),
    undo: slip.undo.filter((click) => !dropped.has(click.betId)),
  }, returning)
}

const ensureAmount = (
  slip: ShooterSlip,
  kind: FeltKind,
  number: number | null,
  spot: string | null,
  dollars: number,
  point: number | null,
): ShooterSlip => {
  if (!canAdd(slip, kind, number, point) && !findBet(slip, kind, number, spot)) return slip
  const existing = findBet(slip, kind, number, spot)
  const target = Math.max(dollars, minimumDollars(kind, kind === 'passOdds' || kind === 'dontOdds' ? point : number))
  if (existing && existing.dollars >= target) {
    const preset = Math.max(existing.preset, dollars)
    if (preset === existing.preset) return slip
    return { ...slip, bets: slip.bets.map((bet) => (bet.id === existing.id ? { ...bet, preset } : bet)) }
  }
  const have = existing?.dollars ?? 0
  const added = target - have
  const paid = spend(slip, added)
  if (!paid) return slip
  const bet: FeltBet = {
    id: existing?.id ?? betId(kind, number, spot),
    kind,
    number,
    spot,
    dollars: target,
    preset: Math.max(existing?.preset ?? 0, dollars),
  }
  const bets = existing
    ? paid.bets.map((item) => (item.id === existing.id ? bet : item))
    : [...paid.bets, bet]
  return { ...paid, bets }
}

const setExact = (
  slip: ShooterSlip,
  kind: FeltKind,
  number: number | null,
  spot: string | null,
  dollars: number,
): ShooterSlip => {
  const existing = findBet(slip, kind, number, spot)
  const have = existing?.dollars ?? 0
  if (dollars === have && (existing?.preset ?? 0) === dollars) return slip
  const delta = have - dollars
  const next = delta >= 0 ? refund(slip, delta) : spend(slip, -delta)
  if (!next) return slip
  if (!(dollars > 0)) {
    return {
      ...next,
      bets: next.bets.filter((bet) => !sameBet(bet, kind, number, spot)),
      undo: next.undo.filter((click) => click.betId !== existing?.id),
    }
  }
  const bet: FeltBet = {
    id: existing?.id ?? betId(kind, number, spot),
    kind,
    number,
    spot,
    dollars,
    preset: dollars,
  }
  return {
    ...next,
    bets: existing ? next.bets.map((item) => (item.id === existing.id ? bet : item)) : [...next.bets, bet],
    undo: next.undo.filter((click) => click.betId !== bet.id),
  }
}

/** Same Bet off. Pass, Don't Pass, and Make 'Em All, one red each. Light/Dark is ignored. */
export const applyStandingProfile = (slip: ShooterSlip, point: number | null): ShooterSlip => {
  if (point != null) return slip
  let next = ensureAmount(slip, 'pass', null, null, SHOOTER_RED, null)
  next = ensureAmount(next, 'dont', null, null, SHOOTER_RED, null)
  if (!next.pointSeen) next = ensureAmount(next, 'all', null, null, SHOOTER_RED, null)
  return next
}

const applyRules = (slip: ShooterSlip, rules: readonly ShooterRule[], point: number | null): ShooterSlip => {
  let next = slip
  for (const rule of rules) {
    const kind = rule.kind
    if (kind == null) continue
    if ((kind === 'tall' || kind === 'all' || kind === 'small') && next.pointSeen) continue
    if ((kind === 'come' || kind === 'dontCome') && findBet(next, kind, null, rule.spot)) continue
    if ((kind === 'come' || kind === 'dontCome') && next.bets.some((bet) => bet.kind === kind && bet.number == null)) {
      continue
    }
    next = ensureAmount(next, kind, rule.number, rule.spot, rule.dollars, point)
  }
  return next
}

/** Place the default line while Same Bet is off. Same Bet uses the saved rules, including Light/Dark. */
export const beginRoll = (slip: ShooterSlip, settings: ShooterBetSettings, point: number | null): ShooterSlip => {
  let next = { ...slip, pointSeen: slip.pointSeen || point != null }
  if (!settings.sameBet) {
    if (point == null) next = applyStandingProfile(next, null)
    return { ...next, handOpen: true, darkSide: settings.darkSide }
  }
  if (point == null && !next.handOpen) {
    return { ...applyRules(next, settings.comeOut, null), handOpen: true, darkSide: settings.darkSide }
  }
  const rules = point == null ? settings.comeOut : settings.point
  return { ...applyRules(next, rules, point), darkSide: settings.darkSide }
}

const bonusPay = (kind: FeltKind, hand: BonusHand, total: number, stake: number): BetSettlement | null => {
  if (kind !== 'tall' && kind !== 'all' && kind !== 'small') return null
  if (total === 7) return { outcome: 'lose', booked: stake, unbooked: 0, profit: -stake, staysUp: false }
  const step = applyBonusRoll(hand, total)
  const won = kind === 'all'
    ? !hand.wonAll && step.hand.wonAll
    : kind === 'tall'
      ? !hand.wonTall && step.hand.wonTall
      : !hand.wonSmall && step.hand.wonSmall
  if (!won) return { outcome: 'none', booked: stake, unbooked: 0, profit: 0, staysUp: true }
  const pays = kind === 'all' ? 150 : 30
  return { outcome: 'win', booked: stake, unbooked: 0, profit: stake * pays, staysUp: false }
}

const settlementFor = (
  bet: FeltBet,
  slip: ShooterSlip,
  point: number | null,
  total: number,
  hard: boolean,
  hand: BonusHand,
): BetSettlement & { traveledTo?: PointNumber | null } => {
  const bonus = bonusPay(bet.kind, hand, total, bet.dollars)
  if (bonus) return bonus
  if (bet.kind === 'pass') return settlePassLine(point, total, bet.dollars)
  if (bet.kind === 'dont') return settleDontPass(point, total, bet.dollars)
  if (bet.kind === 'field') return settleField(point, total, bet.dollars)
  if (bet.kind === 'place' && bet.number != null) return settlePlace(point, total, bet.number, bet.dollars)
  if (bet.kind === 'lay' && bet.number != null) return settleLay(point, total, bet.number, bet.dollars)
  if (bet.kind === 'hard' && bet.number != null) return settleHard(point, total, bet.number, bet.dollars, hard)
  if (bet.kind === 'hornNumber' && bet.number != null) return settleHorn(total, bet.number, bet.dollars)
  if (bet.kind === 'horn') return settleHornBox(total, bet.dollars)
  if (bet.kind === 'anySeven') return settleAnySeven(total, bet.dollars)
  if (bet.kind === 'anyCraps') return settleAnyCraps(total, bet.dollars)
  if (bet.kind === 'eleven') return settleEleven(total, bet.dollars)
  if (bet.kind === 'come') return settleCome(bet.number, total, bet.dollars)
  if (bet.kind === 'dontCome') return settleDontCome(bet.number, total, bet.dollars)
  const flat = flatForOdds(slip, bet.kind, bet.kind === 'passOdds' || bet.kind === 'dontOdds' ? null : bet.number)
  const flatStake = flat?.dollars ?? 0
  if (bet.kind === 'passOdds') return settlePassOdds(point, total, flatStake, bet.dollars)
  if (bet.kind === 'dontOdds') return settleDontPassOdds(point, total, flatStake, bet.dollars)
  if (bet.kind === 'comeOdds') return settleComeOdds(bet.number, point, total, flatStake, bet.dollars)
  if (bet.kind === 'dontComeOdds') return settleDontComeOdds(bet.number, total, flatStake, bet.dollars)
  return { outcome: 'none', booked: 0, unbooked: bet.dollars, profit: 0, staysUp: false }
}

const applyMoney = (purse: number, settled: BetSettlement): number => {
  let next = purse + settled.unbooked
  if (settled.outcome === 'win') next += settled.profit + (settled.staysUp ? 0 : settled.booked)
  else if (settled.outcome !== 'lose' && !settled.staysUp) next += settled.booked
  return next
}

export const settleSlip = (
  slip: ShooterSlip,
  point: number | null,
  total: number,
  hard: boolean,
  hand: BonusHand = emptyBonusHand(),
): { slip: ShooterSlip; profit: number } => {
  let purse = slip.purse
  let profit = 0
  const bets: FeltBet[] = []
  for (const bet of slip.bets) {
    const settled = settlementFor(bet, slip, point, total, hard, hand)
    purse = applyMoney(purse, settled)
    profit += settled.profit
    const traveled = 'traveledTo' in settled ? settled.traveledTo : null
    if (traveled != null && isPointNumber(traveled)) {
      const moved: FeltBet = { ...bet, number: traveled, dollars: settled.booked, preset: Math.min(bet.preset, settled.booked) }
      const prior = bets.find((item) => item.kind === bet.kind && item.number === traveled && item.spot === bet.spot)
      if (prior) prior.dollars += moved.dollars
      else bets.push(moved)
      continue
    }
    if (settled.staysUp && settled.booked > 0) {
      bets.push({ ...bet, dollars: settled.booked, preset: Math.min(bet.preset, settled.booked) })
    }
  }
  const sevenOut = point != null && total === 7
  if (sevenOut) {
    return {
      profit,
      slip: { bets: [], undo: [], purse: SHOOTER_BANK, pointSeen: false, handOpen: false, darkSide: false },
    }
  }
  return { profit, slip: { ...slip, bets, purse, undo: [] } }
}

export const markerForKind = (kind: FeltKind): ChipMarker | null => {
  if (kind === 'lay') return 'lay'
  if (kind === 'passOdds' || kind === 'dontOdds' || kind === 'comeOdds' || kind === 'dontComeOdds') return 'odds'
  if (kind === 'come') return 'come'
  if (kind === 'dontCome') return 'dc'
  return null
}

const chipSide = (kind: FeltKind): ChipBet['side'] => {
  if (kind === 'pass' || kind === 'passOdds') return 'pass'
  if (kind === 'dont' || kind === 'dontOdds') return 'dont'
  if (kind === 'all' || kind === 'tall' || kind === 'small') return kind
  return 'felt'
}

export const slipChips = (slip: ShooterSlip): ChipBet[] =>
  slip.bets.flatMap((bet) => {
    const columns = splitColumns(chipsForDollars(bet.dollars, 1))
    if (columns.length === 0) return []
    const anchor = anchorFor(bet.kind, bet.number, bet.spot)
    return [{
      id: bet.id,
      character: 'shooter' as const,
      side: chipSide(bet.kind),
      dollars: bet.dollars,
      columns,
      anchor,
      marker: markerForKind(bet.kind),
      guide: bet.kind === 'pass' || bet.kind === 'dont' || bet.kind === 'all'
        ? {
            label: bet.kind === 'pass' ? 'SHOOTER_PASS' : bet.kind === 'dont' ? 'SHOOTER_DONT' : 'SHOOTER_ALL',
            color: '#ffffff',
          }
        : undefined,
    }]
  })

const appendRule = (settings: ShooterBetSettings, phase: RulePhase, rule: ShooterRule): ShooterBetSettings => {
  const next = phase === 'comeOut'
    ? { ...settings, comeOut: [...settings.comeOut, rule] }
    : { ...settings, point: [...settings.point, rule] }
  return withLockedRule(next)
}

export const addBlankRule = (settings: ShooterBetSettings, phase: RulePhase): ShooterBetSettings => {
  const list = phase === 'comeOut' ? settings.comeOut : settings.point
  if (list.length >= SHOOTER_RULE_LIMIT || list.some((rule) => rule.kind == null)) return settings
  return appendRule(settings, phase, {
    id: `rule-${phase}-blank-${Date.now()}`,
    phase,
    kind: null,
    number: null,
    spot: null,
    dollars: 0,
    locked: false,
  })
}

export const addRule = (settings: ShooterBetSettings, phase: RulePhase, kind: FeltKind): ShooterBetSettings => {
  const list = phase === 'comeOut' ? settings.comeOut : settings.point
  if (list.length >= SHOOTER_RULE_LIMIT || list.some((rule) => rule.kind == null) || kindExhausted(list, '', kind)) {
    return settings
  }
  const variant = firstFreeVariant(list, '', kind)
  return appendRule(settings, phase, {
    id: `rule-${phase}-${kind}-${list.length + 1}-${Date.now()}`,
    phase,
    kind,
    number: variant.number,
    spot: variant.spot,
    dollars: minimumDollars(kind, variant.number),
    locked: false,
  })
}

export const deleteRule = (settings: ShooterBetSettings, id: string): ShooterBetSettings => withLockedRule({
  ...settings,
  comeOut: settings.comeOut.filter((rule) => rule.id !== id || rule.locked),
  point: settings.point.filter((rule) => rule.id !== id),
})

export const setRuleDollars = (settings: ShooterBetSettings, id: string, dollars: number): ShooterBetSettings => withLockedRule({
  ...settings,
  comeOut: settings.comeOut.map((rule) => (rule.id === id ? { ...rule, dollars: Math.max(rule.locked ? SHOOTER_RED : 0, dollars) } : rule)),
  point: settings.point.map((rule) => (rule.id === id ? { ...rule, dollars } : rule)),
})

const OPENING_LINE: readonly FeltKind[] = ['pass', 'dont', 'tall', 'all', 'small']

/** Same Bet replaces the come-out line. Light/Dark is part of that profile and is ignored while Same Bet is off. */
export const syncComeOut = (slip: ShooterSlip, settings: ShooterBetSettings): ShooterSlip => {
  if (slip.pointSeen) return slip
  if (!settings.sameBet) {
    return { ...applyStandingProfile(slip, null), handOpen: true, darkSide: settings.darkSide }
  }
  let next = slip
  for (const kind of OPENING_LINE) {
    const rule = settings.comeOut.find((item) => item.kind === kind && item.number == null && item.spot == null)
    next = setExact(next, kind, null, null, rule?.dollars ?? 0)
  }
  next = applyRules(
    next,
    settings.comeOut.filter((rule) => {
      const kind = rule.kind
      return kind == null || !OPENING_LINE.includes(kind) || rule.number != null || rule.spot != null
    }),
    null,
  )
  return { ...next, handOpen: true, darkSide: settings.darkSide }
}

export interface SessionPnl {
  usd: number
  btc: number
}

export const emptySessionPnl = (): SessionPnl => ({ usd: 0, btc: 0 })

/** A new Regular or Precision visit starts at zero. Leaving that visit leaves the closed total alone. */
export const sessionAfterMode = (session: SessionPnl, manual: boolean, wasManual: boolean): SessionPnl =>
  manual && !wasManual ? emptySessionPnl() : session

/** Results belong to the session only while Regular or Precision is still the active mode. */
export const addSessionResult = (session: SessionPnl, manual: boolean, usd: number, price: number): SessionPnl => {
  if (!manual || usd === 0) return session
  return {
    usd: session.usd + usd,
    btc: session.btc + (price > 0 ? usd / price : 0),
  }
}

export const FELT_LABEL: Record<FeltKind, string> = {
  pass: 'Pass',
  dont: "Don't Pass",
  come: 'Come',
  dontCome: "Don't Come",
  field: 'Field',
  place: 'Place',
  lay: 'Lay',
  hard: 'Hardway',
  hornNumber: 'Horn Number',
  horn: 'Horn',
  anySeven: 'Any Seven',
  anyCraps: 'Any Craps',
  eleven: 'Eleven',
  tall: 'All Tall',
  all: "Make 'Em All",
  small: 'All Small',
  passOdds: 'Pass Odds',
  dontOdds: "Don't Pass Odds",
  comeOdds: 'Come Odds',
  dontComeOdds: "Don't Come Odds",
}

export const COME_OUT_KINDS: readonly FeltKind[] = [
  'pass', 'dont', 'come', 'dontCome', 'field', 'anySeven', 'anyCraps', 'eleven', 'horn', 'hornNumber', 'tall', 'all', 'small',
]

export const POINT_KINDS: readonly FeltKind[] = [
  'come', 'dontCome', 'place', 'lay', 'field', 'hard', 'anySeven', 'anyCraps', 'eleven', 'horn', 'hornNumber',
  'passOdds', 'dontOdds', 'comeOdds', 'dontComeOdds',
]
