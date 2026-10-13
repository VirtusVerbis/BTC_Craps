import { BET_STACK_GUIDES_ON, STACK_GUIDE_FONT_PX } from '../characterBetConstants'
import type { StackGuideView } from '../chipPhysics'

export type GuideFrameApply = (guides: readonly StackGuideView[]) => void

/** Imperative stack-guide boxes. Positions change every frame during a topple. */
export class GuidePresenter {
  private readonly pool = new Map<string, HTMLDivElement>()

  constructor(private readonly root: HTMLElement) {}

  dispose(): void {
    this.apply([])
  }

  apply(guides: readonly StackGuideView[]): void {
    const next = new Set<string>()
    if (BET_STACK_GUIDES_ON) {
      for (const guide of guides) {
        next.add(guide.label)
        let el = this.pool.get(guide.label)
        if (!el) {
          el = document.createElement('div')
          el.className = 'stack-guide'
          const caption = document.createElement('span')
          caption.className = 'stack-guide-caption'
          caption.textContent = guide.label
          el.appendChild(caption)
          el.style.fontSize = `${STACK_GUIDE_FONT_PX}px`
          this.root.appendChild(el)
          this.pool.set(guide.label, el)
        }
        el.style.left = `${guide.left}px`
        el.style.top = `${guide.top}px`
        el.style.width = `${guide.width}px`
        el.style.height = `${guide.height}px`
        el.style.borderColor = guide.color
        el.style.color = guide.color
      }
    }
    for (const [label, el] of this.pool) {
      if (!next.has(label)) {
        el.remove()
        this.pool.delete(label)
      }
    }
  }
}
