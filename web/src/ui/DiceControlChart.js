import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const formatCount = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const hardText = (row) => {
    const fair = `fair ${formatCount(row.fair)}`;
    const random = row.random == null ? '' : `, random ${formatCount(row.random)}`;
    return `Hard ${row.total} ${formatCount(row.count)} (${fair}${random})`;
};
export const DiceControlChart = ({ view }) => {
    const peaks = view.columns.flatMap((column) => [Math.abs(column.gap), Math.abs(column.randomGap ?? 0)]);
    const scale = Math.max(0.08, ...peaks);
    return (_jsxs("figure", { className: "dice-control-chart", children: [_jsxs("figcaption", { className: "dice-control-chart-label", children: [view.label, _jsx("span", { children: view.n === 1 ? '1 roll' : `${view.n} rolls` })] }), view.n === 0 ? (_jsx("p", { className: "dice-control-chart-empty", children: "No rolls yet." })) : (_jsx("div", { className: "dice-control-columns", "aria-hidden": "true", children: view.columns.map((column) => (_jsxs("div", { className: "dice-control-column", children: [_jsxs("div", { className: "dice-control-track", children: [_jsx("span", { className: "dice-control-zero" }), column.randomGap != null ? (_jsx("span", { className: "dice-control-tick", style: { bottom: `${50 + (column.randomGap / scale) * 50}%` } })) : null, _jsx("span", { className: column.solid ? 'dice-control-bar is-solid' : 'dice-control-bar is-muted', style: {
                                        height: `${(Math.abs(column.gap) / scale) * 50}%`,
                                        [column.gap >= 0 ? 'bottom' : 'top']: '50%',
                                    } })] }), _jsx("span", { className: "dice-control-total", children: column.total })] }, column.total))) })), _jsx("p", { className: "dice-control-hard", children: view.hard.map(hardText).join(' · ') })] }));
};
