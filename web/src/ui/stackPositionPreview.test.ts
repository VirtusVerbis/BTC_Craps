import { describe, expect, it } from 'vitest'
import {
  CAT_PROFILE_ON,
  OLD_LADY_PROFILE_ON,
  OLD_MAN_PROFILE_ON,
  SHOOTER_PASS_X,
  SHOOTER_PASS_Y,
  STACK_POSITION_PREVIEW_HEIGHT,
  WOLF_LAY_ON,
  WOLF_PROFILE_ON,
  WOLF_ACROSS_10_X,
  WOLF_ACROSS_10_Y,
  WOLF_POINT_10_X,
  WOLF_POINT_10_Y,
} from './characterBetConstants'
import { allPuckPlacements } from './puckState'
import { stackPositionPreviewBets, stackPositionSpots } from './stackPositionPreview'

describe('stack position preview', () => {
  it('builds one stack per pixel and names every constant that shares it', () => {
    expect(WOLF_ACROSS_10_X).toBe(WOLF_POINT_10_X)
    expect(WOLF_ACROSS_10_Y).toBe(WOLF_POINT_10_Y)
    const bets = stackPositionPreviewBets()
    expect(bets.length).toBeLessThan(stackPositionSpots().length)
    const shared = bets.find((bet) => bet.anchor?.x === WOLF_ACROSS_10_X && bet.anchor.y === WOLF_ACROSS_10_Y)
    expect(shared?.guide?.label).toContain('WOLF_ACROSS_10')
    expect(shared?.guide?.label).toContain('WOLF_POINT_10')
    expect(shared?.columns).toEqual([Array.from({ length: STACK_POSITION_PREVIEW_HEIGHT }, () => 'white')])
  })

  it('lists the OFF puck and every ON point', () => {
    const pucks = allPuckPlacements()
    expect(pucks.map((puck) => puck.src)).toEqual([
      '/Off_Puck.png',
      '/On_Puck.png',
      '/On_Puck.png',
      '/On_Puck.png',
      '/On_Puck.png',
      '/On_Puck.png',
      '/On_Puck.png',
    ])
    expect(new Set(pucks.map((puck) => `${puck.x},${puck.y}`)).size).toBe(pucks.length)
  })

  it('includes the shooter rail spot and a pass-line anchor', () => {
    const bets = stackPositionPreviewBets()
    expect(bets.some((bet) => bet.anchor?.x === SHOOTER_PASS_X && bet.anchor.y === SHOOTER_PASS_Y)).toBe(true)
    expect(bets.some((bet) => bet.guide?.label === 'wolf pass')).toBe(true)
  })

  it('follows each character profile switch and still draws pass and dont', () => {
    const labels = stackPositionPreviewBets().map((bet) => bet.guide?.label ?? '')
    const has = (part: string) => labels.some((label) => label.includes(part))
    expect(has('CAT_PLACE')).toBe(CAT_PROFILE_ON)
    expect(has('OLD_LADY_INSIDE')).toBe(OLD_LADY_PROFILE_ON)
    expect(has('OLD_MAN_FIELD')).toBe(OLD_MAN_PROFILE_ON)
    expect(has('WOLF_ACROSS')).toBe(WOLF_PROFILE_ON)
    expect(has('WOLF_LAY')).toBe(WOLF_PROFILE_ON && WOLF_LAY_ON)
    expect(has('wolf pass')).toBe(true)
    expect(has('cat dont')).toBe(true)
  })
})
