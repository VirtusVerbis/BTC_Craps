import { useEffect, useState } from 'react'
import { DIE_BACK_WALL_TILT_DEG, DIE_LAUNCH_TILT_DEG, PUCK_IMAGE_WIDTH_PX } from './diceConstants'
import { dieFaceGradient, diePigment, dieRainbowStep, dieShade, type DieColorId } from './diceColor'
import { puckPlacement } from './puckState'
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

const viewTiltDeg = (depth: number) => DIE_LAUNCH_TILT_DEG + depth * (DIE_BACK_WALL_TILT_DEG - DIE_LAUNCH_TILT_DEG)

const FACES: Array<{ name: string; value: number }> = [
  { name: 'front', value: 2 },
  { name: 'back', value: 5 },
  { name: 'right', value: 3 },
  { name: 'left', value: 4 },
  { name: 'top', value: 1 },
  { name: 'bottom', value: 6 },
]

const useRainbowStep = (active: boolean) => {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!active) return undefined
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const next = dieRainbowStep(now - startedAt)
      setStep((current) => (current === next ? current : next))
      frame = window.requestAnimationFrame(tick)
    }
    setStep(0)
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [active])

  return step
}

const Face = ({
  name,
  value,
  color,
  rainbowStep,
}: {
  name: string
  value: number
  color: DieColorId
  rainbowStep: number
}) => {
  const pigment = diePigment(color, rainbowStep)
  return (
    <div
      className={`die-face die-face-${name}`}
      style={{
        backgroundImage: dieFaceGradient(pigment),
        ['--die-shade' as string]: dieShade(pigment),
      }}
    >
      {PIP_LAYOUT[value].map(([x, y]) => (
        <span key={`${name}-${x}-${y}`} className="die-pip" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </div>
  )
}

export const DiceLayer = ({
  presentation,
  bonusLines = [],
  dieColor = 'orange',
}: {
  presentation: DicePresentation
  bonusLines?: readonly string[]
  dieColor?: DieColorId
}) => {
  const rainbowStep = useRainbowStep(dieColor === 'rainbow')
  const puck = puckPlacement(presentation.point)
  const result = presentation.result
  return (
    <>
      <div className="dice-layer" data-die-color={dieColor} aria-hidden={result == null}>
        <img
          className="puck"
          src={puck.src}
          alt=""
          draggable={false}
          style={{ left: puck.x, top: puck.y, width: PUCK_IMAGE_WIDTH_PX * puck.scale }}
        />
        {presentation.dice.map((die) =>
          die.visible ? (
            <div
              key={die.id}
              className="die"
              style={{
                width: die.size,
                height: die.size,
                left: die.x - die.size / 2,
                top: die.y - die.size / 2,
                ['--die-half' as string]: `${die.size / 2}px`,
              }}
            >
              <div className="die-spin" style={{ transform: `rotateX(${viewTiltDeg(die.depth)}deg) ${die.transform}` }}>
                {FACES.map((face) => (
                  <Face key={face.name} name={face.name} value={face.value} color={dieColor} rainbowStep={rainbowStep} />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
      {result ? (
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
      ) : null}
    </>
  )
}
