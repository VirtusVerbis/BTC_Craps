import type { DicePresentation } from '../useDiceThrow'

/** Fields that should trigger a React re-render (chip motion uses the imperative presenter). */
export const dicePresentationReactChanged = (
  prev: DicePresentation | null,
  next: DicePresentation,
): boolean => {
  if (!prev) return true
  if (prev.phase !== next.phase) return true
  if (prev.point !== next.point) return true
  if (prev.shotClockMs !== next.shotClockMs) return true
  if (prev.result !== next.result) return true
  if (prev.dice[0].transform !== next.dice[0].transform) return true
  if (prev.dice[1].transform !== next.dice[1].transform) return true
  if (prev.dice[0].visible !== next.dice[0].visible) return true
  if (prev.dice[1].visible !== next.dice[1].visible) return true
  if (prev.dice[0].x !== next.dice[0].x || prev.dice[0].y !== next.dice[0].y) return true
  if (prev.dice[1].x !== next.dice[1].x || prev.dice[1].y !== next.dice[1].y) return true
  if (prev.dice[0].size !== next.dice[0].size || prev.dice[1].size !== next.dice[1].size) return true
  if (prev.guides !== next.guides && !shallowGuidesEqual(prev.guides, next.guides)) return true
  if (prev.speech !== next.speech && !shallowSpeechEqual(prev.speech, next.speech)) return true
  if (prev.pnl !== next.pnl) return true
  if (prev.shooter !== next.shooter) return true
  if (prev.bonusStakes !== next.bonusStakes) return true
  if (prev.rollStreak.current !== next.rollStreak.current) return true
  if (prev.rollStreak.longest !== next.rollStreak.longest) return true
  return false
}

const shallowGuidesEqual = (
  a: DicePresentation['guides'],
  b: DicePresentation['guides'],
): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]
    const right = b[i]
    if (
      left.label !== right.label ||
      left.left !== right.left ||
      left.top !== right.top ||
      left.width !== right.width ||
      left.height !== right.height
    ) {
      return false
    }
  }
  return true
}

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
