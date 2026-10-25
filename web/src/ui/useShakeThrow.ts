import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { SHAKE_DEBUG_BARS, SHAKE_PROBE_MS, SHAKE_THRESHOLD_MPS2, SHAKE_WINDOW_MS } from './diceConstants'
import type { PrecisionThrow } from './precisionAim'
import {
  clearShakeState,
  createGravityFilter,
  createShakeState,
  finishShake,
  motionHasNumbers,
  sampleFromEvent,
  shakeDebugRead,
  shakeSampleHot,
  stepShake,
  type ShakeMode,
} from './shakeThrow'
import type { ShooterControls } from './useDiceThrow'

type MotionPermission = 'granted' | 'denied'

const motionPermissionRequest = (): (() => Promise<MotionPermission>) | null => {
  if (typeof DeviceMotionEvent === 'undefined') return null
  const ctor = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<MotionPermission> }
  if (typeof ctor.requestPermission !== 'function') return null
  const ask = ctor.requestPermission
  return () => ask.call(ctor)
}

const watchSample = (ms: number): { done: Promise<boolean>; stop: () => void } => {
  let settled = false
  let resolveDone: (ok: boolean) => void = () => {}
  const done = new Promise<boolean>((resolve) => {
    resolveDone = resolve
  })
  const finish = (ok: boolean) => {
    if (settled) return
    settled = true
    window.removeEventListener('devicemotion', onMotion)
    window.clearTimeout(timer)
    resolveDone(ok)
  }
  const onMotion = (event: DeviceMotionEvent) => {
    if (motionHasNumbers(event)) finish(true)
  }
  window.addEventListener('devicemotion', onMotion)
  const timer = window.setTimeout(() => finish(false), ms)
  return { done, stop: () => finish(false) }
}

const touchPhone = (): boolean => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0

/** A phone stays pressable so a tap can wake the sensor. A desktop greys out once the probe is empty. */
export const useShakeSensor = (savedOn: boolean) => {
  const asks = motionPermissionRequest() != null
  const phone = useRef(touchPhone())
  const [available, setAvailable] = useState(() => asks || touchPhone())
  const [live, setLive] = useState(false)
  const gen = useRef(0)
  const savedAtLoad = useRef(savedOn)
  const stopListen = useRef<() => void>(() => {})

  useEffect(() => {
    const ask = motionPermissionRequest()
    let cancel = false
    let stopProbe = () => {}
    if (ask) {
      if (!savedAtLoad.current) return undefined
      void ask()
        .then((result) => {
          if (cancel || result !== 'granted') {
            if (!cancel && result !== 'granted') {
              setAvailable(false)
              setLive(false)
            }
            return false
          }
          const probe = watchSample(SHAKE_PROBE_MS)
          stopProbe = probe.stop
          return probe.done
        })
        .then((ok) => {
          if (cancel || typeof ok !== 'boolean') return
          setLive(ok)
          if (ok) setAvailable(true)
          else if (!phone.current) setAvailable(false)
        })
        .catch(() => {
          if (!cancel) setAvailable(true)
        })
      return () => {
        cancel = true
        stopProbe()
      }
    }
    const probe = watchSample(SHAKE_PROBE_MS)
    void probe.done.then((ok) => {
      if (cancel) return
      setLive(ok)
      if (ok) setAvailable(true)
      else if (!phone.current) setAvailable(false)
    })
    return () => {
      cancel = true
      probe.stop()
    }
  }, [])

  const invalidate = useCallback(() => {
    gen.current += 1
    stopListen.current()
    stopListen.current = () => {}
  }, [])

  const requestEnable = useCallback(
    (onGranted: () => void) => {
      stopListen.current()
      stopListen.current = () => {}
      const token = ++gen.current
      const ask = motionPermissionRequest()
      const accept = (ok: boolean) => {
        if (token !== gen.current) return
        setLive(ok)
        if (ok) {
          setAvailable(true)
          onGranted()
          return
        }
        if (!phone.current) setAvailable(false)
      }
      if (ask) {
        const pending = ask()
        void pending
          .then((result) => {
            if (token !== gen.current) return undefined
            if (result !== 'granted') {
              setAvailable(false)
              setLive(false)
              return undefined
            }
            const probe = watchSample(SHAKE_PROBE_MS)
            stopListen.current = probe.stop
            return probe.done
          })
          .then((ok) => {
            if (typeof ok !== 'boolean' || token !== gen.current) return
            accept(ok)
          })
          .catch(() => {
            if (token !== gen.current) return
            setAvailable(false)
            setLive(false)
          })
        return
      }
      if (live) {
        accept(true)
        return
      }
      const probe = watchSample(SHAKE_PROBE_MS)
      stopListen.current = probe.stop
      void probe.done.then((ok) => accept(ok))
    },
    [live],
  )

  return { available, live, requestEnable, invalidate }
}

/**
 * Throw-axis acceleration this strong is a shake in progress.
 * The noise line can be a fraction; sensor noise must not swallow every finger flick.
 */
const SHAKE_FINGER_HOLD_MPS2 = 3

export interface ShakeDebugView {
  capturing: boolean
  x: number
  y: number
  z: number
  xTotal: number
  pushTotal: number
  yTotal: number
  remainingMs: number
  note: string
}

const emptyDebug = (): ShakeDebugView => ({
  capturing: false,
  x: 0,
  y: 0,
  z: 0,
  xTotal: 0,
  pushTotal: 0,
  yTotal: 0,
  remainingMs: 0,
  note: 'closed',
})

/**
 * Captures motion for one window, then launches.
 * A finger touch does not cancel it. A rail aim restarts the window with empty totals.
 * Returns the debug reading when `SHAKE_DEBUG_BARS` is on.
 */
export const useShakeThrow = (
  enabled: boolean,
  precision: boolean,
  controlsRef: RefObject<ShooterControls | null>,
  shotRef: RefObject<Omit<PrecisionThrow, 'speed' | 'lean'> | null>,
  shakeBusyRef?: RefObject<boolean>,
  shotClockRef?: RefObject<number | null>,
  shakeRestartRef?: RefObject<(() => void) | null>,
): ShakeDebugView | null => {
  const debugRef = useRef<ShakeDebugView>(emptyDebug())
  const [debugView, setDebugView] = useState<ShakeDebugView | null>(null)

  useEffect(() => {
    if (!SHAKE_DEBUG_BARS) {
      setDebugView(null)
      return undefined
    }
    const id = window.setInterval(() => setDebugView({ ...debugRef.current }), 100)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!SHAKE_DEBUG_BARS || enabled) return undefined
    const filter = createGravityFilter()
    debugRef.current = emptyDebug()
    const onMotion = (event: DeviceMotionEvent) => {
      const sample = sampleFromEvent(filter, event)
      const read = shakeDebugRead(createShakeState(), sample)
      debugRef.current = { ...emptyDebug(), ...read, note: 'closed' }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    const state = createShakeState()
    const filter = createGravityFilter()
    const mode: ShakeMode = precision ? 'precision' : 'regular'
    let finished = false
    let spiked = false
    let timer = 0
    let deadline = 0
    let note = 'armed'
    let lastSample: Parameters<typeof shakeDebugRead>[1] = null

    const publish = (sample: Parameters<typeof shakeDebugRead>[1]) => {
      if (sample) lastSample = sample
      const read = shakeDebugRead(state, lastSample)
      debugRef.current = {
        ...read,
        capturing: !finished,
        remainingMs: deadline > 0 ? Math.max(0, deadline - performance.now()) : 0,
        note,
      }
    }
    const finish = () => {
      if (finished) return
      const left = shotClockRef?.current
      if (left != null && left <= 0) {
        finished = true
        note = 'shot clock'
        publish(null)
        return
      }
      const release = finishShake(state, mode)
      if (!release) {
        spiked = false
        timer = 0
        deadline = 0
        note = 'armed'
        clearShakeState(state)
        publish(null)
        return
      }
      finished = true
      note = 'launched'
      publish(null)
      if (release.kind === 'precision') {
        const shot = shotRef.current
        if (!shot) return
        controlsRef.current?.releasePrecision({ ...shot, speed: release.speed, lean: release.lean })
        return
      }
      controlsRef.current?.releaseShake(release)
    }
    const arm = () => {
      window.clearTimeout(timer)
      finished = false
      spiked = false
      timer = 0
      deadline = 0
      note = 'armed'
      clearShakeState(state)
      publish(null)
    }
    arm()
    if (shakeRestartRef) shakeRestartRef.current = arm
    const tick = window.setInterval(() => publish(null), 100)

    const onMotion = (event: DeviceMotionEvent) => {
      const sample = sampleFromEvent(filter, event)
      if (shakeBusyRef) {
        const mag = sample ? Math.hypot(sample.x, sample.z) : 0
        shakeBusyRef.current = !finished && mag >= Math.max(SHAKE_THRESHOLD_MPS2, SHAKE_FINGER_HOLD_MPS2)
      }
      if (!sample || finished) {
        if (sample) publish(sample)
        return
      }
      stepShake(state, sample)
      if (shakeSampleHot(sample)) {
        spiked = true
        window.clearTimeout(timer)
        timer = 0
        deadline = 0
        note = 'calming'
      } else if (spiked && timer === 0) {
        deadline = performance.now() + SHAKE_WINDOW_MS
        timer = window.setTimeout(finish, SHAKE_WINDOW_MS)
        note = 'calming'
      }
      publish(sample)
    }

    window.addEventListener('devicemotion', onMotion)
    return () => {
      finished = true
      window.clearTimeout(timer)
      window.clearInterval(tick)
      if (shakeRestartRef) shakeRestartRef.current = null
      if (shakeBusyRef) shakeBusyRef.current = false
      window.removeEventListener('devicemotion', onMotion)
    }
  }, [controlsRef, enabled, precision, shakeBusyRef, shakeRestartRef, shotClockRef, shotRef])

  return SHAKE_DEBUG_BARS ? debugView : null
}
