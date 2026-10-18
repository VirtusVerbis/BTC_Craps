import { describe, expect, it } from 'vitest'
import { compareDepth, depthBand, dieDepthKey } from './feltDepth'

describe('felt depth order', () => {
  it('pulls an airborne die closer than its felt contact', () => {
    const felt = 500
    const key = dieDepthKey(felt, 80, -55)
    expect(key).toBeLessThan(felt)
    expect(depthBand(felt, [key])).toBe('behind')
  })

  it('keeps a stack in front of a risen die in the closer band', () => {
    const key = dieDepthKey(500, 40, -55)
    expect(depthBand(key - 1, [key])).toBe('front')
  })

  it('splits the felt at the two dice and lets a tie cover that die', () => {
    const keys = [100, 400]
    expect(depthBand(500, keys)).toBe('behind')
    expect(depthBand(250, keys)).toBe('between')
    expect(depthBand(400, keys)).toBe('between')
    expect(depthBand(100, keys)).toBe('front')
    expect(depthBand(40, keys)).toBe('front')
  })

  it('puts every object in front when no die is visible', () => {
    expect(depthBand(10, [])).toBe('front')
    expect(depthBand(900, [])).toBe('front')
  })

  it('sorts farther felt first and does not let plate index cross a felt gap', () => {
    const farHighPlate = { feltZ: 200, plate: 800 }
    const nearLowPlate = { feltZ: 199.9, plate: 0 }
    expect(compareDepth(farHighPlate, nearLowPlate)).toBeLessThan(0)
    expect(compareDepth({ feltZ: 40, plate: 0 }, { feltZ: 40, plate: 3 })).toBeLessThan(0)
    expect(compareDepth({ feltZ: 40, plate: -1 }, { feltZ: 40, plate: 0 })).toBeLessThan(0)
  })
})
