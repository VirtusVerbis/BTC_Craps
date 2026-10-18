import { useEffect, useLayoutEffect, useRef, type MutableRefObject, type Ref } from 'react'
import {
  DIE_LAUNCH_SIZE_PX,
  DIE_MIDNIGHT_MARK_SCALE,
  DIE_MIDNIGHT_RIM_FRACTION,
  DIE_MIDNIGHT_SHIMMER_MS,
} from './diceConstants'
import { dieFaceAlpha, dieFaceGradient, diePigment, dieShade, type DieColorId } from './diceColor'
import { BitcoinMark, FawkesMark } from './diceMarks'
import { paintDiceFrame, type DiceFrameApply, type DicePoseFrame } from './dicePose'
import type { DicePresentation } from './useDiceThrow'

const PIP_LAYOUT: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 28],
    [72, 28],
    [28, 50],
    [72, 50],
    [28, 72],
    [72, 72],
  ],
}

const FACES: Array<{ name: string; value: number }> = [
  { name: 'front', value: 2 },
  { name: 'back', value: 5 },
  { name: 'right', value: 3 },
  { name: 'left', value: 4 },
  { name: 'top', value: 1 },
  { name: 'bottom', value: 6 },
]

type MidnightMark = 'bitcoin' | 'mask'

const midnightMark = (color: DieColorId, dieId?: string): MidnightMark | null => {
  if (color !== 'midnight') return null
  return dieId === 'right' ? 'mask' : 'bitcoin'
}

const Face = ({
  name,
  value,
  color,
  mark,
}: {
  name: string
  value: number
  color: DieColorId
  mark: MidnightMark | null
}) => {
  const pigment = color === 'rainbow' ? null : diePigment(color, 0)
  const showMark = value === 1 && mark != null
  return (
    <div
      className={`die-face die-face-${name}`}
      style={
        pigment
          ? {
              backgroundImage: dieFaceGradient(pigment, dieFaceAlpha(color)),
              ['--die-shade' as string]: dieShade(pigment),
            }
          : undefined
      }
    >
      {showMark ? (
        <span className={`die-mark die-mark-${mark}`}>
          {mark === 'mask' ? <FawkesMark /> : <BitcoinMark />}
        </span>
      ) : (
        PIP_LAYOUT[value].map(([x, y]) => (
          <span key={`${name}-${x}-${y}`} className="die-pip" style={{ left: `${x}%`, top: `${y}%` }} />
        ))
      )}
    </div>
  )
}

export const DieMesh = ({
  color,
  opacity = 1,
  meshRef,
  dieId,
}: {
  color: DieColorId
  opacity?: number
  meshRef?: Ref<HTMLDivElement>
  dieId?: string
}) => {
  const mark = midnightMark(color, dieId)
  const className = ['die', color === 'rainbow' ? 'is-rainbow' : '', color === 'midnight' ? 'is-midnight' : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div
      ref={meshRef}
      className={className}
      data-die-id={dieId}
      style={{
        width: DIE_LAUNCH_SIZE_PX,
        height: DIE_LAUNCH_SIZE_PX,
        left: 0,
        top: 0,
        opacity,
        ['--die-half' as string]: `${DIE_LAUNCH_SIZE_PX / 2}px`,
        ['--die-mark-scale' as string]: `${DIE_MIDNIGHT_MARK_SCALE}`,
        ['--die-rim' as string]: `${DIE_MIDNIGHT_RIM_FRACTION * 100}%`,
        ['--die-shimmer' as string]: `${DIE_MIDNIGHT_SHIMMER_MS}ms`,
      }}
    >
      <div className="die-spin">
        {FACES.map((face) => (
          <Face key={face.name} name={face.name} value={face.value} color={color} mark={mark} />
        ))}
      </div>
    </div>
  )
}

export const DiceLayer = ({
  presentation,
  dieColor = 'midnight',
  applyRef,
}: {
  presentation: DicePresentation
  dieColor?: DieColorId
  applyRef: MutableRefObject<DiceFrameApply | null>
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const poseRef = useRef<DicePoseFrame | null>(null)
  const result = presentation.result

  useEffect(() => {
    const apply: DiceFrameApply = (frame) => {
      poseRef.current = frame
      if (rootRef.current) paintDiceFrame(rootRef.current, frame)
    }
    applyRef.current = apply
    return () => {
      if (applyRef.current === apply) applyRef.current = null
    }
  }, [applyRef])

  useLayoutEffect(() => {
    if (rootRef.current && poseRef.current) paintDiceFrame(rootRef.current, poseRef.current)
  })

  return (
    <div ref={rootRef} className="dice-layer" data-die-color={dieColor} aria-hidden={result == null}>
      {presentation.dice.map((die) =>
        die.visible ? <DieMesh key={die.id} dieId={die.id} color={dieColor} /> : null,
      )}
      <div className="shot-clock" hidden>
        <div className="shot-clock-label">Shot Clock</div>
        <div className="shot-clock-time" />
      </div>
    </div>
  )
}

export const DiceResult = ({
  presentation,
  bonusLines = [],
}: {
  presentation: DicePresentation
  bonusLines?: readonly string[]
}) => {
  const result = presentation.result
  if (!result) return null
  return (
    <div className="dice-result">
      {'noRoll' in result ? (
        <div className="dice-result-total">No Roll!</div>
      ) : (
        <>
          <div className="dice-result-total">{result.total}</div>
          {result.label ? <div className="dice-result-label">{result.label}</div> : null}
          {bonusLines.map((line) => (
            <div className="dice-result-bonus" key={line}>
              {line}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
