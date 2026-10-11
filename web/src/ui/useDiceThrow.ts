import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { MarketSnapshot } from '../game/types'
import { useOpenInterest } from '../data/openInterest'
import {
  applyCharacterPnl,
  characterStakes,
  loadCharacterPnl,
  PL_CHARACTERS,
  saveCharacterPnl,
  type CharacterPnlBook,
} from './characterPnl'
import { SPEECH_SHOW_MS } from './characterBetConstants'
import type { ProfileBet } from './characterProfiles'
import { composeTableBets, type PointHand } from './characterProfiles'
import { isHardRoll } from './crapsPayouts'
import { btcPrice, type ChipBet } from './chipBets'
import {
  settleColumns,
  driftLooseChips,
  emptyChipWorld,
  guideFrames,
  lineLaunchObstacles,
  presentChips,
  puckObstacle,
  resolveDiceChips,
  tickRestack,
  worldFromBets,
  type ChipDisc,
  type ChipWorld,
  type StackGuideView,
} from './chipPhysics'
import { DIE_RESULT_HOLD_MS, SHOT_CLOCK_MS } from './diceConstants'
import {
  advanceThrow,
  aimHeldPair,
  arcDisplayFrom,
  clearSharedX,
  createHoldingDice,
  createThrowState,
  launchGestureThrow,
  launchHeldAuto,
  dieScreenCenter,
  quatToCssMatrix,
  spreadPairX,
  stageMetrics,
  syncArcDisplay,
  visualDieSize,
  type ArcDisplay,
  type Die,
  type DicePoseHook,
  type ThrowResult,
  type ThrowState,
  type VolumeTotals,
} from './dicePhysics'
import type { GestureStroke } from './gestureThrow'
import type { ChipCharacter } from './chipConstants'
import { useDiceVolumeWindow } from './useDiceVolumeWindow'
import { emptyBonusHand, type BonusHand } from './bonusCraps'
import {
  applyShooterRoll,
  bonusStakeDollars,
  emptyBonusStakes,
  loadShooterBook,
  saveShooterBook,
  shooterLineBets,
  type BonusStakes,
  type ShooterBook,
} from './shooterProfile'
import {
  applyRollStreak,
  loadRollStreakLongest,
  saveRollStreakLongest,
  type RollStreak,
  type RollStreakView,
} from './rollStreak'

export interface DieView {
  id: 'left' | 'right'
  visible: boolean
  x: number
  y: number
  size: number
  /** 0 at the launch rail, 1 at the back wall. */
  depth: number
  transform: string
}

export interface SpeechView {
  character: ChipCharacter
  text: string
}

export interface DicePresentation {
  dice: [DieView, DieView]
  result: ThrowResult | null
  point: number | null
  chips: ChipDisc[]
  guides: StackGuideView[]
  speech: SpeechView[]
  pnl: CharacterPnlBook
  shooter: ShooterBook
  bonusStakes: BonusStakes
  rollStreak: RollStreakView
  phase: ThrowState['phase']
  /** Remaining shot-clock time while Shooter mode is holding. Null otherwise. */
  shotClockMs: number | null
}

export interface ShooterControls {
  aimLaunchX: (stageX: number) => void
  releaseGesture: (stroke: GestureStroke) => void
  launchAutoNow: () => void
}

type ShooterCommand = { kind: 'aim'; x: number } | { kind: 'gesture'; stroke: GestureStroke } | { kind: 'auto' }

const emptyVolume = (): VolumeTotals => ({
  binanceBuy: 0,
  binanceSell: 0,
  coinbaseBuy: 0,
  coinbaseSell: 0,
})

const toView = (die: Die, id: 'left' | 'right', x: number, display: ArcDisplay): DieView => {
  const metrics = stageMetrics()
  const screen = dieScreenCenter(die, metrics)
  const depth = metrics.wallZ > 0 ? Math.min(1, Math.max(0, die.z / metrics.wallZ)) : 0
  const airborne = die.alive && !die.resting && !die.leaving && die.h > 0
  return {
    id,
    visible: die.alive,
    x,
    y: screen.y,
    size: visualDieSize(die.z, die.h, metrics),
    depth,
    transform: quatToCssMatrix(airborne ? display.q : die.q),
  }
}

const shotClockMs = (state: ThrowState, nowMs: number): number | null => {
  if (state.phase !== 'holding' || !state.manualHold) return null
  return Math.max(0, SHOT_CLOCK_MS - (nowMs - state.phaseStartedMs))
}

const present = (
  state: ThrowState,
  chips: readonly ChipDisc[],
  guides: readonly StackGuideView[],
  speech: readonly SpeechView[],
  pnl: CharacterPnlBook,
  shooter: ShooterBook,
  bonusStakes: BonusStakes,
  rollStreak: RollStreakView,
  nowMs: number,
  display: readonly [ArcDisplay, ArcDisplay],
): DicePresentation => {
  const [x0, x1] = spreadPairX(state.dice[0], state.dice[1])
  return {
    dice: [toView(state.dice[0], 'left', x0, display[0]), toView(state.dice[1], 'right', x1, display[1])],
    result: state.phase === 'result' ? state.result : null,
    point: state.point,
    chips: chips.slice(),
    guides: guides.slice(),
    speech: speech.slice(),
    pnl,
    shooter,
    bonusStakes,
    rollStreak,
    phase: state.phase,
    shotClockMs: shotClockMs(state, nowMs),
  }
}

const laneKey = (world: ChipWorld): string =>
  lineLaunchObstacles(world)
    .map((obstacle) => `${obstacle.x.toFixed(1)}:${obstacle.clearance.toFixed(1)}`)
    .join('|')

/** Move a held pair into an open lane. The same stacks leave the dice where they are. */
const aimClearLane = (state: ThrowState, world: ChipWorld, aimedKey: string): { state: ThrowState; aimedKey: string } => {
  if (state.phase !== 'holding') return { state, aimedKey }
  const key = laneKey(world)
  if (key === '' || key === aimedKey) return { state, aimedKey }
  const sharedX = clearSharedX(lineLaunchObstacles(world))
  return {
    aimedKey: key,
    state: { ...state, sharedX, dice: createHoldingDice(sharedX) },
  }
}

const liveSpeech = (
  speech: Partial<Record<ChipCharacter, { text: string; until: number }>>,
  now: number,
): SpeechView[] => {
  const live: SpeechView[] = []
  for (const character of PL_CHARACTERS) {
    const row = speech[character]
    if (!row || row.until <= now) {
      delete speech[character]
      continue
    }
    live.push({ character, text: row.text })
  }
  return live
}

export const useDiceThrow = (
  market: MarketSnapshot,
  enabled: boolean,
  rolls: readonly number[],
  onCountedRoll?: (result: ThrowResult) => number | void,
  bonusHandRef?: RefObject<BonusHand>,
  shooterMode = false,
  shooterControlsRef?: { current: ShooterControls | null },
): DicePresentation | null => {
  const oi = useOpenInterest()
  const volume = useDiceVolumeWindow(market)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const marketRef = useRef(market)
  marketRef.current = market
  const oiRef = useRef(oi)
  oiRef.current = oi
  const rollsRef = useRef(rolls)
  rollsRef.current = rolls
  const onCountedRollRef = useRef(onCountedRoll)
  onCountedRollRef.current = onCountedRoll
  const stateRef = useRef<ThrowState>(createThrowState(performance.now()))
  const displayRef = useRef<[ArcDisplay, ArcDisplay]>([
    arcDisplayFrom(stateRef.current.dice[0]),
    arcDisplayFrom(stateRef.current.dice[1]),
  ])
  const worldRef = useRef<ChipWorld | null>(null)
  const pnlRef = useRef<CharacterPnlBook>(loadCharacterPnl())
  const shooterRef = useRef<ShooterBook>(loadShooterBook())
  const betsRef = useRef<readonly ChipBet[]>([])
  const profilesRef = useRef<ProfileBet[]>([])
  const profilePointRef = useRef<number | null>(null)
  const pressRollRef = useRef<number | null>(null)
  const sevenOutRef = useRef(false)
  const speechRef = useRef<Partial<Record<ChipCharacter, { text: string; until: number }>>>({})
  const streakRef = useRef<RollStreak>({ longest: loadRollStreakLongest(), current: 0 })
  const streakView = useCallback(
    (): RollStreakView => ({
      current: streakRef.current.current,
      longest: streakRef.current.longest,
    }),
    [],
  )
  const [presentation, setPresentation] = useState<DicePresentation>(() =>
    present(
      stateRef.current,
      [],
      [],
      [],
      pnlRef.current,
      shooterRef.current,
      emptyBonusStakes(),
      streakView(),
      performance.now(),
      displayRef.current,
    ),
  )
  const manualRef = useRef(shooterMode)
  manualRef.current = shooterMode
  const commandRef = useRef<ShooterCommand[]>([])
  const lastVolumeRef = useRef<VolumeTotals>(emptyVolume())
  const controls = useMemo<ShooterControls>(
    () => ({
      aimLaunchX: (stageX) => {
        commandRef.current.push({ kind: 'aim', x: stageX })
      },
      releaseGesture: (stroke) => {
        commandRef.current.push({ kind: 'gesture', stroke })
      },
      launchAutoNow: () => {
        commandRef.current.push({ kind: 'auto' })
      },
    }),
    [],
  )
  useEffect(() => {
    if (!shooterControlsRef) return undefined
    shooterControlsRef.current = controls
    return () => {
      if (shooterControlsRef.current === controls) shooterControlsRef.current = null
    }
  }, [controls, shooterControlsRef])

  useEffect(() => {
    if (!enabled) return undefined
    commandRef.current = []
    stateRef.current = createThrowState(performance.now())
    displayRef.current = [arcDisplayFrom(stateRef.current.dice[0]), arcDisplayFrom(stateRef.current.dice[1])]
    worldRef.current = null
    pnlRef.current = loadCharacterPnl()
    shooterRef.current = loadShooterBook()
    betsRef.current = []
    profilesRef.current = []
    profilePointRef.current = null
    pressRollRef.current = null
    sevenOutRef.current = false
    speechRef.current = {}
    streakRef.current = { longest: loadRollStreakLongest(), current: 0 }
    setPresentation(
      present(
        stateRef.current,
        [],
        [],
        [],
        pnlRef.current,
        shooterRef.current,
        emptyBonusStakes(),
        streakView(),
        performance.now(),
        displayRef.current,
      ),
    )
    let frame = 0
    let last = performance.now()

    const betsNow = (now: number) => {
      const snap = oiRef.current
      const price = btcPrice(marketRef.current)
      const shooter = shooterLineBets(shooterRef.current.allWorking)
      if (!snap || !(price > 0)) {
        betsRef.current = shooter
        return shooter
      }
      const point = stateRef.current.point
      const continued = point != null && point === profilePointRef.current
      const hand: PointHand = { continued, pressRoll: continued ? pressRollRef.current : null }
      const table = composeTableBets(
        snap.openInterest * price,
        snap.longPct,
        snap.shortPct,
        rollsRef.current,
        point,
        profilesRef.current,
        sevenOutRef.current,
        hand,
      )
      sevenOutRef.current = false
      pressRollRef.current = null
      profilePointRef.current = point
      profilesRef.current = table.profiles
      for (const character of PL_CHARACTERS) {
        const text = table.callouts[character]
        if (text) speechRef.current[character] = { text, until: now + SPEECH_SHOW_MS }
      }
      const bets = [...table.bets, ...shooter]
      betsRef.current = bets
      return bets
    }

    const poseHook: DicePoseHook = (dice, dt, metrics) => {
      const world = worldRef.current
      const next = world
        ? resolveDiceChips(world, dice, dt, metrics, puckObstacle(stateRef.current.point))
        : dice
      displayRef.current = syncArcDisplay(displayRef.current, next, dt)
      return next
    }

    let aimedKey = ''
    const holdLane = () => {
      if (stateRef.current.aimLocked) return
      const world = worldRef.current
      if (!world || stateRef.current.phase !== 'holding') {
        if (stateRef.current.phase !== 'holding') aimedKey = ''
        return
      }
      const aimed = aimClearLane(stateRef.current, world, aimedKey)
      aimedKey = aimed.aimedKey
      stateRef.current = aimed.state
    }

    const armManualHold = (now: number) => {
      const state = stateRef.current
      if (state.phase !== 'holding') return
      if (manualRef.current && !state.manualHold) {
        stateRef.current = { ...state, manualHold: true, phaseStartedMs: now, aimLocked: false }
      } else if (!manualRef.current && state.manualHold) {
        stateRef.current = { ...state, manualHold: false }
      }
    }

    const drainCommands = (now: number, metrics: ReturnType<typeof stageMetrics>) => {
      const commands = commandRef.current.splice(0)
      for (const command of commands) {
        if (stateRef.current.phase !== 'holding') continue
        if (command.kind === 'aim' && manualRef.current) {
          stateRef.current = aimHeldPair(stateRef.current, command.x)
        } else if (command.kind === 'gesture' && stateRef.current.manualHold) {
          stateRef.current = launchGestureThrow(stateRef.current, now, command.stroke, metrics)
        } else if (command.kind === 'auto') {
          stateRef.current = launchHeldAuto(stateRef.current, now, lastVolumeRef.current, metrics)
        }
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const metrics = stageMetrics()
      armManualHold(now)
      drainCommands(now, metrics)
      if (stateRef.current.phase === 'holding' && stateRef.current.manualHold) {
        lastVolumeRef.current = volumeRef.current
        if (now - stateRef.current.phaseStartedMs >= SHOT_CLOCK_MS) {
          stateRef.current = launchHeldAuto(stateRef.current, now, lastVolumeRef.current, metrics)
        }
      }
      if (!worldRef.current) {
        const bets = betsNow(now)
        if (bets.length > 0) worldRef.current = worldFromBets(bets, Math.floor(now))
      }
      holdLane()
      if (stateRef.current.phase !== 'flying') {
        displayRef.current = [arcDisplayFrom(stateRef.current.dice[0]), arcDisplayFrom(stateRef.current.dice[1])]
      }
      const phaseBefore = stateRef.current.phase
      const pointBefore = stateRef.current.point
      stateRef.current = advanceThrow(stateRef.current, dt, now, volumeRef.current, metrics, poseHook)
      if (phaseBefore !== 'result' && stateRef.current.phase === 'result') {
        const result = stateRef.current.result
        if (result && 'total' in result) {
          const snap = oiRef.current
          const price = btcPrice(marketRef.current)
          const faces = stateRef.current.dice
          const hard = isHardRoll(faces[0].topFace, faces[1].topFace)
          if (snap && price > 0 && snap.openInterest > 0) {
            pnlRef.current = applyCharacterPnl(
              pnlRef.current,
              pointBefore,
              result.total,
              characterStakes(snap.openInterest, price, snap.longPct, snap.shortPct),
              profilesRef.current,
              hard,
            )
            saveCharacterPnl(pnlRef.current)
          }
          if (pointBefore != null && result.total === 7) sevenOutRef.current = true
          const samePoint = pointBefore != null && stateRef.current.point === pointBefore
          pressRollRef.current = samePoint && (result.total === 6 || result.total === 8) ? result.total : null
          const nextShooter = applyShooterRoll(
            shooterRef.current,
            pointBefore,
            result.total,
            bonusHandRef?.current ?? emptyBonusHand(),
            price,
          )
          if (nextShooter !== shooterRef.current) {
            shooterRef.current = nextShooter
            saveShooterBook(nextShooter)
          }
          const step = applyRollStreak(streakRef.current, pointBefore != null, result.total)
          streakRef.current = step.streak
          if (step.record) saveRollStreakLongest(step.streak.longest)
        }
        const raw = result ? onCountedRollRef.current?.(result) : 0
        const extra = typeof raw === 'number' ? raw : 0
        if (extra > 0) stateRef.current = { ...stateRef.current, resultHoldMs: DIE_RESULT_HOLD_MS + extra }
      }
      if (phaseBefore !== 'holding' && stateRef.current.phase === 'holding') {
        const bets = betsNow(now)
        worldRef.current = settleColumns(worldRef.current ?? emptyChipWorld(), bets, now, Math.floor(now))
        aimedKey = ''
        if (manualRef.current) {
          stateRef.current = { ...stateRef.current, manualHold: true, phaseStartedMs: now, aimLocked: false }
        }
        holdLane()
      } else if (stateRef.current.phase === 'result' && worldRef.current) {
        worldRef.current = driftLooseChips(worldRef.current, dt, metrics, puckObstacle(stateRef.current.point))
      }
      if (worldRef.current?.restack) worldRef.current = tickRestack(worldRef.current, now)
      const chips = worldRef.current ? presentChips(worldRef.current, now, metrics) : []
      const guides = worldRef.current ? guideFrames(worldRef.current, metrics) : []
      setPresentation(
        present(
          stateRef.current,
          chips,
          guides,
          liveSpeech(speechRef.current, now),
          pnlRef.current,
          shooterRef.current,
          bonusStakeDollars(betsRef.current),
          streakView(),
          now,
          displayRef.current,
        ),
      )
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [enabled, streakView])

  if (!enabled) return null
  return presentation
}
