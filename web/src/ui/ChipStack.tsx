import type { CSSProperties } from 'react'
import {
  CHIP_FELT_TILT_DEG,
  CHIP_HEIGHT_PX,
  CHIP_SIZE_SCALAR,
  CHIP_THICKNESS_PX,
  CHIP_WIDTH_PX,
  chipRotationDeg,
  type ChipColor,
} from './chipConstants'

interface ChipStackProps {
  /** Stage-pixel center of the bottom chip. */
  x: number
  y: number
  /** Bottom to top. */
  chips: ChipColor[]
}

export const ChipStack = ({ x, y, chips }: ChipStackProps) => {
  const scalar = CHIP_SIZE_SCALAR
  const width = CHIP_WIDTH_PX * scalar
  const height = CHIP_HEIGHT_PX * scalar
  const thickness = Math.max(1, Math.round(CHIP_THICKNESS_PX * scalar))

  return (
    <div className="chip-stack" style={{ left: x, top: y }} aria-hidden>
      {chips.map((color, index) => {
        const spin = chipRotationDeg(index)
        return Array.from({ length: thickness }, (_, layer) => {
          const isTop = layer === thickness - 1
          const style = {
            width,
            height,
            left: -width / 2,
            top: -height / 2,
            zIndex: index * thickness + layer,
            transform: `translateY(${-(index * thickness + layer)}px) rotateX(${CHIP_FELT_TILT_DEG}deg) rotateZ(${spin}deg)`,
          } as CSSProperties
          return (
            <div
              key={`${color}-${index}-${layer}`}
              className={`chip chip-${color}${isTop ? ' chip-top' : ' chip-wall'}`}
              style={style}
            />
          )
        })
      })}
    </div>
  )
}
