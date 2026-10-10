import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { OpenInterestSnapshot } from '../data/openInterest'
import { liqTickerLines } from './liqTickerLines'
import {
  LIQ_LABEL_Y,
  LIQ_NOTABLE_USD,
  LIQ_TICKER_COLOR,
  LIQ_TICKER_FONT_PX,
  LIQ_TICKER_HEIGHT_PX,
  LIQ_TICKER_MS,
  LIQ_TICKER_SPEED_PX_PER_SEC,
} from './overlayConstants'
import { tickerPass, type TickerPass } from './tickerPass'

/** Empty bar shows before the words start moving. */
const BOX_FIRST_MS = 400

export const LiqTicker = ({ snapshot }: { snapshot: OpenInterestSnapshot | null }) => {
  const barStart = snapshot?.liqBarStart ?? null
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [scrolling, setScrolling] = useState(false)
  const [pass, setPass] = useState<TickerPass | null>(null)
  const finishAfterPass = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const phraseRef = useRef<HTMLSpanElement>(null)

  const text = queue[index] ?? null

  useEffect(() => {
    const current = snapshotRef.current
    finishAfterPass.current = false
    setScrolling(false)
    setPass(null)
    setIndex(0)
    setQueue(barStart == null || current == null ? [] : liqTickerLines(current, LIQ_NOTABLE_USD))
  }, [barStart])

  useLayoutEffect(() => {
    const box = boxRef.current
    const phrase = phraseRef.current
    if (!text || !box || !phrase) return
    const phraseWidth = phrase.offsetWidth
    const boxWidth = box.clientWidth
    if (!(phraseWidth > 0) || !(boxWidth > 0)) return
    setPass(tickerPass(boxWidth, phraseWidth, LIQ_TICKER_SPEED_PX_PER_SEC))
  }, [text])

  useEffect(() => {
    if (!text || !pass) return
    const id = window.setTimeout(() => setScrolling(true), BOX_FIRST_MS)
    return () => window.clearTimeout(id)
  }, [text, pass])

  useEffect(() => {
    if (!scrolling) return
    finishAfterPass.current = false
    const id = window.setTimeout(() => {
      finishAfterPass.current = true
    }, LIQ_TICKER_MS)
    return () => window.clearTimeout(id)
  }, [scrolling, text])

  if (!text) return null

  const advance = () => {
    if (!finishAfterPass.current) return
    finishAfterPass.current = false
    setScrolling(false)
    setIndex((current) => current + 1)
  }

  return (
    <div
      ref={boxRef}
      className="liq-ticker"
      style={{
        top: LIQ_LABEL_Y - LIQ_TICKER_HEIGHT_PX,
        height: LIQ_TICKER_HEIGHT_PX,
        fontSize: LIQ_TICKER_FONT_PX,
        color: LIQ_TICKER_COLOR,
      }}
    >
      <div
        className={scrolling && pass ? 'liq-ticker-track is-scrolling' : 'liq-ticker-track'}
        style={{
          animationDuration: pass ? `${pass.passMs}ms` : undefined,
          ['--liq-ticker-start' as string]: pass ? `${pass.start}px` : '0px',
          ['--liq-ticker-end' as string]: pass ? `${pass.end}px` : '0px',
        }}
        onAnimationIteration={advance}
      >
        <span ref={phraseRef} className="liq-ticker-phrase">
          {text}
        </span>
      </div>
    </div>
  )
}
