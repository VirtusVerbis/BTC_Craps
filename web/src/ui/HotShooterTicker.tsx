import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { ROLL_STREAK_COLOR_STEP_MS } from './rollStreak'
import {
  BOTTOM_ACTION_ROW_Y,
  LIQ_TICKER_FONT_PX,
  LIQ_TICKER_HEIGHT_PX,
  LIQ_TICKER_SPEED_PX_PER_SEC,
} from './overlayConstants'
import { HOT_SHOOTER_TEXT, openHotShooterGate, stepHotShooterGate, type HotShooterGate } from './hotShooter'
import { tickerPass, type TickerPass } from './tickerPass'

/** Empty bar shows before the words start moving. Matches the liquidation ticker. */
const BOX_FIRST_MS = 400

const RainbowPhrase = ({
  text,
  phraseRef,
}: {
  text: string
  phraseRef?: Ref<HTMLSpanElement>
}) => (
  <span ref={phraseRef} className="liq-ticker-phrase">
    {Array.from(text).map((char, index) => (
      <span key={index} className="rainbow-letter" style={{ animationDelay: `${-index * ROLL_STREAK_COLOR_STEP_MS}ms` }}>
        {char}
      </span>
    ))}
  </span>
)

const HotShooterPass = ({ onDone }: { onDone: () => void }) => {
  const [scrolling, setScrolling] = useState(false)
  const [pass, setPass] = useState<TickerPass | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const phraseRef = useRef<HTMLSpanElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useLayoutEffect(() => {
    const box = boxRef.current
    const phrase = phraseRef.current
    if (!box || !phrase) return
    const phraseWidth = phrase.offsetWidth
    const boxWidth = box.clientWidth
    if (!(phraseWidth > 0) || !(boxWidth > 0)) return
    setPass(tickerPass(boxWidth, phraseWidth, LIQ_TICKER_SPEED_PX_PER_SEC))
  }, [])

  useEffect(() => {
    if (!pass) return undefined
    const id = window.setTimeout(() => setScrolling(true), BOX_FIRST_MS)
    return () => window.clearTimeout(id)
  }, [pass])

  return (
    <div
      ref={boxRef}
      className="liq-ticker"
      style={{
        top: BOTTOM_ACTION_ROW_Y - LIQ_TICKER_HEIGHT_PX * 2,
        height: LIQ_TICKER_HEIGHT_PX,
        fontSize: LIQ_TICKER_FONT_PX,
      }}
    >
      <div
        className={scrolling && pass ? 'liq-ticker-track is-scrolling-once' : 'liq-ticker-track'}
        style={{
          animationDuration: pass ? `${pass.passMs}ms` : undefined,
          ['--liq-ticker-start' as string]: pass ? `${pass.start}px` : '0px',
          ['--liq-ticker-end' as string]: pass ? `${pass.end}px` : '0px',
        }}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget || event.animationName !== 'liq-ticker-scroll') return
          onDoneRef.current()
        }}
      >
        <RainbowPhrase text={HOT_SHOOTER_TEXT} phraseRef={phraseRef} />
      </div>
    </div>
  )
}

interface HotShooterTickerProps {
  current: number
  /** Dev-only serial from `btcCrapsHotShooter.play()`. Negative ids avoid clashing with gate play ids. */
  testPlaySerial?: number
}

const queuePlay = (
  id: number,
  queuedId: { current: number | null },
  setActiveId: (update: (showing: number | null) => number | null) => void,
) => {
  setActiveId((showing) => {
    if (showing == null) return id
    if (showing !== id) queuedId.current = id
    return showing
  })
}

export const HotShooterTicker = ({ current, testPlaySerial = 0 }: HotShooterTickerProps) => {
  const gateRef = useRef<HotShooterGate | null>(null)
  const queuedId = useRef<number | null>(null)
  const [playId, setPlayId] = useState(0)
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    if (gateRef.current == null) {
      gateRef.current = openHotShooterGate(current)
      return
    }
    const prev = gateRef.current
    const next = stepHotShooterGate(prev, current)
    gateRef.current = next
    if (next.playId !== prev.playId) setPlayId(next.playId)
  }, [current])

  useEffect(() => {
    if (playId === 0) return
    queuePlay(playId, queuedId, setActiveId)
  }, [playId])

  useEffect(() => {
    if (!testPlaySerial) return
    queuePlay(-testPlaySerial, queuedId, setActiveId)
  }, [testPlaySerial])

  if (activeId == null) return null

  return (
    <HotShooterPass
      key={activeId}
      onDone={() => {
        const next = queuedId.current
        queuedId.current = null
        setActiveId(next)
      }}
    />
  )
}
