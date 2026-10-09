import { type CSSProperties } from 'react'
import type { Candle } from '../data/candles'
import {
  BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH,
  BG2_ARROW_DOWN_TOP_OFFSET_FRACTION,
  BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH,
  BG2_ARROW_UP_TOP_OFFSET_FRACTION,
  BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH,
  BG2_BDWW_TOP_OFFSET_FRACTION,
  BG2_DCB_ASPECT_HEIGHT_PER_WIDTH,
  BG2_DCB_TOP_OFFSET_FRACTION,
  BG2_FR_ASPECT_HEIGHT_PER_WIDTH,
  BG2_FR_TOP_OFFSET_FRACTION,
  BG2_NEO_ASPECT_HEIGHT_PER_WIDTH,
  BG2_NEO_TOP_OFFSET_FRACTION,
} from './androidMirrorConstants'
import { BtcCandleChart } from './BtcCandleChart'
import { formatPnlBtc, formatPnlUsd, pnlColor, PL_CHARACTERS, type CharacterPnlBook } from './characterPnl'
import { PL_LABEL_ANCHOR, PL_LABEL_FONT_PX } from './characterPnlConstants'
import { ChipLayer } from './ChipStack'
import { DiceLayer } from './DiceLayer'
import { SpeechLayer } from './SpeechLayer'
import { RollHistogram } from './RollHistogram'
import type { DicePresentation } from './useDiceThrow'
import type { Bg2ActiveMeme } from './useBg2MemeState'
import type { Fg3CatState } from './useFg3CatState'
import { mobileAssetManifest } from './mobileAssetManifest'
import { resolveMobileAssetUrl } from './mobileAssetUrls'

const bg2MemeFile = (frame: number): string => {
  const f = Math.max(1, Math.min(40, frame))
  return `dancing_chika_brr_${String(f).padStart(3, '0')}.png`
}

const fg3CatFile = (direction: 'left' | 'right', frame: number): string => {
  const f = frame % 2 === 0 ? 1 : 2
  return `e_cat_${direction}_${f}.png`
}

const boxStyle = (layer: {
  zIndex: number
  left: number
  top: number
  width: number
  height: number
}): CSSProperties => ({
  position: 'absolute',
  zIndex: layer.zIndex,
  left: `${layer.left * 100}%`,
  top: `${layer.top * 100}%`,
  width: `${layer.width * 100}%`,
  height: `${layer.height * 100}%`,
  pointerEvents: 'none',
})

interface CrapsSceneProps {
  showCandleChart: boolean
  showBg2Meme: boolean
  bg2ActiveMeme: Bg2ActiveMeme | null
  sceneWidthPx: number
  sceneHeightPx: number
  candles: Candle[]
  showFg3Cat: boolean
  fg3Direction: Fg3CatState['direction']
  fg3Frame: number
  fg3Left: number
  fg3Top: number
  fg3Width: number
  fg3Height: number
  dice: DicePresentation | null
  characterPnl: CharacterPnlBook
  rolls: readonly number[]
  histogramReveal: number
  histogramAnimate: boolean
  histogramTransitionMs: number
  bonusHits: readonly number[]
  bonusFlashing: readonly number[]
  bonusLines: readonly string[]
}

export const CrapsScene = ({
  showCandleChart,
  showBg2Meme,
  bg2ActiveMeme,
  sceneWidthPx,
  sceneHeightPx,
  candles,
  showFg3Cat,
  fg3Direction,
  fg3Frame,
  fg3Left,
  fg3Top,
  fg3Width,
  fg3Height,
  dice,
  characterPnl,
  rolls,
  histogramReveal,
  histogramAnimate,
  histogramTransitionMs,
  bonusHits,
  bonusFlashing,
  bonusLines,
}: CrapsSceneProps) => {
  const m = mobileAssetManifest
  const bg2MemeSrc = (() => {
    if (!bg2ActiveMeme) return null
    if (bg2ActiveMeme.sequenceId === 'dcb') return resolveMobileAssetUrl(bg2MemeFile(bg2ActiveMeme.frameIndex + 1))
    if (bg2ActiveMeme.sequenceId === 'bdww') return resolveMobileAssetUrl('buy_dip_with_what.png')
    if (bg2ActiveMeme.sequenceId === 'neo') return resolveMobileAssetUrl('neo.png')
    if (bg2ActiveMeme.sequenceId === 'firstRule') return resolveMobileAssetUrl('btc_first_rule.png')
    if (bg2ActiveMeme.sequenceId === 'arrowUp') return resolveMobileAssetUrl('arrow_up_0.png')
    return resolveMobileAssetUrl('arrow_down_0.png')
  })()
  const bg2TopOffset = (() => {
    if (!bg2ActiveMeme) return BG2_DCB_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'dcb') return BG2_DCB_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'bdww') return BG2_BDWW_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'neo') return BG2_NEO_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'firstRule') return BG2_FR_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'arrowUp') return BG2_ARROW_UP_TOP_OFFSET_FRACTION
    return BG2_ARROW_DOWN_TOP_OFFSET_FRACTION
  })()
  const bg2Aspect = (() => {
    if (!bg2ActiveMeme) return BG2_DCB_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'dcb') return BG2_DCB_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'bdww') return BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'neo') return BG2_NEO_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'firstRule') return BG2_FR_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'arrowUp') return BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH
    return BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH
  })()
  const bg2HeightPct = sceneHeightPx > 0 ? (sceneWidthPx * bg2Aspect * 100) / sceneHeightPx : bg2Aspect * 100
  const bg2Style: CSSProperties = {
    position: 'absolute',
    zIndex: m.meme.zIndex,
    left: '0%',
    top: `${bg2TopOffset * 100}%`,
    width: '100%',
    height: `${bg2HeightPct}%`,
    objectFit: 'contain',
    pointerEvents: 'none',
  }
  const fg3Style: CSSProperties = {
    position: 'absolute',
    zIndex: m.fg3.zIndex,
    left: `${fg3Left * 100}%`,
    top: `${fg3Top * 100}%`,
    width: `${fg3Width * 100}%`,
    height: `${fg3Height * 100}%`,
    objectFit: m.fg3.objectFit,
    pointerEvents: 'none',
  }

  return (
    <div className="scene">
      <img
        src="/craps-scene-layout_onepiece.png"
        alt=""
        className="scene-layer scene-craps"
        draggable={false}
      />
      <RollHistogram
        rolls={rolls}
        reveal={histogramReveal}
        animate={histogramAnimate}
        transitionMs={histogramTransitionMs}
        hits={bonusHits}
        flashing={bonusFlashing}
      />
      <div className="character-pnl-layer">
        {PL_CHARACTERS.map((character) => {
          const amount = characterPnl[character]
          if (!amount.shown) return null
          const anchor = PL_LABEL_ANCHOR[character]
          const sign = amount.usd !== 0 ? amount.usd : amount.btc
          return (
            <div
              key={character}
              className="character-pnl"
              style={{
                left: anchor.x,
                top: anchor.y,
                color: pnlColor(amount),
                fontSize: PL_LABEL_FONT_PX,
              }}
              aria-label={sign < 0 ? 'loss' : sign > 0 ? 'profit' : 'flat'}
            >
              <p>{formatPnlBtc(amount.btc)}</p>
              <p>{formatPnlUsd(amount.usd)}</p>
            </div>
          )
        })}
      </div>
      {showBg2Meme && bg2MemeSrc ? (
        <img src={bg2MemeSrc} alt="" className="scene-layer scene-bg2-meme" style={bg2Style} draggable={false} />
      ) : null}
      {showCandleChart ? (
        <div className="scene-layer scene-chart-band" style={boxStyle(m.chartBand)}>
          <BtcCandleChart candles={candles} showAxisLabels />
        </div>
      ) : null}
      {showFg3Cat ? (
        <img
          src={resolveMobileAssetUrl(fg3CatFile(fg3Direction, fg3Frame))}
          alt=""
          className="scene-layer scene-fg3-cat"
          style={fg3Style}
          draggable={false}
        />
      ) : null}
      <ChipLayer discs={dice?.chips ?? []} guides={dice?.guides ?? []} />
      <SpeechLayer speech={dice?.speech ?? []} />
      {dice ? <DiceLayer presentation={dice} bonusLines={bonusLines} /> : null}
    </div>
  )
}
