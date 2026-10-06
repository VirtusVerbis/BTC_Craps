import { useEffect, useState } from 'react'
import { BG2_SHOW_INTERVAL_MS, BG2_VISIBLE_DURATION_MS } from './androidMirrorConstants'

/** Periodic candle chart visibility (Android BG2 `MainActivity` LaunchedEffect); pauses when tab hidden (`isVisible` parity). */
export const useBg2ChartVisible = (paused = false): boolean => {
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!tabVisible || paused) {
      setVisible(false)
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = globalThis.setTimeout(() => {
          timeoutId = undefined
          resolve()
        }, ms)
      })

    const run = async () => {
      while (!cancelled) {
        await delay(BG2_SHOW_INTERVAL_MS)
        if (cancelled) break
        setVisible(true)
        await delay(BG2_VISIBLE_DURATION_MS)
        if (cancelled) break
        setVisible(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId)
    }
  }, [tabVisible, paused])

  return visible
}
