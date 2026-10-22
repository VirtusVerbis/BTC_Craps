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
  anchorFor,
  hitAt,
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
    expect(at(SHOOTER_COME_10_X, SHOOTER_COME_10_Y)?.marker).toBe('come')
    expect(at(SHOOTER_DC_4_X, SHOOTER_DC_4_Y)?.columns).toEqual(full)
    expect(shooterAreaPreviewBets().find((bet) => bet.id === 'shooter-area-come')?.marker).toBe('come')
    expect(shooterAreaPreviewBets().find((bet) => bet.id === 'shooter-area-dont-come')?.marker).toBe('dc')
    expect(at(SHOOTER_PASS_ODDS_X, SHOOTER_PASS_ODDS_Y)?.marker).toBe('odds')
    expect(at(SHOOTER_COME_LAY_6_X, SHOOTER_COME_LAY_6_Y)?.marker).toBe('odds')
    expect(at(SHOOTER_DC_LAY_8_X, SHOOTER_DC_LAY_8_Y)?.marker).toBe('odds')
    expect(at(SHOOTER_DONT_ODDS_X, SHOOTER_DONT_ODDS_Y)?.marker).toBe('odds')
  })

  it('marks lay spots with a lay chip and keeps one stack per pixel', () => {
    const bets = shooterAreaPreviewBets()
    expect(bets.find((bet) => bet.id === 'shooter-area-lay-4')?.marker).toBe('lay')
    const pixels = bets.map((bet) => `${bet.anchor?.x},${bet.anchor?.y}`)
    expect(new Set(pixels).size).toBe(pixels.length)
  })

  it('puts Horn 11 on the old 11 square', () => {
    expect(hitAt({ x: 890, y: 1310 })).toMatchObject({ kind: 'hornNumber', number: 11, spot: null })
    expect(anchorFor('hornNumber', 11, null)).toEqual({ x: 891, y: 1311 })
    expect(hitAt({ x: 924, y: 1485 })).toMatchObject({ kind: 'eleven', spot: 'e' })
  })
})
