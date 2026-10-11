import { describe, expect, it } from 'vitest'
import {
  TRACKPAD_GESTURE_MS,
  isDiscreteMouseWheel,
  isTrackpadWheel,
  nextWheelLock,
  type WheelLock,
  type WheelSample,
} from './useShooterGesture'

const wheel = (patch: Partial<WheelSample>): WheelSample => ({
  deltaMode: 0,
  deltaX: 0,
  deltaY: 0,
  ctrlKey: false,
  ...patch,
})

describe('shooter wheel lock', () => {
  it('lets a mouse-wheel notch through and blocks a trackpad step', () => {
    const mouse = wheel({ deltaY: 100, wheelDeltaY: -120 })
    const trackpad = wheel({ deltaY: 8, wheelDeltaY: -24 })
    expect(isDiscreteMouseWheel(mouse)).toBe(true)
    expect(isTrackpadWheel(mouse)).toBe(false)
    expect(isTrackpadWheel(trackpad)).toBe(true)
    expect(isDiscreteMouseWheel(trackpad)).toBe(false)
  })

  it('treats Firefox line-mode wheels as a mouse and pixel fractions as a trackpad', () => {
    expect(isDiscreteMouseWheel(wheel({ deltaMode: 1, deltaY: 1 }))).toBe(true)
    expect(isTrackpadWheel(wheel({ deltaY: 2.5 }))).toBe(true)
  })

  it('blocks pinch-zoom and the rest of a trackpad flick, then accepts a mouse notch', () => {
    const pinch = wheel({ ctrlKey: true, deltaY: -4, wheelDeltaY: 12 })
    expect(isTrackpadWheel(pinch)).toBe(true)

    let lock: WheelLock = { gestureUntil: 0 }
    const started = nextWheelLock(wheel({ deltaY: 6, wheelDeltaY: -18 }), 1000, lock)
    expect(started.block).toBe(true)
    lock = started.lock

    const fling = nextWheelLock(wheel({ deltaY: 80 }), 1000 + TRACKPAD_GESTURE_MS - 10, lock)
    expect(fling.block).toBe(true)

    const mouse = nextWheelLock(wheel({ deltaY: 100, wheelDeltaY: -120 }), 1000 + 20, fling.lock)
    expect(mouse.block).toBe(false)
    expect(mouse.lock.gestureUntil).toBe(0)
  })
})
