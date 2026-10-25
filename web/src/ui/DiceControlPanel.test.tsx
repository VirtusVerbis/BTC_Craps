/** @vitest-environment jsdom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiceControlPanel } from './DiceControlPanel'
import { DEFAULT_DICE_CONTROL } from './diceControl'
import { DIE_COLOR_LABELS, DIE_COLOR_ORDER, type DieColorId } from './diceColor'

const mount = (
  dieColor: DieColorId,
  onDieColor: (color: DieColorId) => void,
  shakeAvailable = false,
  onShakeToRoll: () => void = () => {},
) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  act(() => {
    root.render(
      <DiceControlPanel
        settings={DEFAULT_DICE_CONTROL}
        onChange={() => {}}
        dieColor={dieColor}
        onDieColor={onDieColor}
        shakeAvailable={shakeAvailable}
        onShakeToRoll={onShakeToRoll}
      />,
    )
  })
  act(() => {
    host.querySelector('.side-panel-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  return {
    host,
    unmount() {
      act(() => root.unmount())
      host.remove()
    },
  }
}

const shakeButton = (host: HTMLElement): HTMLButtonElement | null => {
  const button = Array.from(host.querySelectorAll('button')).find((el) => el.textContent?.includes('Shake to Roll'))
  return button ?? null
}

describe('dice color menu', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  })

  it('lists the colors under Dice Stacking and keeps the current choice', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const onDieColor = vi.fn()
    const view = mount('orange', onDieColor)
    const kids = Array.from(view.host.querySelector('.side-panel-body')?.children ?? [])
    const stacks = kids.filter((el) => el.classList.contains('dice-control-stack'))
    const colorAt = kids.findIndex((el) => el.querySelector('#dice-control-color'))
    const select = view.host.querySelector('#dice-control-color')
    expect(select).toBeInstanceOf(HTMLSelectElement)
    expect(stacks[0]?.textContent).toContain('Dice Stacking')
    expect(stacks[1]?.textContent).toContain('Shake to Roll')
    expect(colorAt).toBe(kids.indexOf(stacks[1]) + 1)
    expect(view.host.querySelector('label[for="dice-control-color"] span')?.textContent).toBe('Dice Color')
    expect((select as HTMLSelectElement).value).toBe('orange')
    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.textContent)).toEqual(
      DIE_COLOR_ORDER.map((id) => DIE_COLOR_LABELS[id]),
    )
    act(() => {
      const menu = select as HTMLSelectElement
      menu.value = 'midnight'
      menu.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onDieColor).toHaveBeenCalledWith('midnight')
    view.unmount()
  })

  it('greys Shake to Roll until a sensor is available', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const blocked = mount('orange', () => {})
    const off = shakeButton(blocked.host)
    expect(off).toBeInstanceOf(HTMLButtonElement)
    expect(off?.disabled).toBe(true)
    expect(off?.getAttribute('aria-pressed')).toBe('false')
    blocked.unmount()

    const onShakeToRoll = vi.fn()
    const open = mount('orange', () => {}, true, onShakeToRoll)
    const on = shakeButton(open.host)
    expect(on?.disabled).toBe(false)
    act(() => {
      on?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onShakeToRoll).toHaveBeenCalledTimes(1)
    open.unmount()
  })
})