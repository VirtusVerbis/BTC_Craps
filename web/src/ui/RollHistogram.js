import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { BONUS_CIRCLE_COLOR, BONUS_CIRCLE_DIAMETER_PX, BONUS_CIRCLE_FLASH_MS } from './bonusConstants';
import { HISTOGRAM_COLUMN_WIDTH_FRACTION, HISTOGRAM_COUNT_FONT_RATIO, HISTOGRAM_HEIGHT, HISTOGRAM_NUMBER_FONT_PX, HISTOGRAM_ORANGE, HISTOGRAM_PLATE_ALPHA, HISTOGRAM_WIDTH, HISTOGRAM_X, HISTOGRAM_Y, } from './histogramConstants';
import { histogramColumns } from './histogramModel';
export const RollHistogram = ({ rolls, reveal, animate, transitionMs, hits, flashing, }) => {
    const columns = histogramColumns(rolls);
    const countFontPx = HISTOGRAM_NUMBER_FONT_PX * HISTOGRAM_COUNT_FONT_RATIO;
    const columnsRef = useRef(null);
    const [aboveTotals, setAboveTotals] = useState(() => new Set());
    useLayoutEffect(() => {
        const root = columnsRef.current;
        if (!root)
            return;
        const bars = Array.from(root.querySelectorAll('.roll-histogram-bar'));
        const measure = () => {
            const above = new Set();
            for (const bar of bars) {
                if (bar.offsetHeight < countFontPx)
                    above.add(Number(bar.dataset.total));
            }
            setAboveTotals((current) => {
                if (current.size === above.size && [...above].every((total) => current.has(total)))
                    return current;
                return above;
            });
        };
        const observer = new ResizeObserver(measure);
        for (const bar of bars)
            observer.observe(bar);
        measure();
        return () => observer.disconnect();
    }, [rolls, countFontPx]);
    const sheetStyle = {
        transform: `translateY(${(1 - reveal) * 100}%)`,
        transition: animate ? `transform ${transitionMs}ms linear` : 'none',
        backgroundColor: `rgba(0, 0, 0, ${HISTOGRAM_PLATE_ALPHA})`,
    };
    return (_jsx("div", { className: "roll-histogram", style: {
            left: HISTOGRAM_X,
            top: HISTOGRAM_Y,
            width: HISTOGRAM_WIDTH,
            height: HISTOGRAM_HEIGHT,
        }, children: _jsx("div", { className: "roll-histogram-sheet", "data-reveal": reveal.toFixed(3), style: {
                ...sheetStyle,
                ['--bonus-circle']: `${BONUS_CIRCLE_DIAMETER_PX}px`,
                ['--bonus-circle-color']: BONUS_CIRCLE_COLOR,
                ['--bonus-flash-half']: `${BONUS_CIRCLE_FLASH_MS}ms`,
            }, children: _jsx("div", { className: "roll-histogram-columns", ref: columnsRef, style: { ['--histogram-count-font']: `${countFontPx}px` }, children: columns.map((column) => (_jsxs("div", { className: "roll-histogram-slot", children: [_jsx("div", { className: "roll-histogram-track", children: column.scale > 0 ? (_jsx("div", { className: "roll-histogram-bar", "data-total": column.total, style: {
                                    height: `${column.scale * 100}%`,
                                    width: `${HISTOGRAM_COLUMN_WIDTH_FRACTION * 100}%`,
                                    background: HISTOGRAM_ORANGE,
                                }, children: _jsx("span", { className: aboveTotals.has(column.total) ? 'roll-histogram-count is-above' : 'roll-histogram-count', children: column.count }) })) : null }), _jsxs("div", { className: "roll-histogram-number", style: { fontSize: HISTOGRAM_NUMBER_FONT_PX, color: HISTOGRAM_ORANGE }, children: [hits.includes(column.total) ? (_jsx("span", { className: flashing.includes(column.total) ? 'bonus-circle is-flashing' : 'bonus-circle' })) : null, _jsx("span", { className: "roll-histogram-digit", children: column.total })] })] }, column.total))) }) }) }));
};
