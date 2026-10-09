import type { CSSProperties } from 'react'
import { BET_STACK_GUIDES_ON, STACK_GUIDE_FONT_PX } from './characterBetConstants'
import { CHIP_FELT_TILT_DEG } from './chipConstants'
import { chipDrawSize, type ChipDisc, type StackGuideView } from './chipPhysics'

interface ChipLayerProps {
  discs: readonly ChipDisc[]
  guides?: readonly StackGuideView[]
}

export const ChipLayer = ({ discs, guides = [] }: ChipLayerProps) => {
  const { width, height } = chipDrawSize()
  return (
    <div className="chip-stack" aria-hidden>
      {discs.map((disc) => {
        const style = {
          width: width * disc.scale,
          height: height * disc.scale,
          left: disc.x,
          top: disc.y,
          zIndex: disc.zIndex,
          transform: `translate(-50%, -50%) translateY(${disc.lift * disc.scale}px) rotateX(${CHIP_FELT_TILT_DEG}deg) rotateZ(${disc.spin}deg)`,
        } as CSSProperties
        return (
          <div key={disc.key} className={`chip chip-${disc.color}${disc.face ? ' chip-top' : ' chip-wall'}`} style={style}>
            {disc.face ? (
              <span className="chip-mark" style={{ transform: 'translate(-50%, -50%)' }} />
            ) : null}
          </div>
        )
      })}
      {BET_STACK_GUIDES_ON
        ? guides.map((guide) => (
          <div
            key={guide.label}
            className="stack-guide"
            style={{
              left: guide.left,
              top: guide.top,
              width: guide.width,
              height: guide.height,
              borderColor: guide.color,
              color: guide.color,
              fontSize: STACK_GUIDE_FONT_PX,
            }}
          >
            <span className="stack-guide-caption">{guide.label}</span>
          </div>
        ))
        : null}
    </div>
  )
}
