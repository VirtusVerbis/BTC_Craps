import { memo, useState } from 'react'
import { diceControlCharts, type DiceControlBook, type DiceControlSettings } from './diceControl'
import { DIE_COLOR_LABELS, DIE_COLOR_ORDER, type DieColorId } from './diceColor'
import { DICE_SETS, diceSet, type DiceSetId } from './diceSets'
import { DiceControlChart } from './DiceControlChart'

const REFERENCES = [
  {
    href: 'https://wizardofvegas.com/forum/gambling/dice-setting/37761-dice-control-dice-setting-defined/',
    label: 'Wizard of Vegas: dice setting defined',
  },
  { href: 'https://www.dicecoach.com/dicesets.asp', label: 'Dice Coach: dice sets' },
  { href: 'https://www.axispowercraps.com/gripping-the-dice/', label: 'Axis Power Craps: gripping the dice' },
] as const

const SetSelect = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: DiceSetId
  onChange: (id: DiceSetId) => void
}) => (
  <label className="dice-control-field" htmlFor={id}>
    <span>{label}</span>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value as DiceSetId)}>
      {DICE_SETS.map((set) => (
        <option key={set.id} value={set.id}>
          {set.label}
        </option>
      ))}
    </select>
    <p className="dice-control-note">{diceSet(value).description}</p>
  </label>
)

const DiceControlPanelInner = ({
  settings,
  onChange,
  dieColor,
  onDieColor,
  shakeAvailable,
  onShakeToRoll,
}: {
  settings: DiceControlSettings
  onChange: (patch: Partial<DiceControlSettings>) => void
  dieColor: DieColorId
  onDieColor: (color: DieColorId) => void
  shakeAvailable: boolean
  onShakeToRoll: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [referencesOpen, setReferencesOpen] = useState(false)
  return (
    <section className="side-panel">
      <button
        className="side-panel-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Dice Control</span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="side-panel-body">
          <SetSelect
            id="dice-control-come-out"
            label="Come Out"
            value={settings.comeOut}
            onChange={(comeOut) => onChange({ comeOut })}
          />
          <SetSelect
            id="dice-control-point"
            label="Point"
            value={settings.point}
            onChange={(point) => onChange({ point })}
          />
          <button
            className="dice-control-stack"
            type="button"
            aria-pressed={settings.stacked}
            onClick={() => onChange({ stacked: !settings.stacked })}
          >
            <span>Dice Stacking</span>
            <span>{settings.stacked ? 'On' : 'Off'}</span>
          </button>
          <button
            className="dice-control-stack"
            type="button"
            aria-pressed={settings.shakeToRoll}
            disabled={!shakeAvailable}
            onClick={onShakeToRoll}
          >
            <span>Shake to Roll</span>
            <span>{settings.shakeToRoll ? 'On' : 'Off'}</span>
          </button>
          <label className="dice-control-field" htmlFor="dice-control-color">
            <span>Dice Color</span>
            <select
              id="dice-control-color"
              value={dieColor}
              onChange={(event) => onDieColor(event.target.value as DieColorId)}
            >
              {DIE_COLOR_ORDER.map((id) => (
                <option key={id} value={id}>
                  {DIE_COLOR_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <div className="dice-control-references">
            <button
              className="dice-control-references-toggle"
              type="button"
              aria-expanded={referencesOpen}
              onClick={() => setReferencesOpen((current) => !current)}
            >
              References
            </button>
            {referencesOpen ? (
              <ul>
                {REFERENCES.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export const DiceControlPanel = memo(DiceControlPanelInner)

const DiceControlHistogramInner = ({
  settings,
  book,
}: {
  settings: DiceControlSettings
  book: DiceControlBook
}) => {
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const charts = diceControlCharts(settings, book)
  return (
    <section className="side-panel">
      <button
        className="side-panel-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Dice Control Histogram</span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="side-panel-body">
          <div className="dice-control-help">
            <button
              className="dice-control-help-toggle"
              type="button"
              aria-expanded={helpOpen}
              aria-controls="dice-control-help"
              onClick={() => setHelpOpen((current) => !current)}
            >
              <span className="dice-control-help-icon" aria-hidden="true">
                i
              </span>
              How to read this
            </button>
            {helpOpen ? (
              <div id="dice-control-help" className="dice-control-help-body">
                <p>
                  Come Out is every roll before a point is set. Point is every roll after. When both dropdowns name the
                  same set, one chart combines them. When the names differ, the top chart is the Come Out set and the
                  bottom chart is the Point set.
                </p>
                <p>
                  The center line is a fair pair of dice. A bar above it means that total is coming up more often than
                  fair. A bar below means less often. A faded bar can still be ordinary luck. A solid bar has moved far
                  enough that luck is a poor explanation.
                </p>
                <p>
                  Hard 4, 6, 8, and 10 are the doubles. The number after the name is how many times that double came up.
                  fair is how many a fair pair would produce in this many rolls. random, when it appears, is that same
                  count from the Random tosses.
                </p>
              </div>
            ) : null}
          </div>
          {charts.map((view) => (
            <DiceControlChart key={view.label} view={view} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export const DiceControlHistogram = memo(DiceControlHistogramInner)
