import type { PatternCatalogEntry, PatternId } from '../taTypes'

const entry = (
  id: PatternId,
  displayName: string,
  bias: PatternCatalogEntry['bias'],
  blurb: string,
  arrow: PatternCatalogEntry['arrow'],
): PatternCatalogEntry => ({
  id,
  displayName,
  bias,
  blurb,
  arrow,
})

export const STRUCT_PATTERN_CATALOG: Record<PatternId, PatternCatalogEntry> = {
  doubleTop: entry(
    'doubleTop',
    'Double top',
    'bearish',
    'Two swing highs at similar price; confirmed by close breaking below the middle trough.',
    'down',
  ),
  doubleBottom: entry(
    'doubleBottom',
    'Double bottom',
    'bullish',
    'Two swing lows at similar price; confirmed by close breaking above the middle peak.',
    'up',
  ),
  tripleTop: entry(
    'tripleTop',
    'Triple top',
    'bearish',
    'Three tests of resistance; confirmed by close breaking below the middle swing low.',
    'down',
  ),
  tripleBottom: entry(
    'tripleBottom',
    'Triple bottom',
    'bullish',
    'Three tests of support; confirmed by close breaking above the middle swing high.',
    'up',
  ),
  rangeBreakoutBull: entry(
    'rangeBreakoutBull',
    'Range breakout (bull)',
    'bullish',
    'Tightening range after compression; close breaks above the upper bound.',
    'diagonalUp',
  ),
  rangeBreakoutBear: entry(
    'rangeBreakoutBear',
    'Range breakout (bear)',
    'bearish',
    'Tightening range after compression; close breaks below the lower bound.',
    'diagonalDown',
  ),
}

export const STRUCT_CATALOG_ORDER: readonly PatternId[] = [
  'doubleTop',
  'doubleBottom',
  'tripleTop',
  'tripleBottom',
  'rangeBreakoutBull',
  'rangeBreakoutBear',
] as const

export const structCatalogEntry = (id: PatternId): PatternCatalogEntry => STRUCT_PATTERN_CATALOG[id]!