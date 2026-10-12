import { CHIP_FELT_TILT_DEG } from '../chipConstants'
import { chipDrawSize, type ChipDisc } from '../chipPhysics'

/** Imperative DOM chip pool (legacy multi-slice look). */
export class DomChipPresenter {
  private readonly root: HTMLDivElement

  private readonly pool = new Map<string, HTMLDivElement>()

  private readonly active = new Set<string>()

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'chip-stack chip-stack-dom'
    this.root.setAttribute('aria-hidden', 'true')
    container.appendChild(this.root)
  }

  dispose(): void {
    this.root.remove()
    this.pool.clear()
    this.active.clear()
  }

  apply(discs: readonly ChipDisc[]): void {
    const nextKeys = new Set<string>()
    const { width, height } = chipDrawSize()

    for (const disc of discs) {
      nextKeys.add(disc.key)
      let el = this.pool.get(disc.key)
      if (!el) {
        el = document.createElement('div')
        this.pool.set(disc.key, el)
        this.root.appendChild(el)
      }
      this.active.add(disc.key)
      const w = width * disc.scale
      const h = height * disc.scale
      el.className = `chip chip-${disc.color}${disc.face ? ' chip-top' : ' chip-wall'}`
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      el.style.left = `${disc.x}px`
      el.style.top = `${disc.y}px`
      el.style.zIndex = String(disc.zIndex)
      el.style.transform = `translate(-50%, -50%) translateY(${disc.lift * disc.scale}px) rotateX(${CHIP_FELT_TILT_DEG}deg) rotateZ(${disc.spin}deg)`
      if (disc.face) {
        if (!el.querySelector('.chip-mark')) {
          const mark = document.createElement('span')
          mark.className = 'chip-mark'
          mark.style.transform = 'translate(-50%, -50%)'
          el.appendChild(mark)
        }
      } else {
        el.querySelector('.chip-mark')?.remove()
      }
    }

    for (const key of this.active) {
      if (!nextKeys.has(key)) {
        this.pool.get(key)?.remove()
        this.pool.delete(key)
      }
    }
    this.active.clear()
    for (const key of nextKeys) this.active.add(key)
  }
}
