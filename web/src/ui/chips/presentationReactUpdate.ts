import type { DicePresentation } from '../useDiceThrow'

/** Fields that should trigger a React re-render (chip motion uses the imperative presenter). */
export const dicePresentationReactChanged = (
  prev: DicePresentation | null,
  next: DicePresentation,
): boolean => {
  if (!prev) return true
  if (prev.phase !== next.phase) return true
  if (prev.point !== next.point) return true
  if (prev.result !== next.result) return true
  if (prev.dice[0].visible !== next.dice[0].visible) return true
  if (prev.dice[1].visible !== next.dice[1].visible) return true
  if (prev.speech !== next.speech && !shallowSpeechEqual(prev.speech, next.speech)) return true
  if (prev.pnl !== next.pnl) return true
  if (prev.shooter !== next.shooter) return true
  if (prev.bonusStakes.tall !== next.bonusStakes.tall || prev.bonusStakes.small !== next.bonusStakes.small) return true
  if (prev.rollStreak.current !== next.rollStreak.current) return true
  if (prev.rollStreak.longest !== next.rollStreak.longest) return true
  if (prev.lastRoll !== next.lastRoll) return true
  if (prev.betClockSec !== next.betClockSec) return true
  if (prev.purse !== next.purse) return true
  if (prev.wipedOut !== next.wipedOut) return true
  if (prev.session.usd !== next.session.usd || prev.session.btc !== next.session.btc) return true
  if (feltSignature(prev.felt) !== feltSignature(next.felt)) return true
  return false
}

const feltSignature = (felt: DicePresentation['felt']): string =>
  felt.map((bet) => `${bet.id}:${bet.dollars}:${bet.number ?? ''}:${bet.spot ?? ''}`).join('|')

const shallowSpeechEqual = (
  a: DicePresentation['speech'],
  b: DicePresentation['speech'],
): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].character !== b[i].character || a[i].text !== b[i].text) return false
  }
  return true
}
