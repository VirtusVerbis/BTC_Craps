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
} from './characterPnlConstants'

export interface BalanceDelta {
  id: number
  character: ChipCharacter
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
}

/** Two lines. The sign sits on the bitcoin line only. */
export const formatBalanceDelta = (btc: number, usd: number): string => {
  const sign = btc < 0 ? '-' : '+'
  return `${sign} ${formatPnlAmount(btc)} BTC\n${formatPnlAmount(usd)} USD`
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
    const anchor = PL_DELTA_ANCHOR[delta.character]
    const pose = balanceDeltaPose(anchor.y, anchor.capY, (nowMs - delta.bornMs) / 1000)
    if (!pose.alive) continue
    alive.push(delta)
    frames.push({
      id: delta.id,
      text: formatBalanceDelta(delta.btc, delta.usd),
      color: delta.btc > 0 ? PL_PROFIT_COLOR : PL_LOSS_COLOR,
      x: anchor.x,
      y: pose.y,
      opacity: pose.opacity,
    })
  }
  return { deltas: alive.length === deltas.length ? (deltas as BalanceDelta[]) : alive, frames }
}
