/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ShakeDebugOverlay } from './ShakeDebugOverlay'
import type { ShakeDebugView } from './useShakeThrow'

const view = (patch: Partial<ShakeDebugView>): ShakeDebugView => ({
  capturing: true,
  x: 0,
  y: 0,
  z: 0,
  xTotal: 14,
  pushTotal: 0,
  yTotal: 0,
  roll: 0,
  spin: 0,
  remainingMs: 0,
  note: 'calming',
  ...patch,
})

const textOf = (patch: Partial<ShakeDebugView>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  act(() => {
    root.render(<ShakeDebugOverlay view={view(patch)} />)
  })
  const text = host.textContent ?? ''
  act(() => root.unmount())
  host.remove()
  return text
}

describe('shake debug overlay', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('names the roll and spin direction', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    expect(textOf({ roll: 6.2, spin: 5.4 })).toContain('roll 6.2 forward')
    expect(textOf({ roll: 6.2, spin: 5.4 })).toContain('spin 5.4 right')
    expect(textOf({ roll: -8, spin: -5.4 })).toContain('roll -8.0 back')
    expect(textOf({ roll: -8, spin: -5.4 })).toContain('spin -5.4 left')
    expect(textOf({ roll: 0, spin: 0 })).toContain('roll 0.0')
    expect(textOf({ roll: 0, spin: 0 })).not.toContain('forward')
  })
})
