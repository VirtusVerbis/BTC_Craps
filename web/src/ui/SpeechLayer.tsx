import { useLayoutEffect, useRef, useState } from 'react'
import {
  SPEECH_ANCHOR,
  SPEECH_FONT_MIN_PX,
  SPEECH_FONT_PX,
  SPEECH_MAX_HEIGHT_PX,
  SPEECH_MAX_WIDTH_PX,
  SPEECH_PAD_PX,
  SPEECH_RADIUS_PX,
} from './characterBetConstants'
import type { SpeechView } from './useDiceThrow'

const SpeechBubble = ({ text, x, y }: { text: string; x: number; y: number }) => {
  const ref = useRef<HTMLParagraphElement>(null)
  const [font, setFont] = useState(SPEECH_FONT_PX)
  const [grow, setGrow] = useState(false)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    let size = SPEECH_FONT_PX
    node.style.fontSize = `${size}px`
    node.style.maxHeight = `${SPEECH_MAX_HEIGHT_PX}px`
    while (size > SPEECH_FONT_MIN_PX && node.scrollHeight > node.clientHeight + 1) {
      size -= 1
      node.style.fontSize = `${size}px`
    }
    setFont(size)
    setGrow(size <= SPEECH_FONT_MIN_PX && node.scrollHeight > node.clientHeight + 1)
  }, [text])

  return (
    <div
      className="speech-bubble"
      style={{
        left: x,
        top: y,
        maxWidth: SPEECH_MAX_WIDTH_PX,
        padding: SPEECH_PAD_PX,
        borderRadius: SPEECH_RADIUS_PX,
        fontSize: font,
      }}
    >
      <p ref={ref} style={{ maxHeight: grow ? undefined : SPEECH_MAX_HEIGHT_PX }}>
        {text}
      </p>
    </div>
  )
}

export const SpeechLayer = ({ speech }: { speech: readonly SpeechView[] }) => {
  if (speech.length === 0) return null
  return (
    <div className="speech-layer">
      {speech.map((item) => {
        const anchor = SPEECH_ANCHOR[item.character]
        return <SpeechBubble key={item.character} text={item.text} x={anchor.x} y={anchor.y} />
      })}
    </div>
  )
}
