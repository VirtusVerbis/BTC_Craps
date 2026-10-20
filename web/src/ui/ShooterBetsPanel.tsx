import { useState } from 'react'
import { CHIP_FACE_VALUE, chipsForDollars } from './chipBets'
import type { ChipColor } from './chipConstants'
import { chipFaceUrl } from './chips/chipFace'
import { formatLiqUsd } from './format'
import {
  COME_OUT_KINDS,
  FELT_LABEL,
  POINT_KINDS,
  SHOOTER_RULE_LIMIT,
  addRule,
  deleteRule,
  minimumDollars,
  setRuleDollars,
  setTableSide,
  type FeltKind,
  type RulePhase,
  type ShooterBetSettings,
  type ShooterRule,
} from './shooterSlip'

const COLORS: readonly ChipColor[] = ['white', 'red', 'green', 'blue', 'black']
const NUMBERED = new Set<FeltKind>(['place', 'lay', 'hard', 'hornNumber', 'comeOdds', 'dontComeOdds'])
const PLACE_NUMBERS = [4, 5, 6, 8, 9, 10]
const HARD_NUMBERS = [4, 6, 8, 10]
const HORN_NUMBERS = [2, 3, 12]

const numbersFor = (kind: FeltKind): readonly number[] => {
  if (kind === 'hard') return HARD_NUMBERS
  if (kind === 'hornNumber') return HORN_NUMBERS
  if (NUMBERED.has(kind)) return PLACE_NUMBERS
  return []
}

const chipCount = (dollars: number): string => {
  const chips = chipsForDollars(dollars, 1)
  if (chips.length === 0) return formatLiqUsd(0)
  const counts = new Map<ChipColor, number>()
  for (const chip of chips) counts.set(chip, (counts.get(chip) ?? 0) + 1)
  return COLORS.filter((color) => counts.has(color))
    .map((color) => `${counts.get(color)} ${color}`)
    .join(' ')
}

const RuleRow = ({
  rule,
  kinds,
  onChange,
  onDelete,
}: {
  rule: ShooterRule
  kinds: readonly FeltKind[]
  onChange: (rule: ShooterRule) => void
  onDelete: () => void
}) => {
  const numbers = numbersFor(rule.kind)
  return (
    <div className="shooter-rule">
      <select
        aria-label="Bet"
        disabled={rule.locked}
        value={rule.kind}
        onChange={(event) => {
          const kind = event.target.value as FeltKind
          const number = numbersFor(kind)[0] ?? null
          onChange({
            ...rule,
            kind,
            number,
            spot: kind === 'anyCraps' ? 'craps' : kind === 'eleven' ? 'eleven' : null,
            dollars: minimumDollars(kind, number),
          })
        }}
      >
        {kinds.map((kind) => (
          <option key={kind} value={kind}>
            {FELT_LABEL[kind]}
          </option>
        ))}
      </select>
      {numbers.length > 0 ? (
        <select
          aria-label="Number"
          value={rule.number ?? numbers[0]}
          onChange={(event) => onChange({ ...rule, number: Number(event.target.value) })}
        >
          {numbers.map((number) => (
            <option key={number} value={number}>
              {number}
            </option>
          ))}
        </select>
      ) : null}
      {rule.kind === 'anyCraps' || rule.kind === 'eleven' ? (
        <select
          aria-label="Spot"
          value={rule.spot ?? ''}
          onChange={(event) => onChange({ ...rule, spot: event.target.value })}
        >
          {rule.kind === 'anyCraps' ? (
            <>
              <option value="craps">CRAPS</option>
              <option value="c">C</option>
            </>
          ) : (
            <>
              <option value="eleven">11</option>
              <option value="e">E</option>
            </>
          )}
        </select>
      ) : null}
      <div className="shooter-rule-chips">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="shooter-chip"
            aria-label={color}
            onClick={() => onChange({ ...rule, dollars: rule.dollars + CHIP_FACE_VALUE[color] })}
          >
            <img src={chipFaceUrl(color)} alt="" draggable={false} />
          </button>
        ))}
      </div>
      <span className="shooter-rule-total">{chipCount(rule.dollars)}</span>
      {rule.locked ? null : (
        <button className="shooter-rule-minus" type="button" aria-label="Remove rule" onClick={onDelete}>
          −
        </button>
      )}
    </div>
  )
}

const RuleList = ({
  title,
  phase,
  rules,
  kinds,
  onAdd,
  onCommit,
  onDelete,
}: {
  title: string
  phase: RulePhase
  rules: readonly ShooterRule[]
  kinds: readonly FeltKind[]
  onAdd: () => void
  onCommit: (rule: ShooterRule) => void
  onDelete: (id: string) => void
}) => (
  <section className="shooter-rule-list" aria-label={phase}>
    <div className="shooter-rule-heading">
      <h3>{title}</h3>
      <button type="button" disabled={rules.length >= SHOOTER_RULE_LIMIT} onClick={onAdd}>
        Add
      </button>
    </div>
    {rules.map((rule) => (
      <RuleRow key={rule.id} rule={rule} kinds={kinds} onChange={onCommit} onDelete={() => onDelete(rule.id)} />
    ))}
  </section>
)

export const ShooterBetsPanel = ({
  settings,
  onChange,
}: {
  settings: ShooterBetSettings
  onChange: (settings: ShooterBetSettings) => void
}) => {
  const [open, setOpen] = useState(false)
  const commit = (phase: RulePhase, next: ShooterRule) => {
    const key = phase === 'comeOut' ? 'comeOut' : 'point'
    const current = settings[key].find((rule) => rule.id === next.id)
    if (
      current
      && current.kind === next.kind
      && current.number === next.number
      && current.spot === next.spot
      && current.dollars !== next.dollars
    ) {
      onChange(setRuleDollars(settings, next.id, next.dollars))
      return
    }
    onChange({ ...settings, [key]: settings[key].map((rule) => (rule.id === next.id ? next : rule)) })
  }
  return (
    <section className="side-panel shooter-bets-panel">
      <button
        className="side-panel-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Bets</span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="side-panel-body">
          <button
            className="dice-control-stack"
            type="button"
            aria-pressed={settings.sameBet}
            onClick={() => onChange({ ...settings, sameBet: !settings.sameBet })}
          >
            <span>Same Bet</span>
            <span>{settings.sameBet ? 'On' : 'Off'}</span>
          </button>
          <div className="shooter-side-switch" role="group" aria-label="Table side">
            <button
              type="button"
              aria-pressed={!settings.darkSide}
              className={settings.darkSide ? '' : 'is-selected'}
              onClick={() => onChange(setTableSide(settings, false))}
            >
              Light Side
            </button>
            <button
              type="button"
              aria-pressed={settings.darkSide}
              className={settings.darkSide ? 'is-selected' : ''}
              onClick={() => onChange(setTableSide(settings, true))}
            >
              Dark Side
            </button>
          </div>
          <RuleList
            title="Come-Out"
            phase="comeOut"
            rules={settings.comeOut}
            kinds={COME_OUT_KINDS}
            onAdd={() => onChange(addRule(settings, 'comeOut', 'field'))}
            onCommit={(rule) => commit('comeOut', rule)}
            onDelete={(id) => onChange(deleteRule(settings, id))}
          />
          <RuleList
            title="Point Phase"
            phase="point"
            rules={settings.point}
            kinds={POINT_KINDS}
            onAdd={() => onChange(addRule(settings, 'point', 'come'))}
            onCommit={(rule) => commit('point', rule)}
            onDelete={(id) => onChange(deleteRule(settings, id))}
          />
        </div>
      ) : null}
    </section>
  )
}
