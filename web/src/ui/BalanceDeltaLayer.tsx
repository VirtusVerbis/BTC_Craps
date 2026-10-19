import { useEffect, useRef, type MutableRefObject } from 'react'
import { PL_DELTA_FONT_PX } from './characterPnlConstants'
import type { BalanceDeltaFrame } from './balanceDelta'

export type BalanceDeltaFrameApply = (frames: readonly BalanceDeltaFrame[]) => void

export const BalanceDeltaLayer = ({ applyRef }: { applyRef: MutableRefObject<BalanceDeltaFrameApply | null> }) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    const apply: BalanceDeltaFrameApply = (frames) => {
      const root = rootRef.current
      if (!root) return
      if (frames.length === 0 && nodesRef.current.size === 0) return
      const seen = new Set<number>()
      for (const frame of frames) {
        seen.add(frame.id)
        let node = nodesRef.current.get(frame.id)
        if (!node) {
          node = document.createElement('div')
          node.className = 'balance-delta'
          node.style.fontSize = `${PL_DELTA_FONT_PX}px`
          root.appendChild(node)
          nodesRef.current.set(frame.id, node)
        }
        node.textContent = frame.text
        node.style.color = frame.color
        node.style.left = `${frame.x}px`
        node.style.top = `${frame.y}px`
        node.style.opacity = String(frame.opacity)
      }
      for (const [id, node] of nodesRef.current) {
        if (seen.has(id)) continue
        node.remove()
        nodesRef.current.delete(id)
      }
    }
    applyRef.current = apply
    return () => {
      if (applyRef.current === apply) applyRef.current = null
      for (const node of nodesRef.current.values()) node.remove()
      nodesRef.current.clear()
    }
  }, [applyRef])

  return <div ref={rootRef} className="balance-delta-layer" />
}
