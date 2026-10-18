import type { ChipColor } from '../chipConstants'

/** Hex colors aligned with `index.css` chip themes (WebGL cannot read CSS vars). */
export const CHIP_PALETTE: Record<
  ChipColor,
  { face: number; edge: number; spot: number; mark: boolean }
> = {
  white: { face: 0xe2c48a, edge: 0xa8844c, spot: 0xf7e6c4, mark: true },
  red: { face: 0x9a2e18, edge: 0x5c1408, spot: 0xf2c9be, mark: true },
  green: { face: 0x3a6824, edge: 0x1e3a10, spot: 0x8fb56a, mark: true },
  blue: { face: 0x2c5368, edge: 0x0e2433, spot: 0x8aa0ae, mark: true },
  black: { face: 0x362112, edge: 0x0c0804, spot: 0x947458, mark: true },
}

/**
 * Solid lay button. A step brighter than the blue denomination face `#2c5368`,
 * with a plain edge and no spots.
 */
export const LAY_CHIP_FACE = 0x3b7b9b
export const LAY_CHIP_EDGE = 0x1e4e68
