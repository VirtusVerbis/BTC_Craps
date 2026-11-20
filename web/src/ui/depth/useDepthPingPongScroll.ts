import { useEffect, type RefObject } from 'react'
import { DEPTH_PING_PONG_CYCLE_MS } from './depthUiConstants'

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Slow vertical ping-pong scroll on a overflow container.
 * Pauses on hover/focus/pointer down and when `enabled` is false.
 */
export const useDepthPingPongScroll = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  cycleMs: number = DEPTH_PING_PONG_CYCLE_MS,
): void => {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || prefersReducedMotion()) return

    let raf = 0
    let paused = false
    const halfCycle = cycleMs / 2

    const setPaused = (value: boolean): void => {
      paused = value
    }

    const onEnter = () => setPaused(true)
    const onLeave = () => setPaused(false)
    const onPointerDown = () => setPaused(true)
    const onPointerUp = () => setPaused(false)

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('focusin', onEnter)
    el.addEventListener('focusout', onLeave)
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      if (paused) return
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) {
        el.scrollTop = 0
        return
      }
      const phase = (now % cycleMs) / halfCycle
      const t = phase <= 1 ? phase : 2 - phase
      el.scrollTop = t * max
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('focusin', onEnter)
      el.removeEventListener('focusout', onLeave)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [ref, enabled, cycleMs])
}