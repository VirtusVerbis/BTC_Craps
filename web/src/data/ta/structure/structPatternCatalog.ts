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
  swingFailureHigh: entry(
    'swingFailureHigh',
    'Swing failure high',
    'bearish',
    'Price sweeps above the recent swing high but closes back below it.',
    'down',
  ),
  swingFailureLow: entry(
    'swingFailureLow',
    'Swing failure low',
    'bullish',
    'Price sweeps below the recent swing low but closes back above it.',
    'up',
  ),
  structureBreakBull: entry(
    'structureBreakBull',
    'Structure break (bull)',
    'bullish',
    'Close breaks above the most recent fractal swing high.',
    'up',
  ),
  structureBreakBear: entry(
    'structureBreakBear',
    'Structure break (bear)',
    'bearish',
    'Close breaks below the most recent fractal swing low.',
    'down',
  ),
  rangeTrapBull: entry(
    'rangeTrapBull',
    'Range trap (bull)',
    'bullish',
    'Compressed range; fake breakdown then close back above support.',
    'up',
  ),
  rangeTrapBear: entry(
    'rangeTrapBear',
    'Range trap (bear)',
    'bearish',
    'Compressed range; fake breakout then close back below resistance.',
    'down',
  ),
  headAndShoulders: entry(
    'headAndShoulders',
    'Head & shoulders',
    'bearish',
    'Three peaks with a higher head and level shoulders; confirmed below the neckline.',
    'down',
  ),
  inverseHeadAndShoulders: entry(
    'inverseHeadAndShoulders',
    'Inverse head & shoulders',
    'bullish',
    'Three troughs with a lower head and level shoulders; confirmed above the neckline.',
    'up',
  ),
}

export const STRUCT_CATALOG_ORDER: readonly PatternId[] = [
  'doubleTop',
  'doubleBottom',
  'tripleTop',
  'tripleBottom',
  'rangeBreakoutBull',
  'rangeBreakoutBear',
  'swingFailureHigh',
  'swingFailureLow',
  'structureBreakBull',
  'structureBreakBear',
  'rangeTrapBull',
  'rangeTrapBear',
  'headAndShoulders',
  'inverseHeadAndShoulders',
] as const

export const structCatalogEntry = (id: PatternId): PatternCatalogEntry => STRUCT_PATTERN_CATALOG[id]!