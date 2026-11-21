import { describe, expect, it, vi } from 'vitest'
import { MicrostructureService } from './microstructureService'

describe('MicrostructureService emit gating', () => {
  it('does not notify listeners while unsubscribed; subscribe delivers fresh basis', () => {
    const service = new MicrostructureService()
    const listener = vi.fn()

    service.setBasisPrices(100_000, 99_990)
    expect(listener).not.toHaveBeenCalled()

    const unsub = service.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].basisUsd).toBe(10)

    unsub()
    listener.mockClear()
    service.setBasisPrices(100_000, 100_050)
    expect(listener).not.toHaveBeenCalled()

    service.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].basisUsd).toBe(-50)
  })

  it('getState builds a snapshot when nothing is subscribed', () => {
    const service = new MicrostructureService()
    service.setBasisPrices(50_000, 49_000)
    const state = service.getState()
    expect(state.basisUsd).toBe(1000)
  })
})