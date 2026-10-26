import { useState } from 'react'
import { CHIP_FACE_VALUE, chipsForDollars } from './chipBets'
import type { ChipColor } from './chipConstants'
import { chipFaceUrl } from './chips/chipFace'
import { formatLiqUsd } from './format'
import { HORN_NUMBERS } from './crapsPayouts'
import {
  COME_OUT_KINDS,
  CRAPS_SPOTS,
  FELT_LABEL,
  HARD_NUMBERS,
  PLACE_NUMBERS,
  POINT_KINDS,
  SHOOTER_RULE_LIMIT,
  addBlankRule,
  deleteRule,
  firstFreeVariant,
  kindExhausted,
  minimumDollars,
  ruleMinusAction,
  setRuleDollars,
  setTableSide,
  variantTaken,
  withLockedRule,
  type FeltKind,
  type RulePhase,
  type ShooterBetSettings,
  type ShooterRule,
} from './shooterSlip'

const COLORS: readonly ChipColor[] = ['white', 'red', 'green', 'blue', 'black']
const NUMBERED = new Set<FeltKind>(['place', 'lay', 'hard', 'hornNumber', 'comeOdds', 'dontComeOdds'])

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
  rules,
  kinds,
  onChange,
  onDelete,
  onReset,
}: {
  rule: ShooterRule
  rules: readonly ShooterRule[]
  kinds: readonly FeltKind[]
  onChange: (rule: ShooterRule) => void
  onDelete: () => void
  onReset: () => void
}) => {
  const numbers = rule.kind ? numbersFor(rule.kind) : []
  const minus = ruleMinusAction(rule)
  const takenNumber = (number: number) =>
    rule.kind != null && variantTaken(rules, rule.id, rule.kind, number, rule.spot) && number !== rule.number
  return (
    <div className="shooter-rule">
      <select
        aria-label="Bet"
        disabled={rule.locked}
        value={rule.kind ?? ''}
        onChange={(event) => {
          const value = event.target.value
          if (value === '' || rule.kind === value) return
          const kind = value as FeltKind
          const variant = firstFreeVariant(rules, rule.id, kind)
          onChange({
            ...rule,
            kind,
            number: variant.number,
            spot: variant.spot,
            dollars: minimumDollars(kind, variant.number),
          })
        }}
      >
        {rule.kind == null ? <option value=""> </option> : null}
        {kinds.map((kind) => (
          <option key={kind} value={kind} disabled={kindExhausted(rules, rule.id, kind)}>
            {FELT_LABEL[kind]}
          </option>
        ))}
      </select>
      {rule.kind != null && numbers.length > 0 ? (
        <select
          aria-label="Number"
          value={rule.number ?? numbers[0]}
          onChange={(event) => onChange({ ...rule, number: Number(event.target.value) })}
        >
          {numbers.map((number) => (
            <option key={number} value={number} disabled={takenNumber(number)}>
              {number}
            </option>
          ))}
        </select>
      ) : null}
      {rule.kind === 'anyCraps' ? (
        <select
          aria-label="Spot"
          value={rule.spot ?? 'craps'}
          onChange={(event) => onChange({ ...rule, spot: event.target.value })}
        >
          {CRAPS_SPOTS.map((spot) => (
            <option
              key={spot}
              value={spot}
              disabled={variantTaken(rules, rule.id, 'anyCraps', null, spot) && rule.spot !== spot}
            >
              {spot === 'craps' ? 'CRAPS' : 'C'}
            </option>
          ))}
        </select>
      ) : null}
      {rule.kind == null ? null : (
        <>
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
        </>
      )}
      {minus === 'none' ? null : (
        <button
          className="shooter-rule-minus"
          type="button"
          aria-label={minus === 'reset' ? 'Reset bet' : 'Remove rule'}
          onClick={minus === 'reset' ? onReset : onDelete}
        >
          − {minus === 'reset' ? 'Reset' : 'Delete'}
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
  onReset,
}: {
  title: string
  phase: RulePhase
  rules: readonly ShooterRule[]
  kinds: readonly FeltKind[]
  onAdd: () => void
  onCommit: (rule: ShooterRule) => void
  onDelete: (id: string) => void
  onReset: (rule: ShooterRule) => void
}) => (
  <section className="shooter-rule-list" aria-label={phase}>
    <div className="shooter-rule-heading">
      <h3>{title}</h3>
      <button
        type="button"
        disabled={rules.length >= SHOOTER_RULE_LIMIT || rules.some((rule) => rule.kind == null)}
        onClick={onAdd}
      >
        Add
      </button>
    </div>
    {rules.map((rule) => (
      <RuleRow
        key={rule.id}
        rule={rule}
        rules={rules}
        kinds={kinds}
        onChange={onCommit}
        onDelete={() => onDelete(rule.id)}
        onReset={() => onReset(rule)}
      />
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
    onChange(withLockedRule({ ...settings, [key]: settings[key].map((rule) => (rule.id === next.id ? next : rule)) }))
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
            onAdd={() => onChange(addBlankRule(settings, 'comeOut'))}
            onCommit={(rule) => commit('comeOut', rule)}
            onDelete={(id) => onChange(deleteRule(settings, id))}
            onReset={(rule) => {
              if (rule.kind == null) return
              onChange(setRuleDollars(settings, rule.id, minimumDollars(rule.kind, rule.number)))
            }}
          />
          <RuleList
            title="Point Phase"
            phase="point"
            rules={settings.point}
            kinds={POINT_KINDS}
            onAdd={() => onChange(addBlankRule(settings, 'point'))}
            onCommit={(rule) => commit('point', rule)}
            onDelete={(id) => onChange(deleteRule(settings, id))}
            onReset={(rule) => {
              if (rule.kind == null) return
              onChange(setRuleDollars(settings, rule.id, minimumDollars(rule.kind, rule.number)))
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
