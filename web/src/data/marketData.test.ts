/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXCHANGE_EMIT_THROTTLE_MS } from './exchangeConstants'
import { MarketDataService } from './marketData'

describe('MarketDataService subscribe', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('notifies subscribe listeners on pushSnapshot', () => {
    const service = new MarketDataService()
    const listener = vi.fn()
    const unsub = service.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1)

    listener.mockClear()
    service.start()
    vi.advanceTimersByTime(EXCHANGE_EMIT_THROTTLE_MS)
    expect(listener).toHaveBeenCalledTimes(1)

    unsub()
    listener.mockClear()
    vi.advanceTimersByTime(EXCHANGE_EMIT_THROTTLE_MS)
    expect(listener).not.toHaveBeenCalled()

    service.stop()
  })

  it('getSnapshot matches last pushed update', () => {
    const legacy = vi.fn()
    const service = new MarketDataService(legacy)
    service.start()
    vi.advanceTimersByTime(EXCHANGE_EMIT_THROTTLE_MS)
    expect(legacy).toHaveBeenCalled()
    expect(service.getSnapshot()).toEqual(legacy.mock.calls.at(-1)?.[0])
    service.stop()
  })
})