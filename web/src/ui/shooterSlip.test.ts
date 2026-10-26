import { describe, expect, it } from 'vitest'
import { emptyBonusHand, applyBonusRoll } from './bonusCraps'
import { CHIP_FACE_VALUE } from './chipBets'
import {
  SHOOTER_BANK,
  SHOOTER_WHITE,
  addChip,
  beginRoll,
  canClear,
  oddsSpotOpen,
  clearBet,
  closeSnapshot,
  defaultBetSettings,
  deleteRule,
  emptySlip,
  minimumDollars,
  oddsMinimumDollars,
  openSnapshot,
  ruleMinusAction,
  addBlankRule,
  addRule,
  kindExhausted,
  setRuleDollars,
  slipChips,
  variantTaken,
  setTableSide,
  addSessionResult,
  sessionAfterMode,
  settleSlip,
  syncComeOut,
  undoLast,
  withLockedRule,
  type FeltBet,
  type ShooterRule,
} from './shooterSlip'
import { maxOddsDollars } from './crapsPayouts'
import { SHOOTER_RED } from './shooterProfile'

const red = SHOOTER_RED

describe('shooter minimums', () => {
  it('requires one red on the line, come, field, and don\'t come', () => {
    expect(minimumDollars('pass', null)).toBe(red)
    expect(minimumDollars('dont', null)).toBe(red)
    expect(minimumDollars('come', null)).toBe(red)
    expect(minimumDollars('dontCome', null)).toBe(red)
    expect(minimumDollars('field', null)).toBe(red)
  })

  it('uses one red plus one white where the booking unit is six', () => {
    expect(minimumDollars('place', 6)).toBe(red + SHOOTER_WHITE)
    expect(minimumDollars('place', 4)).toBe(red)
    expect(minimumDollars('lay', 5)).toBe(red + SHOOTER_WHITE)
    expect(minimumDollars('lay', 10)).toBe(red)
  })

  it('raises odds to a whole payout and at least one red', () => {
    expect(oddsMinimumDollars(true, 6)).toBe(red)
    expect(oddsMinimumDollars(true, 4)).toBe(red)
    expect(oddsMinimumDollars(true, 5)).toBe(red + SHOOTER_WHITE)
    expect(oddsMinimumDollars(false, 4)).toBe(red + SHOOTER_WHITE)
    expect(oddsMinimumDollars(false, 6)).toBe(red + SHOOTER_WHITE)
    expect(oddsMinimumDollars(false, 5)).toBe(red + SHOOTER_WHITE)
  })
})

describe('shooter slip', () => {
  it('opens a hand with one red on Pass, Don\'t Pass, and Make \'Em All', () => {
    const slip = beginRoll(emptySlip(), defaultBetSettings(), null)
    expect(slip.purse).toBe(SHOOTER_BANK - red * 3)
    expect(slip.bets.map((bet) => bet.kind).sort()).toEqual(['all', 'dont', 'pass'])
  })

  it('keeps Pass, Don\'t Pass, and Make \'Em All when Dark Side is on and Same Bet is off', () => {
    const slip = beginRoll(emptySlip(), { ...defaultBetSettings(), darkSide: true }, null)
    expect(slip.bets.map((bet) => bet.kind).sort()).toEqual(['all', 'dont', 'pass'])
    expect(slip.bets.every((bet) => bet.dollars === red)).toBe(true)
  })

  it('opens Dark Side with one red on Don\'t Pass when Same Bet is on', () => {
    const settings = withLockedRule({ ...defaultBetSettings(), sameBet: true, darkSide: true, comeOut: [] })
    const slip = beginRoll(emptySlip(), settings, null)
    expect(slip.bets.map((bet) => bet.kind)).toEqual(['dont'])
    expect(slip.bets[0].dollars).toBe(red)
  })

  it('does not undo a preset and will not drop the last line', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    expect(undoLast(opened, null)).toBe(opened)
    const pass = opened.bets.find((bet) => bet.kind === 'pass')
    expect(pass && canClear(opened, pass, null)).toBe(true)
    const cleared = pass ? clearBet(opened, pass.id, null) : opened
    expect(cleared.bets.some((bet) => bet.kind === 'pass')).toBe(false)
    const dont = cleared.bets.find((bet) => bet.kind === 'dont')
    expect(dont && canClear(cleared, dont, null)).toBe(false)
  })

  it('adds a user chip that undo removes without touching the preset', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    const added = addChip(opened, 'pass', null, null, 'white', null)
    const pass = added.bets.find((bet) => bet.kind === 'pass')
    expect(pass?.dollars).toBe(red + SHOOTER_WHITE)
    const undone = undoLast(added, null)
    expect(undone.bets.find((bet) => bet.kind === 'pass')?.dollars).toBe(red)
  })

  it('refuses a pass bet once a point is up and keeps the pass contract', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    const point = beginRoll(opened, defaultBetSettings(), 6)
    expect(addChip(point, 'pass', null, null, 'red', 6)).toBe(point)
    const pass = point.bets.find((bet) => bet.kind === 'pass')
    expect(pass && canClear(point, pass, 6)).toBe(false)
  })

  it('moves a come bet onto its number and refuses to clear it there', () => {
    let slip = beginRoll(emptySlip(), defaultBetSettings(), null)
    slip = addChip(slip, 'come', null, null, 'red', null)
    const moved = settleSlip(slip, 6, 8, false)
    const come = moved.slip.bets.find((bet) => bet.kind === 'come')
    expect(come).toMatchObject({ number: 8 })
    expect(come && canClear(moved.slip, come, 6)).toBe(false)
    expect(addChip(moved.slip, 'come', 8, null, 'red', 6)).toBe(moved.slip)
  })

  it('opens an odds box only while that flat can still take odds', () => {
    const line = (kind: FeltBet['kind'], number: number | null, dollars: number): FeltBet => ({
      id: `${kind}-${number ?? 'flat'}`,
      kind,
      number,
      spot: null,
      dollars,
      preset: 0,
    })
    const pass = line('pass', null, red)
    expect(oddsSpotOpen([pass], 'passOdds', null, null)).toBe(false)
    expect(oddsSpotOpen([pass], 'passOdds', null, 6)).toBe(true)
    expect(oddsSpotOpen([pass, line('passOdds', null, maxOddsDollars(red))], 'passOdds', null, 6)).toBe(false)
    const come = line('come', 5, red)
    expect(oddsSpotOpen([come], 'comeOdds', 5, null)).toBe(true)
    expect(oddsSpotOpen([come], 'comeOdds', 8, null)).toBe(false)
    expect(oddsSpotOpen([line('dontCome', 4, red)], 'dontComeOdds', 4, null)).toBe(true)
  })

  it('pays the field on the come-out and keeps the bank after a seven out', () => {
    let slip = beginRoll(emptySlip(), defaultBetSettings(), null)
    slip = addChip(slip, 'field', null, null, 'red', null)
    const comeOut = settleSlip(slip, null, 2, false)
    expect(comeOut.profit).toBe(red * 3)
    const pointed = beginRoll(comeOut.slip, defaultBetSettings(), 6)
    const out = settleSlip(pointed, 6, 7, false)
    expect(out.slip.purse).toBe(SHOOTER_BANK + red * 2)
    expect(out.bankProfit).toBe(0)
    expect(out.slip.bets).toEqual([])
    expect(out.slip.handOpen).toBe(false)
  })

  it('returns come odds on a come-out seven', () => {
    let slip = beginRoll(emptySlip(), defaultBetSettings(), 6)
    slip = addChip(slip, 'come', null, null, 'red', 6)
    const traveled = settleSlip(slip, 6, 5, false).slip
    const withOdds = addChip(traveled, 'comeOdds', 5, null, 'red', null)
    const comeOut = settleSlip(withOdds, null, 7, false)
    expect(comeOut.slip.bets.some((bet) => bet.kind === 'comeOdds')).toBe(false)
    expect(comeOut.slip.purse).toBeGreaterThan(withOdds.purse)
  })

  it('resets Pass or Don\'t Pass to one red when the table side toggles', () => {
    const raised = setRuleDollars(defaultBetSettings(), 'locked-pass', red * 4)
    const extra = addRule(raised, 'comeOut', 'field')
    const dark = setTableSide(extra, true)
    expect(dark.darkSide).toBe(true)
    expect(dark.comeOut.filter((rule) => rule.kind === 'pass' || rule.kind === 'dont')).toEqual([
      expect.objectContaining({ kind: 'dont', locked: true, dollars: red }),
    ])
    expect(dark.comeOut.some((rule) => rule.kind === 'field')).toBe(true)
    const light = setTableSide(dark, false)
    expect(light.comeOut.find((rule) => rule.locked)).toMatchObject({ kind: 'pass', dollars: red })
    expect(setTableSide(raised, false)).toBe(raised)
  })

  it('locks the come-out rule for the selected side', () => {
    const dark = withLockedRule({ ...defaultBetSettings(), darkSide: true, comeOut: [] })
    expect(dark.comeOut.some((rule) => rule.locked && rule.kind === 'dont')).toBe(true)
    const raised = setRuleDollars(dark, 'locked-dont', red * 3)
    expect(raised.comeOut.find((rule) => rule.locked)?.dollars).toBe(red * 3)
    expect(deleteRule(raised, 'locked-dont').comeOut.some((rule) => rule.locked)).toBe(true)
  })

  it('drops Make \'Em All on a seven without putting it back on that roll', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    const lost = settleSlip(opened, null, 7, false, emptyBonusHand())
    expect(lost.slip.bets.some((bet) => bet.kind === 'all')).toBe(false)
  })

  it('pays Make \'Em All when the hand completes', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    let hand = emptyBonusHand()
    for (const total of [8, 9, 10, 11, 12, 2, 3, 4, 5]) hand = applyBonusRoll(hand, total).hand
    const paid = settleSlip(opened, 6, 6, true, hand)
    expect(paid.profit).toBe(red * 150)
  })

  it('leaves the default line in place when Dark Side flips and Same Bet is off', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    const dark = syncComeOut(opened, { ...defaultBetSettings(), darkSide: true })
    expect(dark.bets.map((bet) => bet.kind).sort()).toEqual(['all', 'dont', 'pass'])
    expect(dark.purse).toBe(opened.purse)
  })

  it('replaces the opening line when Same Bet turns on before a point', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    const same = syncComeOut(opened, withLockedRule({ ...defaultBetSettings(), sameBet: true, comeOut: [] }))
    expect(same.bets.map((bet) => bet.kind)).toEqual(['pass'])
    expect(same.purse).toBe(SHOOTER_BANK - red)
  })

  it('starts a session at zero on entry and ignores results after Auto returns', () => {
    const entered = sessionAfterMode({ usd: 40, btc: 1 }, true, false)
    expect(entered).toEqual({ usd: 0, btc: 0 })
    const kept = addSessionResult(entered, false, red, 50_000)
    expect(kept).toBe(entered)
    expect(addSessionResult(entered, true, red, 50_000)).toEqual({ usd: red, btc: red / 50_000 })
  })

  it('keeps Pass up when Dark Side is on and Same Bet is off', () => {
    const opened = beginRoll(emptySlip(), defaultBetSettings(), null)
    const point = beginRoll(opened, { ...defaultBetSettings(), darkSide: true }, 8)
    expect(point.bets.some((bet) => bet.kind === 'pass')).toBe(true)
    expect(point.bets.some((bet) => bet.kind === 'dont')).toBe(true)
    const made = settleSlip(point, 8, 8, false).slip
    const comeOut = beginRoll(made, { ...defaultBetSettings(), darkSide: true }, null)
    expect(comeOut.bets.some((bet) => bet.kind === 'pass')).toBe(true)
    expect(comeOut.bets.some((bet) => bet.kind === 'dont')).toBe(true)
  })

  it('turns Eleven on the 11 square into Horn 11 and keeps the higher amount', () => {
    const line = (id: string, dollars: number, spot: string | null, kind: ShooterRule['kind'], number: number | null): ShooterRule => ({
      id,
      phase: 'comeOut',
      kind,
      number,
      spot,
      dollars,
      locked: id === 'locked-pass',
    })
    const settings = withLockedRule({
      ...defaultBetSettings(),
      comeOut: [
        line('locked-pass', red, null, 'pass', null),
        line('yo', red, 'eleven', 'eleven', null),
        line('horn', red * 2, null, 'hornNumber', 11),
      ],
    })
    const horn = settings.comeOut.filter((rule) => rule.kind === 'hornNumber' && rule.number === 11)
    expect(horn).toEqual([expect.objectContaining({ id: 'yo', dollars: red * 2, spot: null })])
    const point = withLockedRule({
      ...defaultBetSettings(),
      point: [
        { ...line('e-bar', red, 'e', 'eleven', null), phase: 'point' },
        { ...line('craps', red, 'craps', 'anyCraps', null), phase: 'point' },
        { ...line('c', red * 2, 'c', 'anyCraps', null), phase: 'point' },
      ],
    })
    expect(point.point.filter((rule) => rule.kind === 'eleven')).toEqual([
      expect.objectContaining({ id: 'e-bar', spot: 'e' }),
    ])
    expect(point.point.filter((rule) => rule.kind === 'anyCraps')).toHaveLength(2)
  })

  it('prunes a duplicate Pass onto the locked row at the higher amount', () => {
    const settings = withLockedRule({
      ...defaultBetSettings(),
      comeOut: [
        {
          id: 'extra',
          phase: 'comeOut',
          kind: 'pass',
          number: null,
          spot: null,
          dollars: red * 4,
          locked: false,
        },
        {
          id: 'locked-pass',
          phase: 'comeOut',
          kind: 'pass',
          number: null,
          spot: null,
          dollars: red,
          locked: true,
        },
      ],
    })
    expect(settings.comeOut.filter((rule) => rule.kind === 'pass')).toEqual([
      expect.objectContaining({ id: 'locked-pass', locked: true, dollars: red * 4 }),
    ])
  })

  it('skips a blank rule and greys out a bet that is already used', () => {
    const blank = addBlankRule(defaultBetSettings(), 'comeOut')
    expect(blank.comeOut.some((rule) => rule.kind == null)).toBe(true)
    expect(addBlankRule(blank, 'comeOut')).toBe(blank)
    const placed = beginRoll(emptySlip(), { ...blank, sameBet: true }, null)
    expect(placed.bets.map((bet) => bet.kind)).toEqual(['pass'])
    expect(kindExhausted(blank.comeOut, 'other', 'pass')).toBe(true)
    expect(variantTaken(blank.comeOut, 'other', 'pass', null, null)).toBe(true)
    const field = addRule(defaultBetSettings(), 'point', 'place')
    expect(variantTaken(field.point, 'other', 'place', 4, null)).toBe(true)
    expect(kindExhausted(field.point, 'other', 'place')).toBe(false)
  })

  it('marks come, don\'t come, odds, and lay stacks', () => {
    const bet = (kind: FeltBet['kind'], number: number | null): FeltBet => ({
      id: kind + String(number),
      kind,
      number,
      spot: null,
      dollars: red,
      preset: red,
    })
    const chips = slipChips({
      ...emptySlip(),
      bets: [bet('lay', 4), bet('come', null), bet('dontCome', 6), bet('passOdds', null), bet('field', null)],
    })
    expect(chips.map((chip) => [chip.id, chip.marker])).toEqual([
      ['lay4', 'lay'],
      ['comenull', 'come'],
      ['dontCome6', 'dc'],
      ['passOddsnull', 'odds'],
      ['fieldnull', null],
    ])
  })

  it('resets a raised rule and deletes one that is already at its minimum', () => {
    const rule = (dollars: number, locked = false, kind: ShooterRule['kind'] = 'field'): ShooterRule => ({
      id: 'rule',
      phase: 'comeOut',
      kind,
      number: null,
      spot: null,
      dollars,
      locked,
    })
    expect(ruleMinusAction(rule(red * 2))).toBe('reset')
    expect(ruleMinusAction(rule(red))).toBe('delete')
    expect(ruleMinusAction(rule(SHOOTER_WHITE))).toBe('reset')
    expect(ruleMinusAction(rule(red, true, 'pass'))).toBe('none')
    expect(ruleMinusAction(rule(red * 3, true, 'pass'))).toBe('reset')
    expect(ruleMinusAction(rule(0, false, null))).toBe('delete')
  })

  it('places auto rules without spending the bank', () => {
    const slip = beginRoll(emptySlip(), defaultBetSettings(), null, false)
    expect(slip.purse).toBe(SHOOTER_BANK)
    expect(slip.bets.every((bet) => !bet.banked)).toBe(true)
    expect(slip.wiped).toBe(false)
  })

  it('scales a saved rule to the cash left and leaves the preset alone', () => {
    const base = withLockedRule({ ...defaultBetSettings(), sameBet: true, comeOut: [] })
    const added = addRule(base, 'point', 'place')
    const place = added.point.find((rule) => rule.kind === 'place')
    expect(place).toBeTruthy()
    const settings = setRuleDollars(added, place?.id ?? '', red * 10)
    const opened = beginRoll({ ...emptySlip(), snapshot: true }, settings, null, true)
    const short = { ...opened, purse: red + SHOOTER_WHITE }
    const point = beginRoll(short, settings, 4, true)
    expect(point.bets.find((bet) => bet.kind === 'place')?.dollars).toBe(red + SHOOTER_WHITE)
    expect(point.purse).toBe(0)
    expect(settings.point.find((rule) => rule.kind === 'place')?.dollars).toBe(red * 10)
  })

  it('skips a rule when the bank cannot cover its minimum', () => {
    const base = withLockedRule({ ...defaultBetSettings(), sameBet: true, comeOut: [] })
    const added = addRule(base, 'point', 'place')
    const place = added.point.find((rule) => rule.kind === 'place')
    const settings = setRuleDollars(added, place?.id ?? '', red * 4)
    const pointRules = settings.point.map((rule) => (rule.kind === 'place' ? { ...rule, number: 6 } : rule))
    const slip = beginRoll({ ...emptySlip(), purse: SHOOTER_WHITE, snapshot: true }, { ...settings, point: pointRules }, 8, true)
    expect(slip.bets.some((bet) => bet.kind === 'place')).toBe(false)
  })

  it('wipes a come-out that cannot post one red', () => {
    const settings = withLockedRule({ ...defaultBetSettings(), sameBet: true, comeOut: [] })
    const slip = beginRoll({ ...emptySlip(), purse: SHOOTER_WHITE, snapshot: true }, settings, null, true)
    expect(slip.wiped).toBe(true)
    expect(slip.snapshot).toBe(false)
    expect(slip.bets.some((bet) => bet.kind === 'pass' || bet.kind === 'dont')).toBe(false)
  })

  it('keeps a bank that still has chips and opens a fresh one otherwise', () => {
    const live = { ...emptySlip(), snapshot: true, purse: red, bets: [{ id: 'p', kind: 'pass' as const, number: null, spot: null, dollars: red, preset: red, banked: true }] }
    expect(openSnapshot(live).purse).toBe(red)
    expect(closeSnapshot(live).snapshot).toBe(true)
    const clear = closeSnapshot({ ...live, bets: [] })
    expect(clear.snapshot).toBe(false)
    expect(openSnapshot(clear).purse).toBe(SHOOTER_BANK)
  })

  it('rejects a chip the purse cannot cover', () => {
    const broke = { ...emptySlip(), purse: SHOOTER_WHITE }
    expect(addChip(broke, 'pass', null, null, 'red', null)).toBe(broke)
    expect(CHIP_FACE_VALUE.black * 10).toBe(SHOOTER_BANK)
  })
})
