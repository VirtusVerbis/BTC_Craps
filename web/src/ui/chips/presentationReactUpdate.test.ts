import { describe, expect, it } from 'vitest'
import { emptyCharacterPnl } from '../characterPnl'
import type { DicePresentation, DieView } from '../useDiceThrow'
import { emptyShooterBook } from '../shooterProfile'
import { dicePresentationReactChanged } from './presentationReactUpdate'

const die = (id: DieView['id'], patch: Partial<DieView> = {}): DieView => ({
  id,
  visible: true,
  x: 10,
  y: 20,
  size: 40,
  depth: 0,
  transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)',
  ...patch,
})

const pnl = emptyCharacterPnl()
const shooter = emptyShooterBook()

const frame = (patch: Partial<DicePresentation> = {}): DicePresentation => ({
  dice: [die('left'), die('right', { x: 30 })],
  result: null,
  point: null,
  chips: [],
  guides: [],
  speech: [],
  pnl,
  shooter,
  bonusStakes: { tall: 0, small: 0 },
  rollStreak: { current: 0, longest: 0 },
  phase: 'holding',
  shotClockMs: null,
  ...patch,
})

describe('dicePresentationReactChanged', () => {
  it('ignores die motion, shot-clock milliseconds, and guide motion', () => {
    const prev = frame()
    const next = frame({
      dice: [die('left', { x: 80, y: 90, size: 22, transform: 'matrix3d(0,1,0,0,-1,0,0,0,0,0,1,0,0,0,0,1)' }), die('right')],
      shotClockMs: 1200,
      guides: [{ label: 'Pass', color: '#fff', left: 1, top: 2, width: 3, height: 4 }],
    })
    expect(dicePresentationReactChanged(prev, next)).toBe(false)
  })

  it('re-renders for phase, result, visibility, and a new streak', () => {
    const prev = frame()
    expect(dicePresentationReactChanged(prev, frame({ phase: 'flying' }))).toBe(true)
    expect(dicePresentationReactChanged(prev, frame({ result: { total: 7, label: null } }))).toBe(true)
    expect(dicePresentationReactChanged(prev, frame({ dice: [die('left', { visible: false }), die('right')] }))).toBe(true)
    expect(dicePresentationReactChanged(prev, frame({ rollStreak: { current: 1, longest: 1 } }))).toBe(true)
  })

  it('re-renders bonus stakes only when the amounts change', () => {
    const prev = frame()
    expect(dicePresentationReactChanged(prev, frame({ bonusStakes: { tall: 0, small: 0 } }))).toBe(false)
    expect(dicePresentationReactChanged(prev, frame({ bonusStakes: { tall: 5, small: 0 } }))).toBe(true)
  })
})
