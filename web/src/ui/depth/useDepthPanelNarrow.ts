import { useEffect, useState } from 'react'

export const DEPTH_PANEL_NARROW_MQ = '(max-width: 520px)'

export const useDepthPanelNarrow = (): boolean => {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DEPTH_PANEL_NARROW_MQ).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DEPTH_PANEL_NARROW_MQ)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return narrow
}