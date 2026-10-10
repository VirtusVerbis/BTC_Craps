/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HotShooterTicker } from './HotShooterTicker'
import { LIQ_LABEL_Y, LIQ_TICKER_FONT_PX, LIQ_TICKER_HEIGHT_PX } from './overlayConstants'
import { ROLL_STREAK_THRESHOLD } from './rollStreak'

const mount = (current: number) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  const renderAt = (value: number) => {
    act(() => {
      root.render(<HotShooterTicker current={value} />)
    })
  }
  renderAt(current)
  return {
    host,
    renderAt,
    unmount() {
      act(() => root.unmount())
      host.remove()
    },
  }
}

describe('hot shooter ticker', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('appears once the hand passes the threshold and stays up after a seven-out', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const view = mount(0)
    expect(view.host.querySelector('.liq-ticker')).toBeNull()

    view.renderAt(ROLL_STREAK_THRESHOLD)
    expect(view.host.querySelector('.liq-ticker')).toBeNull()

    view.renderAt(ROLL_STREAK_THRESHOLD + 1)
    const bar = view.host.querySelector('.liq-ticker')
    expect(bar).not.toBeNull()
    expect(bar?.textContent).toContain('Hot Shooter!')
    expect((bar as HTMLElement).style.top).toBe(`${LIQ_LABEL_Y - LIQ_TICKER_HEIGHT_PX * 2}px`)
    expect((bar as HTMLElement).style.height).toBe(`${LIQ_TICKER_HEIGHT_PX}px`)
    expect((bar as HTMLElement).style.fontSize).toBe(`${LIQ_TICKER_FONT_PX}px`)
    expect(bar?.querySelectorAll('.liq-ticker-phrase')).toHaveLength(1)

    view.renderAt(ROLL_STREAK_THRESHOLD + 4)
    expect(view.host.querySelectorAll('.liq-ticker')).toHaveLength(1)

    view.renderAt(0)
    expect(view.host.querySelector('.liq-ticker')?.textContent).toContain('Hot Shooter!')
    view.unmount()
  })
})
