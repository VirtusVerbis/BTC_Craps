/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { DepthInfoIcon } from './DepthInfoIcon'

describe('DepthInfoIcon', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('toggles glossary body and aria-expanded', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root: Root = createRoot(host)
    act(() => {
      root.render(<DepthInfoIcon glossaryKey="basis" label="Basis" />)
    })
    const btn = host.querySelector('.depth-info-toggle') as HTMLButtonElement
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    act(() => {
      btn.click()
    })
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(host.textContent).toContain('Difference between Binance BTC mid')
    act(() => root.unmount())
    host.remove()
  })
})