import { DEPTH_TAB_X, DEPTH_TAB_Y } from './depthConstants'

interface DepthTabProps {
  onOpen: () => void
  panelOpen: boolean
}

export const DepthTab = ({ onOpen, panelOpen }: DepthTabProps) => {
  if (panelOpen) return null
  return (
    <button
      type="button"
      className="shooter-bet-action depth-tab"
      style={{ left: DEPTH_TAB_X, top: DEPTH_TAB_Y }}
      onClick={onOpen}
      aria-expanded={false}
    >
      Depth
    </button>
  )
}