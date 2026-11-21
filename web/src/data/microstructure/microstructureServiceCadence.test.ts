/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEPTH_EMIT_MS, DEPTH_SAMPLE_IDLE_MS, DEPTH_SAMPLE_MS } from './depthDisplayConstants'
import { MicrostructureService } from './microstructureService'

const spySampleVenues = (service: MicrostructureService) =>
  vi.spyOn(service as unknown as { sampleVenues: () => void }, 'sampleVenues')

describe('MicrostructureService cadence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('sampleVenues on subscribe and uses active interval while listening', () => {
    const service = new MicrostructureService()
    const sampleSpy = spySampleVenues(service)
    service.start()

    const listener = vi.fn()
    sampleSpy.mockClear()
    const unsub = service.subscribe(listener)
    expect(sampleSpy).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalled()

    sampleSpy.mockClear()
    vi.advanceTimersByTime(DEPTH_SAMPLE_MS)
    expect(sampleSpy).toHaveBeenCalledTimes(1)

    unsub()
    sampleSpy.mockClear()
    vi.advanceTimersByTime(DEPTH_SAMPLE_MS)
    expect(sampleSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(DEPTH_SAMPLE_IDLE_MS - DEPTH_SAMPLE_MS)
    expect(sampleSpy).toHaveBeenCalledTimes(1)
  })

  it('does not run emit timer without listeners', () => {
    const service = new MicrostructureService()
    service.start()
    const listener = vi.fn()
    const unsub = service.subscribe(listener)
    listener.mockClear()
    unsub()
    vi.advanceTimersByTime(DEPTH_EMIT_MS * 3)
    expect(listener).not.toHaveBeenCalled()
  })

  it('uses idle sampling when tab is hidden but depth is open', () => {
    const service = new MicrostructureService()
    const sampleSpy = spySampleVenues(service)
    service.start()
    service.subscribe(vi.fn())

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    ;(service as unknown as { reconcileCadence: () => void }).reconcileCadence()

    sampleSpy.mockClear()
    vi.advanceTimersByTime(DEPTH_SAMPLE_MS)
    expect(sampleSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(DEPTH_SAMPLE_IDLE_MS - DEPTH_SAMPLE_MS)
    expect(sampleSpy).toHaveBeenCalledTimes(1)
  })
})