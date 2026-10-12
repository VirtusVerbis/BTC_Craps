import { describe, expect, it } from 'vitest'
import { buildChipRendererMode } from './chipRendererMode'

describe('chipRendererMode', () => {
  it('defaults to dom when env unset', () => {
    expect(buildChipRendererMode()).toBe('dom')
  })
})
