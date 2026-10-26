import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from './config/constants'
import { fetchBinanceBtc1mKlines, type Candle } from './data/candles'
import { BlockHeightService, type BlockState } from './data/blockHeight'
import { MarketDataService, type MarketFeedUpdate } from './data/marketData'
import { emptyCharacterPnl } from './ui/characterPnl'
import { emptyBonusStakes, loadShooterBook } from './ui/shooterProfile'
import { loadDieColor, nextDieColor, saveDieColor, type DieColorId } from './ui/diceColor'
import { emptyRollStreakView } from './ui/rollStreak'
import { CrapsScene } from './ui/CrapsScene'
import { Overlay } from './ui/Overlay'
import { SplashSequence } from './ui/SplashSequence'
import { Stage } from './ui/Stage'
import { BG2_MAX_CANDLES } from './ui/androidMirrorConstants'
import { useBg2ChartVisible } from './ui/useBg2ChartVisibility'
import { useBg2MemeState } from './ui/useBg2MemeState'
import { BONUS_FLASH_MS, BONUS_LABEL_EXTRA_MS } from './ui/bonusConstants'
import { applyBonusRoll, bonusFlashTotals, emptyBonusHand } from './ui/bonusCraps'
import { bonusTestHand, isBonusTestSeed, type BonusTestSeed } from './ui/bonusTest'
import type { ThrowResult } from './ui/dicePhysics'
import { loadHistogramRolls, pushRoll, saveHistogramRolls } from './ui/histogramModel'
import type { ChipFrameApply } from './ui/chips/ChipPresenterHost'
import type { GuideFrameApply } from './ui/chips/guidePresenter'
import type { DiceFrameApply, LaunchPoint } from './ui/dicePose'
import type { EyeFrameApply } from './ui/EyeLayer'
import type { EyeMarkFrameApply } from './ui/EyeMarkLayer'
import type { BalanceDeltaFrameApply } from './ui/BalanceDeltaLayer'
import { useDiceThrow, type BetControls, type ShooterControls } from './ui/useDiceThrow'
import { ShooterBetLayer } from './ui/ShooterBetLayer'
import { ShooterBetsPanel } from './ui/ShooterBetsPanel'
import { emptySessionPnl, loadBetSettings, withLockedRule, type ShooterBetSettings } from './ui/shooterSlip'
import {
  loadDiceControlBook,
  loadDiceControlSettings,
  recordDiceControlRoll,
  saveDiceControlBook,
  saveDiceControlSettings,
  type DiceControlRoll,
  type DiceControlSettings,
} from './ui/diceControl'
import { DiceControlHistogram, DiceControlPanel } from './ui/DiceControlPanel'
import { ShooterScrollNote } from './ui/ShooterScrollNote'
import { useShooterGesture, useShooterPageLock } from './ui/useShooterGesture'
import { SHAKE_DISABLE_FLICK } from './ui/diceConstants'
import { ShakeDebugOverlay } from './ui/ShakeDebugOverlay'
import { shakeListenEnabled } from './ui/shakeThrow'
import { useShakeSensor, useShakeThrow } from './ui/useShakeThrow'
import { usePrecisionPhases } from './ui/usePrecisionPhases'
import { PrecisionOverlay } from './ui/PrecisionOverlay'
import type { PrecisionThrow } from './ui/precisionAim'
import { useHistogramVisibility } from './ui/useHistogramVisibility'
import { useFg3CatState } from './ui/useFg3CatState'
import { useVideoOverlayState } from './ui/useVideoOverlayState'
import { VideoOverlay } from './ui/VideoOverlay'

const emptyMarket = (): MarketFeedUpdate['market'] => ({
  binance: {
    exchange: 'binance',
    price: 0,
    buyVolume: 0,
    sellVolume: 0,
    updatedAt: 0,
  },
  coinbase: {
    exchange: 'coinbase',
    price: 0,
    buyVolume: 0,
    sellVolume: 0,
    updatedAt: 0,
  },
})

const initialFeedUpdate: MarketFeedUpdate = {
  market: emptyMarket(),
  status: {
    binance: 'disconnected',
    coinbase: 'disconnected',
  },
}

const initialBlockState: BlockState = {
  blockHeight: null,
  elapsedMs: 0,
  blockFlashOn: false,
  staleFlashOn: false,
}

const GITHUB_MARK_PATH =
  'M12 .5C5.65.5.5 5.67.5 12.03c0 5.11 3.3 9.45 7.88 10.98.58.1.8-.25.8-.56 0-.27-.01-1.16-.02-2.1-3.2.71-3.87-1.38-3.87-1.38-.52-1.36-1.28-1.72-1.28-1.72-1.04-.73.08-.72.08-.72 1.15.08 1.76 1.2 1.76 1.2 1.02 1.78 2.68 1.26 3.33.96.1-.76.4-1.26.72-1.55-2.55-.3-5.23-1.3-5.23-5.8 0-1.28.45-2.33 1.18-3.15-.12-.3-.51-1.5.11-3.13 0 0 .97-.32 3.17 1.2a10.8 10.8 0 0 1 5.77 0c2.2-1.52 3.16-1.2 3.16-1.2.63 1.63.24 2.83.12 3.13.73.82 1.17 1.87 1.17 3.15 0 4.51-2.68 5.49-5.24 5.78.42.37.78 1.09.78 2.2 0 1.6-.01 2.88-.01 3.27 0 .31.21.67.81.56A11.55 11.55 0 0 0 23.5 12.03C23.5 5.67 18.35.5 12 .5Z'

const GitHubMark = () => (
  <svg className="repo-link-icon" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
    <path fill="currentColor" d={GITHUB_MARK_PATH} />
  </svg>
)

const ReleaseNote = ({ wideTop = false }: { wideTop?: boolean }) => (
  <p className={wideTop ? 'repo-release-note repo-release-note-top' : 'repo-release-note'}>
    Released on 2026-Oct-10
    <br />
    Bitcoin was $82k.
    <br />
    Website is work in progress...
  </p>
)

function App() {
  const appShellRef = useRef<HTMLElement | null>(null)
  const stageAnchorRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)
  const shooterControlsRef = useRef<ShooterControls | null>(null)
  const shakeBusyRef = useRef(false)
  const shakeRestartRef = useRef<(() => void) | null>(null)
  const betControlsRef = useRef<BetControls | null>(null)
  const [betSettings, setBetSettings] = useState<ShooterBetSettings>(loadBetSettings)
  const onBetSettings = useCallback((next: ShooterBetSettings) => {
    const locked = withLockedRule(next)
    setBetSettings(locked)
    betControlsRef.current?.setSettings(locked)
  }, [])
  const [diceControl, setDiceControl] = useState(loadDiceControlSettings)
  const diceControlRef = useRef(diceControl)
  diceControlRef.current = diceControl
  const [motionTest, setMotionTest] = useState(false)
  const [diceControlBook, setDiceControlBook] = useState(loadDiceControlBook)
  const onDiceControl = useCallback((patch: Partial<DiceControlSettings>) => {
    setDiceControl((current) => {
      const next = { ...current, ...patch }
      saveDiceControlSettings(next)
      return next
    })
  }, [])
  const onDiceControlRoll = useCallback((roll: DiceControlRoll) => {
    setDiceControlBook((current) => {
      const next = recordDiceControlRoll(current, roll)
      saveDiceControlBook(next)
      return next
    })
  }, [])
  const [manualShooter, setManualShooter] = useState(false)
  const [betClockOpen, setBetClockOpen] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const onSplashDone = useCallback(() => setSplashDone(true), [])

  const [feed, setFeed] = useState<MarketFeedUpdate>(initialFeedUpdate)
  const [blockState, setBlockState] = useState<BlockState>(initialBlockState)
  const [candles, setCandles] = useState<Candle[]>([])
  const [sceneWidthPx, setSceneWidthPx] = useState(REFERENCE_WIDTH)
  const [sceneHeightPx, setSceneHeightPx] = useState(REFERENCE_HEIGHT)
  const [displayWidthPx, setDisplayWidthPx] = useState(REFERENCE_WIDTH)

  useLayoutEffect(() => {
    const el = stageAnchorRef.current
    const display = displayRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setSceneWidthPx(w > 0 ? w : REFERENCE_WIDTH)
      setSceneHeightPx(h > 0 ? h : REFERENCE_HEIGHT)
      const dw = display?.getBoundingClientRect().width ?? 0
      if (dw > 0) setDisplayWidthPx(dw)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (display) ro.observe(display)
    return () => ro.disconnect()
  }, [])

  const setFeedRef = useRef(setFeed)
  setFeedRef.current = setFeed

  const tableQuiet = manualShooter || betClockOpen
  const bg2Meme = useBg2MemeState(feed.market.binance.price, feed.market.coinbase.price, tableQuiet)
  const hasActiveBg2Meme = bg2Meme.activeMeme !== null
  const videoOverlay = useVideoOverlayState(tableQuiet)
  const isVideoActive = videoOverlay.isVideoActive
  const bg2Visible = useBg2ChartVisible(hasActiveBg2Meme || isVideoActive)
  const fg3 = useFg3CatState(tableQuiet)
  const [dieColor, setDieColor] = useState(loadDieColor)
  const onTimeClick = useCallback(() => {
    setDieColor((current) => {
      const next = nextDieColor(current)
      saveDieColor(next)
      return next
    })
  }, [])
  const onDieColor = useCallback((color: DieColorId) => {
    saveDieColor(color)
    setDieColor(color)
  }, [])
  const [rolls, setRolls] = useState(loadHistogramRolls)
  useEffect(() => {
    saveHistogramRolls(rolls)
  }, [rolls])
  const [bonusHits, setBonusHits] = useState<number[]>([])
  const [bonusFlashing, setBonusFlashing] = useState<number[]>([])
  const [bonusLines, setBonusLines] = useState<string[]>([])
  const [histogramBoost, setHistogramBoost] = useState(0)
  const bonusHandRef = useRef(emptyBonusHand())
  const bonusFlashTimer = useRef<number | undefined>(undefined)
  const onCountedRoll = useCallback((result: ThrowResult) => {
    if (!('total' in result)) {
      setBonusLines([])
      return 0
    }
    setRolls((current) => pushRoll(current, result.total))
    const step = applyBonusRoll(bonusHandRef.current, result.total)
    bonusHandRef.current = step.hand
    setBonusHits(step.hand.hits)
    setBonusLines(step.lines)
    if (step.flash) {
      setBonusFlashing(bonusFlashTotals(step.flash))
      setHistogramBoost((current) => current + 1)
      window.clearTimeout(bonusFlashTimer.current)
      bonusFlashTimer.current = window.setTimeout(() => setBonusFlashing([]), BONUS_FLASH_MS)
    } else if (result.total === 7) {
      window.clearTimeout(bonusFlashTimer.current)
      setBonusFlashing([])
    }
    return step.lines.length > 0 ? BONUS_LABEL_EXTRA_MS : 0
  }, [])
  useEffect(() => () => window.clearTimeout(bonusFlashTimer.current), [])
  const armBonusTest = useCallback((seed: BonusTestSeed) => {
    const hand = bonusTestHand(seed)
    bonusHandRef.current = hand
    setBonusHits(hand.hits)
    setBonusLines([])
    setBonusFlashing([])
    window.clearTimeout(bonusFlashTimer.current)
  }, [])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.btcCrapsBonus = { arm: armBonusTest }
    const params = new URLSearchParams(window.location.search)
    const seed = params.get('bonus')
    if (isBonusTestSeed(seed)) {
      armBonusTest(seed)
      params.delete('bonus')
      const query = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    }
    return () => {
      delete window.btcCrapsBonus
    }
  }, [armBonusTest])
  const histogram = useHistogramVisibility(splashDone, histogramBoost)
  const precisionShotRef = useRef<Omit<PrecisionThrow, 'speed' | 'lean'> | null>(null)
  const chipApplyRef = useRef<ChipFrameApply | null>(null)
  const diceApplyRef = useRef<DiceFrameApply | null>(null)
  const eyeApplyRef = useRef<EyeFrameApply | null>(null)
  const eyeMarkApplyRef = useRef<EyeMarkFrameApply | null>(null)
  const guideApplyRef = useRef<GuideFrameApply | null>(null)
  const balanceDeltaApplyRef = useRef<BalanceDeltaFrameApply | null>(null)
  const launchPointRef = useRef<LaunchPoint>({ x: REFERENCE_WIDTH / 2, y: REFERENCE_HEIGHT - 48 })
  const dice = useDiceThrow(
    feed.market,
    splashDone,
    rolls,
    onCountedRoll,
    bonusHandRef,
    manualShooter,
    shooterControlsRef,
    diceControlRef,
    onDiceControlRoll,
    precisionShotRef,
    chipApplyRef,
    diceApplyRef,
    eyeApplyRef,
    guideApplyRef,
    launchPointRef,
    balanceDeltaApplyRef,
    eyeMarkApplyRef,
    betControlsRef,
  )
  useEffect(() => {
    if (dice?.wipedOut) setManualShooter(false)
  }, [dice?.wipedOut])
  const gestureReady = manualShooter && dice?.phase === 'holding'
  const betting = dice?.betClockSec != null
  useEffect(() => {
    setBetClockOpen(betting)
  }, [betting])
  const shooting = gestureReady && !betting
  const distractionsPaused = manualShooter || betting
  const precisionOn = diceControl.precisionTargeting
  const blockFlick = SHAKE_DISABLE_FLICK && diceControl.shakeToRoll
  const precision = usePrecisionPhases(
    shooting && precisionOn,
    precisionOn,
    stageRef,
    shooterControlsRef,
    precisionShotRef,
    gestureReady,
    blockFlick,
  )
  const shakeSensor = useShakeSensor(diceControl.shakeToRoll)
  const shakeListening = Boolean(diceControl.shakeToRoll && shakeSensor.live)
  const motionTestOpen = motionTest && shakeSensor.live
  useEffect(() => {
    if (!shakeSensor.live) setMotionTest(false)
  }, [shakeSensor.live])
  useShooterGesture(
    shooting && !precisionOn,
    stageRef,
    shooterControlsRef,
    shakeListening,
    shakeBusyRef,
    shakeRestartRef,
    blockFlick,
  )
  const onShakeToRoll = useCallback(() => {
    if (diceControl.shakeToRoll) {
      shakeSensor.invalidate()
      onDiceControl({ shakeToRoll: false })
      return
    }
    shakeSensor.requestEnable(() => onDiceControl({ shakeToRoll: true }))
  }, [diceControl.shakeToRoll, onDiceControl, shakeSensor])
  const onMotionTest = useCallback(() => setMotionTest((current) => !current), [])
  const shotClockRef = useRef<number | null>(null)
  shotClockRef.current = dice?.shotClockMs ?? null
  const shakeDebug = useShakeThrow(
    shakeListenEnabled(diceControl.shakeToRoll, shakeSensor.live, shooting, precisionOn, precision.phase),
    precisionOn,
    shooterControlsRef,
    precisionShotRef,
    shakeBusyRef,
    shotClockRef,
    shakeRestartRef,
    motionTestOpen,
    {
      x: diceControl.shakeThresholdX,
      y: diceControl.shakeThresholdY,
      z: diceControl.shakeThresholdZ,
    },
  )
  useShooterPageLock(manualShooter)
  const onShooterMode = useCallback(() => {
    setManualShooter((current) => {
      if (current) shooterControlsRef.current?.launchAutoNow()
      return !current
    })
  }, [])

  const marketService = useMemo(
    () =>
      new MarketDataService((update) => {
        setFeedRef.current(update)
      }),
    [],
  )

  useEffect(() => {
    const blockService = new BlockHeightService(setBlockState)
    blockService.start()
    return () => blockService.stop()
  }, [])

  useEffect(() => {
    marketService.start()
    return () => marketService.stop()
  }, [marketService])

  useEffect(() => {
    const load = () => {
      void fetchBinanceBtc1mKlines(BG2_MAX_CANDLES).then(setCandles)
    }
    load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const showCandleChart = bg2Visible && !isVideoActive && !distractionsPaused
  const showBg2Meme = splashDone && hasActiveBg2Meme && !isVideoActive && !distractionsPaused

  return (
    <main ref={appShellRef} className="app-shell">
      {!splashDone ? <SplashSequence onDone={onSplashDone} /> : null}
      <div className="app-layout">
        <div className="stage-anchor" ref={stageAnchorRef}>
          <Stage shellRef={appShellRef} stageRef={stageRef} displayRef={displayRef}>
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
              histogramReveal={histogram.reveal}
              histogramAnimate={histogram.animate}
              histogramTransitionMs={histogram.transitionMs}
              bonusHits={bonusHits}
              bonusFlashing={bonusFlashing}
              bonusLines={bonusLines}
              dieColor={dieColor}
              characterPnl={dice?.pnl ?? emptyCharacterPnl()}
            />
            <Overlay
              market={feed.market}
              block={blockState}
              onTimeClick={onTimeClick}
              shooter={dice?.shooter ?? loadShooterBook()}
              bonusStakes={dice?.bonusStakes ?? emptyBonusStakes()}
              rollStreak={dice?.rollStreak ?? emptyRollStreakView()}
              lastRoll={dice?.lastRoll ?? null}
              shooterMode={manualShooter}
              wipedOut={dice?.wipedOut ?? false}
              session={dice?.session ?? emptySessionPnl()}
              status={feed.status}
            />
            <ShooterBetLayer
              active={dice?.phase === 'holding'}
              betClockSec={dice?.betClockSec ?? null}
              purse={dice?.purse ?? 0}
              showPurse={manualShooter}
              banked={manualShooter}
              felt={dice?.felt ?? []}
              point={dice?.point ?? null}
              controlsRef={betControlsRef}
            />
            <PrecisionOverlay
              active={shooting && precisionOn}
              phase={precision.phase}
              target={precision.target}
              angle={precision.angle}
              spin={precision.spin}
              launchPointRef={launchPointRef}
              dieColor={dieColor}
              onOk={precision.accept}
              betting={dice?.betClockSec != null}
            />
            {videoOverlay.active && !distractionsPaused ? (
              <VideoOverlay
                videoId={videoOverlay.active.videoId}
                soundEnabled={videoOverlay.soundEnabled}
                onEnded={videoOverlay.completeActiveVideo}
                onPlaybackError={videoOverlay.failActiveVideo}
                onClose={videoOverlay.completeActiveVideo}
                sceneWidthPx={sceneWidthPx}
                sceneHeightPx={sceneHeightPx}
              />
            ) : null}
          </Stage>
        </div>

        <div className="table-side">
          <ReleaseNote wideTop />
          <div className="shooter-mode-row">
            <button
              className={manualShooter ? 'shooter-mode-button is-manual' : 'shooter-mode-button is-auto'}
              type="button"
              style={{ width: Math.max(120, displayWidthPx / 3) }}
              aria-pressed={manualShooter}
              onClick={onShooterMode}
            >
              {manualShooter ? 'Auto' : 'Shooter'}
            </button>
            <ShooterScrollNote active={manualShooter} />
          </div>
          {manualShooter ? (
            <div
              className="precision-mode-switch"
              style={{ width: Math.max(200, displayWidthPx / 3) }}
              role="group"
              aria-label="Shooter style"
            >
              <button
                type="button"
                aria-pressed={!diceControl.precisionTargeting}
                className={diceControl.precisionTargeting ? '' : 'is-selected'}
                disabled={betting}
                onClick={() => onDiceControl({ precisionTargeting: false })}
              >
                Regular
              </button>
              <button
                type="button"
                aria-pressed={diceControl.precisionTargeting}
                className={diceControl.precisionTargeting ? 'is-selected' : ''}
                disabled={betting}
                onClick={() => onDiceControl({ precisionTargeting: true })}
              >
                Precision
              </button>
            </div>
          ) : null}
          <ShooterBetsPanel settings={betSettings} onChange={onBetSettings} />
          <DiceControlPanel
            settings={diceControl}
            onChange={onDiceControl}
            dieColor={dieColor}
            onDieColor={onDieColor}
            shakeAvailable={shakeSensor.available}
            onShakeToRoll={onShakeToRoll}
            shakeLive={shakeSensor.live}
            motionTest={motionTestOpen}
            onMotionTest={onMotionTest}
          />
          <DiceControlHistogram settings={diceControl} book={diceControlBook} />
          <aside className="repo-links-panel" aria-label="Source repositories">
          <div className="repo-link-lnurl" aria-label="LNURL address">
            <img className="lnurl-badge" src="/mobile/lnurl_address.jpg.jpeg" alt="LNURL address" draggable={false} />
          </div>
          <a
            className="repo-link"
            href="https://github.com/VirtusVerbis/BTC_Craps"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubMark />
            <span>GitHub Repo</span>
          </a>
          <ReleaseNote />
          </aside>
        </div>
      </div>
      {shakeDebug ? (
        <ShakeDebugOverlay
          view={shakeDebug}
          thresholdX={diceControl.shakeThresholdX}
          thresholdY={diceControl.shakeThresholdY}
          thresholdZ={diceControl.shakeThresholdZ}
        />
      ) : null}
    </main>
  )
}

export default App
