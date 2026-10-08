import { useEffect, useRef, useState } from 'react'
import { histogramPhase, type HistogramMotion } from './histogramModel'

export interface HistogramReveal {
  reveal: number
  animate: boolean
  transitionMs: number
}

const REST: HistogramReveal = { reveal: 0, animate: false, transitionMs: 0 }

/** How often a visible tab re-reads the elapsed clock. Background tabs also resync on return. */
const HISTOGRAM_SYNC_MS = 1000

/**
 * Rise, hold, fall, and hidden gap measured from the moment `enabled` becomes true.
 * A hidden tab does not pause the clock. Coming back snaps to the elapsed position,
 * then finishes a rise or fall that is still in progress.
 */
export const useHistogramVisibility = (enabled: boolean): HistogramReveal => {
  const [reveal, setReveal] = useState<HistogramReveal>(REST)
  const originRef = useRef<number | null>(null)
  const motionRef = useRef<HistogramMotion | null>(null)
  const playGen = useRef(0)

  useEffect(() => {
    if (!enabled) {
      originRef.current = null
      motionRef.current = null
      playGen.current += 1
      setReveal(REST)
      return
    }

    originRef.current = Date.now()
    motionRef.current = null
    let cancelled = false
    let boundary = 0

    const commit = (next: HistogramReveal) => {
      if (!cancelled) setReveal(next)
    }

    const animateTo = (from: number, to: number, ms: number) => {
      const gen = ++playGen.current
      commit({ reveal: from, animate: false, transitionMs: 0 })
      window.requestAnimationFrame(() => {
        if (cancelled || playGen.current !== gen) return
        window.requestAnimationFrame(() => {
          if (cancelled || playGen.current !== gen) return
          commit({ reveal: to, animate: ms > 0, transitionMs: ms })
        })
      })
    }

    const apply = (reason: 'tick' | 'visible') => {
      const origin = originRef.current
      if (origin == null || cancelled) return
      const sample = histogramPhase(Date.now() - origin)
      const tabVisible = document.visibilityState === 'visible'
      if (!tabVisible) {
        playGen.current += 1
        motionRef.current = sample.motion
        commit({ reveal: sample.reveal, animate: false, transitionMs: 0 })
        return
      }
      if (reason === 'visible') {
        motionRef.current = sample.motion
        if ((sample.motion === 'rising' || sample.motion === 'falling') && sample.transitionMs > 0) {
          animateTo(sample.reveal, sample.motion === 'rising' ? 1 : 0, sample.transitionMs)
        } else {
          playGen.current += 1
          commit({ reveal: sample.reveal, animate: false, transitionMs: 0 })
        }
        return
      }
      if (sample.motion === motionRef.current) return
      motionRef.current = sample.motion
      if (sample.motion === 'rising') animateTo(0, 1, sample.transitionMs)
      else if (sample.motion === 'falling') animateTo(1, 0, sample.transitionMs)
      else commit({ reveal: sample.motion === 'up' ? 1 : 0, animate: false, transitionMs: 0 })
    }

    const schedule = () => {
      const origin = originRef.current
      if (origin == null || cancelled) return
      const sample = histogramPhase(Date.now() - origin)
      boundary = window.setTimeout(() => {
        apply('tick')
        schedule()
      }, Math.max(1, sample.msUntilNext))
    }

    apply('tick')
    schedule()
    const interval = window.setInterval(() => apply('tick'), HISTOGRAM_SYNC_MS)
    const onVisibility = () => {
      apply(document.visibilityState === 'visible' ? 'visible' : 'tick')
      window.clearTimeout(boundary)
      schedule()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      playGen.current += 1
      window.clearTimeout(boundary)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  return reveal
}
