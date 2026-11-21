/** @vitest-environment jsdom */
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, afterEach } from 'vitest'
import type { MarketSnapshot } from '../game/types'
import { useDiceVolumeWindow } from './useDiceVolumeWindow'

const market = (binanceBuy: number): MarketSnapshot => ({
  binance: {
    exchange: 'binance',
    price: 100_000,
    buyVolume: binanceBuy,
    sellVolume: 0,
    updatedAt: 0,
  },
  coinbase: {
    exchange: 'coinbase',
    price: 100_000,
    buyVolume: 0,
    sellVolume: 0,
    updatedAt: 0,
  },
})

describe('useDiceVolumeWindow', () => {
  let root: Root
  let container: HTMLDivElement
  let latestBuy = 0

  const Host = ({ snap }: { snap: MarketSnapshot }) => {
    const totals = useDiceVolumeWindow(snap)
  latestBuy = totals.binanceBuy
    return null
  }

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('does not re-accumulate when object identity changes but volumes are flat', () => {
    container = document.createElement('div')
    root = createRoot(container)
    let snap = market(0)

    act(() => {
      root.render(createElement(Host, { snap }))
    })
    act(() => {
      snap = market(1)
      root.render(createElement(Host, { snap }))
    })
    const afterDelta = latestBuy

    act(() => {
      root.render(createElement(Host, { snap: { ...market(1) } }))
      root.render(createElement(Host, { snap: { ...market(1) } }))
    })

    expect(latestBuy).toBe(afterDelta)
  })
})