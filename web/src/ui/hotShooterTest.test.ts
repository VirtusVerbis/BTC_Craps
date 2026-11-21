import { describe, expect, it } from 'vitest'
import { isHotShooterTestQuery } from './hotShooterTest'

describe('hotShooter test query', () => {
  it('accepts 1 and true', () => {
    expect(isHotShooterTestQuery('1')).toBe(true)
    expect(isHotShooterTestQuery('true')).toBe(true)
    expect(isHotShooterTestQuery('0')).toBe(false)
    expect(isHotShooterTestQuery(null)).toBe(false)
  })
})