import type { CSSProperties } from 'react'
import { CHIP_FELT_TILT_DEG } from './chipConstants'
import { chipDrawSize, type ChipDisc } from './chipPhysics'

interface ChipLayerProps {
  discs: readonly ChipDisc[]
}

export const ChipLayer = ({ discs }: ChipLayerProps) => {
  const { width, height } = chipDrawSize()
  return (
    <div className="chip-stack" aria-hidden>
      {discs.map((disc) => {
        const style = {
          width,
          height,
          left: disc.x,
          top: disc.y,
          zIndex: disc.zIndex,
          transform: `translate(-50%, -50%) translateY(${disc.lift}px) rotateX(${CHIP_FELT_TILT_DEG}deg) rotateZ(${disc.spin}deg)`,
        } as CSSProperties
        return (
          <div key={disc.key} className={`chip chip-${disc.color}${disc.face ? ' chip-top' : ' chip-wall'}`} style={style}>
            {disc.face ? (
              <span className="chip-mark" style={{ transform: 'translate(-50%, -50%)' }} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
