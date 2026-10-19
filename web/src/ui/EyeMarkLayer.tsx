import { useEffect, useRef, type MutableRefObject } from 'react'
import { PL_CHARACTERS } from './characterPnl'
import {
  EYE_MARK_PREVIEW_ON,
  EYE_MARK_PREVIEW_SYMBOLS_ON,
  EYE_MARK_PX,
  EYE_MARK_SPOT,
  EYE_MARK_SRC,
  EYE_PUPIL_CREAM,
} from './eyeMarkConstants'
import type { EyeMarkFrame } from './eyeMarks'

export type EyeMarkFrameApply = (marks: EyeMarkFrame) => void

const SIDES = ['left', 'right'] as const

/** Preview can pin the covers while the symbols stay hidden. */
const symbolsShown = (): boolean => !EYE_MARK_PREVIEW_ON || EYE_MARK_PREVIEW_SYMBOLS_ON

const frameKey = (marks: EyeMarkFrame): string =>
  `${symbolsShown() ? 'symbols' : 'covers'};` +
  PL_CHARACTERS.map((character) => {
    const spot = EYE_MARK_SPOT[character]
    const box = (side: 'left' | 'right') => {
      const place = spot[side]
      return `${place.symbol.x},${place.symbol.y},${place.pupil.x},${place.pupil.y},${place.pupil.width},${place.pupil.height}`
    }
    return `${marks[character] ?? '-'}@${box('left')}|${box('right')}`
  }).join(';')

const paintMarks = (root: HTMLElement, marks: EyeMarkFrame) => {
  for (const character of PL_CHARACTERS) {
    const mark = marks[character]
    for (const side of SIDES) {
      const spot = EYE_MARK_SPOT[character][side]
      const cover = root.querySelector(`[data-pupil-cover="${character}-${side}"]`)
      const symbol = root.querySelector(`[data-eye-symbol="${character}-${side}"]`)
      if (cover instanceof HTMLElement) {
        cover.classList.toggle('is-on', mark != null)
        cover.style.left = `${spot.pupil.x}px`
        cover.style.top = `${spot.pupil.y}px`
        cover.style.width = `${spot.pupil.width}px`
        cover.style.height = `${spot.pupil.height}px`
      }
      if (symbol instanceof HTMLImageElement) {
        const showSymbol = mark != null && symbolsShown()
        if (showSymbol && mark) symbol.src = EYE_MARK_SRC[mark]
        symbol.classList.toggle('is-on', showSymbol)
        symbol.style.left = `${spot.symbol.x}px`
        symbol.style.top = `${spot.symbol.y}px`
      }
    }
  }
}

export const EyeMarkLayer = ({ applyRef }: { applyRef: MutableRefObject<EyeMarkFrameApply | null> }) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const marksRef = useRef<EyeMarkFrame>({})
  const shownRef = useRef('')

  useEffect(() => {
    const root = rootRef.current
    if (root) {
      for (const image of Array.from(root.querySelectorAll('img'))) void image.decode().catch(() => undefined)
    }
    const apply: EyeMarkFrameApply = (marks) => {
      marksRef.current = marks
      const key = frameKey(marks)
      if (key === shownRef.current || !rootRef.current) return
      shownRef.current = key
      paintMarks(rootRef.current, marks)
    }
    applyRef.current = apply
    return () => {
      if (applyRef.current === apply) applyRef.current = null
    }
  }, [applyRef])

  return (
    <div ref={rootRef} className="eye-mark-layer">
      {PL_CHARACTERS.flatMap((character) =>
        SIDES.map((side) => {
          const spot = EYE_MARK_SPOT[character][side]
          return (
            <span key={`${character}-${side}`}>
              <span
                className="eye-pupil-cover"
                data-pupil-cover={`${character}-${side}`}
                style={{
                  left: spot.pupil.x,
                  top: spot.pupil.y,
                  width: spot.pupil.width,
                  height: spot.pupil.height,
                  background: EYE_PUPIL_CREAM,
                }}
              />
              <img
                className="eye-mark-symbol"
                data-eye-symbol={`${character}-${side}`}
                src={EYE_MARK_SRC.skull}
                alt=""
                draggable={false}
                width={EYE_MARK_PX}
                height={EYE_MARK_PX}
                style={{ left: spot.symbol.x, top: spot.symbol.y, width: EYE_MARK_PX, height: EYE_MARK_PX }}
              />
            </span>
          )
        }),
      )}
    </div>
  )
}
