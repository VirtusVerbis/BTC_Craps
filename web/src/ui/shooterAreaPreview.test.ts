import { describe, expect, it } from 'vitest'
import { CHIP_MAX_STACK } from './chipConstants'
import {
  SHOOTER_COME_10_X,
  SHOOTER_COME_10_Y,
  SHOOTER_COME_LAY_6_X,
  SHOOTER_COME_LAY_6_Y,
  SHOOTER_DC_4_X,
  SHOOTER_DC_4_Y,
  SHOOTER_DC_LAY_8_X,
  SHOOTER_DC_LAY_8_Y,
  SHOOTER_DONT_ODDS_X,
  SHOOTER_DONT_ODDS_Y,
  SHOOTER_PASS_ODDS_X,
  SHOOTER_PASS_ODDS_Y,
  shooterAreaPreviewBets,
} from './shooterBetGeometry'

describe('shooter area preview', () => {
  const at = (x: number, y: number) =>
    shooterAreaPreviewBets().find((bet) => bet.anchor?.x === x && bet.anchor.y === y)

  it('puts a full red stack on every odds spot and on traveled come and don\'t come', () => {
    const full = [Array.from({ length: CHIP_MAX_STACK }, () => 'red')]
    expect(at(SHOOTER_PASS_ODDS_X, SHOOTER_PASS_ODDS_Y)?.columns).toEqual(full)
    expect(at(SHOOTER_DONT_ODDS_X, SHOOTER_DONT_ODDS_Y)?.columns).toEqual(full)
    expect(at(SHOOTER_COME_LAY_6_X, SHOOTER_COME_LAY_6_Y)?.columns).toEqual(full)
    expect(at(SHOOTER_DC_LAY_8_X, SHOOTER_DC_LAY_8_Y)?.columns).toEqual(full)
    expect(at(SHOOTER_COME_10_X, SHOOTER_COME_10_Y)?.lay).toBe(false)
    expect(at(SHOOTER_DC_4_X, SHOOTER_DC_4_Y)?.columns).toEqual(full)
  })

  it('marks lay spots with a lay chip and keeps one stack per pixel', () => {
    const bets = shooterAreaPreviewBets()
    expect(bets.find((bet) => bet.id === 'shooter-area-lay-4')?.lay).toBe(true)
    const pixels = bets.map((bet) => `${bet.anchor?.x},${bet.anchor?.y}`)
    expect(new Set(pixels).size).toBe(pixels.length)
  })
})
