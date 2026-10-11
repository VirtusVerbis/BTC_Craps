import { type RefObject } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { useStageFitScale } from './useStageFitScale'

const W = REFERENCE_WIDTH
const H = REFERENCE_HEIGHT

interface StageProps {
  children: React.ReactNode
  /** `main.app-shell` (or any flex parent) whose content box defines max fit area. */
  shellRef: RefObject<HTMLElement | null>
  stageRef?: RefObject<HTMLDivElement | null>
  /** The on-screen box of the scaled table, before the CSS transform. */
  displayRef?: RefObject<HTMLDivElement | null>
}

export const Stage = ({ children, shellRef, stageRef, displayRef }: StageProps) => {
  const scale = useStageFitScale(shellRef)

  return (
    <div className="stage-shell">
      <div
        ref={displayRef}
        className="stage-scale-outer"
        style={{
          width: W * scale,
          height: H * scale,
        }}
      >
        <div
          ref={stageRef}
          className="stage"
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
