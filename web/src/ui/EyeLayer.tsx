import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import type { ChipCharacter } from './chipConstants'
import { EYE_FACE_RECT, EYE_STRIP_FRACTION } from './eyeConstants'
import {
  EYE_CHARACTERS,
  EYE_PATCH_SRC,
  EYE_STRIP_SRC,
  eyePatchCrop,
  type EyeColumn,
  type EyeStrip,
} from './eyeGaze'

export interface EyeApplyFrame {
  strip: EyeStrip
  patches: Partial<Record<(typeof EYE_CHARACTERS)[number], EyeColumn>>
  /** These faces stay on the center painting. Their glance and the dice strip do not move the pupils. */
  held?: readonly ChipCharacter[]
}

export type EyeFrameApply = (frame: EyeApplyFrame) => void

const STRIPS: readonly Exclude<EyeStrip, 'none'>[] = ['left', 'right', 'split']
const COLUMNS: readonly EyeColumn[] = ['left', 'center', 'right']

const frameKey = (frame: EyeApplyFrame): string =>
  `${frame.strip}|${EYE_CHARACTERS.map((character) => frame.patches[character] ?? '-').join('')}|${(frame.held ?? []).join(',')}`

const paintEyes = (root: HTMLElement, frame: EyeApplyFrame) => {
  const held = new Set(frame.held ?? [])
  for (const strip of STRIPS) {
    const node = root.querySelector(`[data-eye-strip="${strip}"]`)
    if (node instanceof HTMLElement) node.classList.toggle('is-on', frame.strip === strip)
  }
  for (const character of EYE_CHARACTERS) {
    const gaze = held.has(character) ? 'center' : frame.patches[character]
    for (const column of COLUMNS) {
      const node = root.querySelector(`[data-eye-patch="${character}-${column}"]`)
      if (node instanceof HTMLElement) node.classList.toggle('is-on', gaze === column)
    }
  }
}

export const EyeLayer = ({ applyRef }: { applyRef: MutableRefObject<EyeFrameApply | null> }) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<EyeApplyFrame>({ strip: 'none', patches: {}, held: [] })
  const shownRef = useRef('')

  useEffect(() => {
    const root = rootRef.current
    if (root) {
      for (const image of Array.from(root.querySelectorAll('img'))) void image.decode().catch(() => undefined)
    }
    const apply: EyeFrameApply = (frame) => {
      frameRef.current = frame
      const key = frameKey(frame)
      if (key === shownRef.current || !rootRef.current) return
      shownRef.current = key
      paintEyes(rootRef.current, frame)
    }
    applyRef.current = apply
    return () => {
      if (applyRef.current === apply) applyRef.current = null
    }
  }, [applyRef])

  useLayoutEffect(() => {
    if (!rootRef.current) return
    paintEyes(rootRef.current, frameRef.current)
    shownRef.current = frameKey(frameRef.current)
  })

  return (
    <div ref={rootRef} className="eye-layer">
      {STRIPS.map((strip) => (
        <div key={strip} className="eye-strip" data-eye-strip={strip} style={{ height: `${EYE_STRIP_FRACTION * 100}%` }}>
          <img src={EYE_STRIP_SRC[strip]} alt="" draggable={false} style={{ height: `${(1 / EYE_STRIP_FRACTION) * 100}%` }} />
        </div>
      ))}
      {EYE_CHARACTERS.flatMap((character) => {
        const crop = eyePatchCrop(EYE_FACE_RECT[character])
        return COLUMNS.map((column) => (
          <div
            key={`${character}-${column}`}
            className="eye-patch"
            data-eye-patch={`${character}-${column}`}
            style={{ left: crop.left, top: crop.top, width: crop.width, height: crop.height }}
          >
            <img
              src={EYE_PATCH_SRC[column]}
              alt=""
              draggable={false}
              style={{ left: crop.imgLeft, top: crop.imgTop, width: crop.imgWidth, height: crop.imgHeight }}
            />
          </div>
        ))
      })}
    </div>
  )
}
