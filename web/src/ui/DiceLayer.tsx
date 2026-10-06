import { DIE_FACE_ALPHA, PUCK_IMAGE_WIDTH_PX } from './diceConstants'
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

const FACES: Array<{ name: string; value: number }> = [
  { name: 'front', value: 2 },
  { name: 'back', value: 5 },
  { name: 'right', value: 3 },
  { name: 'left', value: 4 },
  { name: 'top', value: 1 },
  { name: 'bottom', value: 6 },
]

const Face = ({ name, value }: { name: string; value: number }) => (
  <div className={`die-face die-face-${name}`} style={{ backgroundColor: `rgba(196, 28, 36, ${DIE_FACE_ALPHA})` }}>
    {PIP_LAYOUT[value].map(([x, y]) => (
      <span key={`${name}-${x}-${y}`} className="die-pip" style={{ left: `${x}%`, top: `${y}%` }} />
    ))}
  </div>
)

export const DiceLayer = ({ presentation }: { presentation: DicePresentation }) => {
  const puck = puckPlacement(presentation.point)
  const result = presentation.result
  return (
    <>
      <div className="dice-layer" aria-hidden={result == null}>
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
              <div className="die-spin" style={{ transform: die.transform }}>
                {FACES.map((face) => (
                  <Face key={face.name} name={face.name} value={face.value} />
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
            </>
          )}
        </div>
      ) : null}
    </>
  )
}
