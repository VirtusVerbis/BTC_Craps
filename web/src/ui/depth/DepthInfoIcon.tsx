import { useId, useState } from 'react'
import { type DepthGlossaryKey, depthGlossary } from './depthGlossary'

interface DepthInfoIconProps {
  glossaryKey: DepthGlossaryKey
  label: string
}

export const DepthInfoIcon = ({ glossaryKey, label }: DepthInfoIconProps) => {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const entry = depthGlossary[glossaryKey]

  return (
    <div className="depth-info">
      <div className="depth-info-heading">
        <span>{label}</span>
        <button
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
      {open ? (
        <div id={bodyId} className="depth-info-body">
          <p className="depth-info-title">{entry.title}</p>
          <p>{entry.body}</p>
        </div>
      ) : null}
    </div>
  )
}