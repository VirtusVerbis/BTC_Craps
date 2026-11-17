import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type DepthGlossaryKey, depthGlossary } from './depthGlossary'

const POPOVER_MARGIN = 8
const POPOVER_GAP = 6

interface DepthInfoIconProps {
  glossaryKey: DepthGlossaryKey
  label: string
}

const placePopover = (toggle: HTMLButtonElement, popover: HTMLElement) => {
  const br = toggle.getBoundingClientRect()
  const popW = popover.offsetWidth
  const popH = popover.offsetHeight
  let left = br.left
  if (left + popW > window.innerWidth - POPOVER_MARGIN) {
    left = Math.max(POPOVER_MARGIN, window.innerWidth - POPOVER_MARGIN - popW)
  }
  let top = br.bottom + POPOVER_GAP
  if (top + popH > window.innerHeight - POPOVER_MARGIN) {
    top = Math.max(POPOVER_MARGIN, br.top - POPOVER_GAP - popH)
  }
  popover.style.top = `${top}px`
  popover.style.left = `${left}px`
}

export const DepthInfoIcon = ({ glossaryKey, label }: DepthInfoIconProps) => {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const entry = depthGlossary[glossaryKey]
  const toggleRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const toggle = toggleRef.current
    const popover = popoverRef.current
    if (!toggle || !popover) return
    placePopover(toggle, popover)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onReposition = () => {
      const toggle = toggleRef.current
      const popover = popoverRef.current
      if (toggle && popover) placePopover(toggle, popover)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (toggleRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const popover =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={bodyId}
            ref={popoverRef}
            className="depth-info-body depth-info-popover"
            role="dialog"
            aria-labelledby={`${bodyId}-title`}
          >
            <p id={`${bodyId}-title`} className="depth-info-title">
              {entry.title}
            </p>
            <p>{entry.body}</p>
            {entry.items?.length ? (
              <ul className="depth-info-list">
                {entry.items.map((item) => (
                  <li key={item.label}>
                    <span className="depth-info-term">{item.label}</span>
                    <span className="depth-info-term-sep"> — </span>
                    {item.detail}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="depth-info">
      <div className="depth-info-heading">
        <span>{label}</span>
        <button
          ref={toggleRef}
          type="button"
          className="depth-info-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`More about ${label}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="depth-info-icon" aria-hidden="true">
            i
          </span>
        </button>
      </div>
      {popover}
    </div>
  )
}