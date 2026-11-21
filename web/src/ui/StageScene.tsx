import type { MutableRefObject } from 'react'
import type { Candle } from '../data/candles'
import { useMarketFeed } from '../data/marketFeedContext'
import { useBg2ChartVisible } from './useBg2ChartVisibility'
import { useBg2MemeState } from './useBg2MemeState'
import { CrapsScene } from './CrapsScene'
import type { ChipFrameApply } from './chips/ChipPresenterHost'
import type { GuideFrameApply } from './chips/guidePresenter'
import type { DiceFrameApply } from './dicePose'
import type { EyeFrameApply } from './EyeLayer'
import type { EyeMarkFrameApply } from './EyeMarkLayer'
import type { BalanceDeltaFrameApply } from './BalanceDeltaLayer'
import type { DieColorId } from './diceColor'
import type { Fg3CatState } from './useFg3CatState'
import type { DicePresentation } from './useDiceThrow'
import type { CharacterPnlBook } from './characterPnl'

export interface StageSceneProps {
  splashDone: boolean
  tableQuiet: boolean
  isVideoActive: boolean
  distractionsPaused: boolean
  fg3: Fg3CatState
  candles: Candle[]
  dice: DicePresentation | null
  chipApplyRef: MutableRefObject<ChipFrameApply | null>
  diceApplyRef: MutableRefObject<DiceFrameApply | null>
  eyeApplyRef: MutableRefObject<EyeFrameApply | null>
  eyeMarkApplyRef: MutableRefObject<EyeMarkFrameApply | null>
  guideApplyRef: MutableRefObject<GuideFrameApply | null>
  balanceDeltaApplyRef: MutableRefObject<BalanceDeltaFrameApply | null>
  rolls: readonly number[]
  histogramReveal: number
  histogramAnimate: boolean
  histogramTransitionMs: number
  bonusHits: number[]
  bonusFlashing: number[]
  bonusLines: string[]
  dieColor: DieColorId
  characterPnl: CharacterPnlBook
}

export const StageScene = ({
  splashDone,
  tableQuiet,
  isVideoActive,
  distractionsPaused,
  fg3,
  candles,
  dice,
  chipApplyRef,
  diceApplyRef,
  eyeApplyRef,
  eyeMarkApplyRef,
  guideApplyRef,
  balanceDeltaApplyRef,
  rolls,
  histogramReveal,
  histogramAnimate,
  histogramTransitionMs,
  bonusHits,
  bonusFlashing,
  bonusLines,
  dieColor,
  characterPnl,
}: StageSceneProps) => {
  const { market } = useMarketFeed()
  const bg2Meme = useBg2MemeState(market.binance.price, market.coinbase.price, tableQuiet)
  const hasActiveBg2Meme = bg2Meme.activeMeme !== null
  const bg2Visible = useBg2ChartVisible(hasActiveBg2Meme || isVideoActive)
  const showCandleChart = bg2Visible && !isVideoActive && !distractionsPaused
  const showBg2Meme = splashDone && hasActiveBg2Meme && !isVideoActive && !distractionsPaused

  return (
    <CrapsScene
      showCandleChart={showCandleChart}
      showBg2Meme={showBg2Meme}
      bg2ActiveMeme={bg2Meme.activeMeme}
      candles={candles}
      showFg3Cat={fg3.active && !distractionsPaused}
      fg3Direction={fg3.direction}
      fg3Frame={fg3.frame}
      fg3Left={fg3.left}
      fg3Top={fg3.top}
      fg3Width={fg3.width}
      fg3Height={fg3.height}
      dice={dice}
      chipApplyRef={chipApplyRef}
      diceApplyRef={diceApplyRef}
      eyeApplyRef={eyeApplyRef}
      eyeMarkApplyRef={eyeMarkApplyRef}
      guideApplyRef={guideApplyRef}
      balanceDeltaApplyRef={balanceDeltaApplyRef}
      rolls={rolls}
      histogramReveal={histogramReveal}
      histogramAnimate={histogramAnimate}
      histogramTransitionMs={histogramTransitionMs}
      bonusHits={bonusHits}
      bonusFlashing={bonusFlashing}
      bonusLines={bonusLines}
      dieColor={dieColor}
      characterPnl={characterPnl}
    />
  )
}