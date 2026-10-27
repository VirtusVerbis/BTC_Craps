import type { CharacterRollDelta } from './characterPnl'
import { formatPnlAmount } from './characterPnl'
import type { ChipCharacter } from './chipConstants'
import {
  PL_DELTA_ANCHOR,
  PL_DELTA_FADE_RATE,
  PL_DELTA_MIN_BTC,
  PL_DELTA_RISE_PX_PER_S,
  PL_LOSS_COLOR,
  PL_PROFIT_COLOR,
  SHOOTER_DELTA_CAP_Y,
  SHOOTER_DELTA_X,
  SHOOTER_DELTA_Y,
} from './characterPnlConstants'

export type FloaterCharacter = ChipCharacter | 'shooter'

export interface BalanceDelta {
  id: number
  character: FloaterCharacter
  btc: number
  usd: number
  bornMs: number
}

export interface BalanceDeltaFrame {
  id: number
  text: string
  color: string
  x: number
  y: number
  opacity: number
  /** Larger type and a heavier shadow. Characters stay on the shared style. */
  shooter: boolean
}

/** Two lines. The sign sits on the bitcoin line only. */
export const formatBalanceDelta = (btc: number, usd: number): string => {
  const sign = btc < 0 ? '-' : '+'
  return `${sign} ${formatPnlAmount(btc)} BTC\n$${formatPnlAmount(usd)} USD`
}

/** A flat, tiny, or sub-minimum bitcoin result does not get a floater. */
export const balanceDeltaVisible = (btc: number, minBtc = PL_DELTA_MIN_BTC): boolean => {
  if (!(btc > 0) && !(btc < 0)) return false
  if (Math.abs(btc) < minBtc) return false
  return formatPnlAmount(btc) !== '0'
}

export const spawnBalanceDeltas = (
  current: readonly BalanceDelta[],
  rollDeltas: readonly CharacterRollDelta[],
  nowMs: number,
  nextId: number,
): { deltas: BalanceDelta[]; nextId: number } => {
  const added: BalanceDelta[] = []
  let id = nextId
  for (const roll of rollDeltas) {
    if (!balanceDeltaVisible(roll.btc)) continue
    added.push({ id, character: roll.character, btc: roll.btc, usd: roll.usd, bornMs: nowMs })
    id += 1
  }
  if (added.length === 0) return { deltas: current as BalanceDelta[], nextId }
  return { deltas: [...current, ...added], nextId: id }
}

/** Fade rate that reaches zero exactly at `capY`, using the same pose as the characters. */
export const shooterDeltaFadeRate = (
  startY = SHOOTER_DELTA_Y,
  capY = SHOOTER_DELTA_CAP_Y,
): number => {
  const trip = startY - capY
  if (!(trip > 0) || !(startY > 0)) return PL_DELTA_FADE_RATE
  return startY / trip
}

/** One shooter floater for this roll. A flat or dust-sized bitcoin result is skipped. */
export const spawnShooterBalanceDelta = (
  current: readonly BalanceDelta[],
  btc: number,
  usd: number,
  nowMs: number,
  nextId: number,
): { deltas: BalanceDelta[]; nextId: number } => {
  if (!balanceDeltaVisible(btc)) return { deltas: current as BalanceDelta[], nextId }
  return {
    deltas: [...current, { id: nextId, character: 'shooter', btc, usd, bornMs: nowMs }],
    nextId: nextId + 1,
  }
}

/** Rise and fade for one floater. Gone at the head cap, or when the fade reaches zero. */
export const balanceDeltaPose = (
  startY: number,
  capY: number,
  ageSec: number,
  risePxPerS = PL_DELTA_RISE_PX_PER_S,
  fadeRate = PL_DELTA_FADE_RATE,
): { y: number; opacity: number; alive: boolean } => {
  const y = startY - risePxPerS * Math.max(0, ageSec)
  const opacity = startY <= 0 ? 0 : Math.min(1, Math.max(0, 1 - ((startY - y) / startY) * fadeRate))
  return { y, opacity, alive: y > capY && opacity > 0 }
}

/** Advance every floater. A new roll's entry stays in the list behind the ones already rising. */
export const tickBalanceDeltas = (deltas: readonly BalanceDelta[], nowMs: number): { deltas: BalanceDelta[]; frames: BalanceDeltaFrame[] } => {
  const alive: BalanceDelta[] = []
  const frames: BalanceDeltaFrame[] = []
  for (const delta of deltas) {
    const anchor = delta.character === 'shooter'
      ? { x: SHOOTER_DELTA_X, y: SHOOTER_DELTA_Y, capY: SHOOTER_DELTA_CAP_Y }
      : PL_DELTA_ANCHOR[delta.character]
    const fadeRate = delta.character === 'shooter' ? shooterDeltaFadeRate() : PL_DELTA_FADE_RATE
    const pose = balanceDeltaPose(anchor.y, anchor.capY, (nowMs - delta.bornMs) / 1000, PL_DELTA_RISE_PX_PER_S, fadeRate)
    if (!pose.alive) continue
    alive.push(delta)
    frames.push({
      id: delta.id,
      text: formatBalanceDelta(delta.btc, delta.usd),
      color: delta.btc > 0 ? PL_PROFIT_COLOR : PL_LOSS_COLOR,
      x: anchor.x,
      y: pose.y,
      opacity: pose.opacity,
      shooter: delta.character === 'shooter',
    })
  }
  return { deltas: alive.length === deltas.length ? (deltas as BalanceDelta[]) : alive, frames }
}
