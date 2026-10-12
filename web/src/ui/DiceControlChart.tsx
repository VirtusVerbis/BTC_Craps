import type { ChartView, HardCount } from './diceControl'

const formatCount = (value: number): string => {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 1) return value.toFixed(1)
  return value.toFixed(2)
}

const hardText = (row: HardCount): string => {
  const fair = `fair ${formatCount(row.fair)}`
  const random = row.random == null ? '' : `, random ${formatCount(row.random)}`
  return `Hard ${row.total} ${formatCount(row.count)} (${fair}${random})`
}

export const DiceControlChart = ({ view }: { view: ChartView }) => {
  const peaks = view.columns.flatMap((column) => [Math.abs(column.gap), Math.abs(column.randomGap ?? 0)])
  const scale = Math.max(0.08, ...peaks)
  return (
    <figure className="dice-control-chart">
      <figcaption className="dice-control-chart-label">
        {view.label}
        <span>{view.n === 1 ? '1 roll' : `${view.n} rolls`}</span>
      </figcaption>
      {view.n === 0 ? (
        <p className="dice-control-chart-empty">No rolls yet.</p>
      ) : (
        <div className="dice-control-columns" aria-hidden="true">
          {view.columns.map((column) => (
            <div className="dice-control-column" key={column.total}>
              <div className="dice-control-track">
                <span className="dice-control-zero" />
                {column.randomGap != null ? (
                  <span
                    className="dice-control-tick"
                    style={{ bottom: `${50 + (column.randomGap / scale) * 50}%` }}
                  />
                ) : null}
                <span
                  className={column.solid ? 'dice-control-bar is-solid' : 'dice-control-bar is-muted'}
                  style={{
                    height: `${(Math.abs(column.gap) / scale) * 50}%`,
                    [column.gap >= 0 ? 'bottom' : 'top']: '50%',
                  }}
                />
              </div>
              <span className="dice-control-total">{column.total}</span>
            </div>
          ))}
        </div>
      )}
      <p className="dice-control-hard">{view.hard.map(hardText).join(' · ')}</p>
    </figure>
  )
}
