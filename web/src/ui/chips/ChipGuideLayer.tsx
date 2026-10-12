import { BET_STACK_GUIDES_ON, STACK_GUIDE_FONT_PX } from '../characterBetConstants'
import type { StackGuideView } from '../chipPhysics'

export const ChipGuideLayer = ({ guides }: { guides: readonly StackGuideView[] }) => {
  if (!BET_STACK_GUIDES_ON || guides.length === 0) return null
  return (
    <div className="chip-guide-layer" aria-hidden>
      {guides.map((guide) => (
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
      ))}
    </div>
  )
}
