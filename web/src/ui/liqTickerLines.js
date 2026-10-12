import { formatLiqBtc, formatLiqUsd } from './format';
/** `Longs Liquidated! - 45 BTC  $155M` */
export const liqTickerLine = (side, btc, usd) => {
    const label = side === 'long' ? 'Longs Liquidated!' : 'Shorts Liquidated!';
    return `${label} - ${formatLiqBtc(btc)} BTC  ${formatLiqUsd(usd)}`;
};
/**
 * Lines for one closed bar. Long plays before Short.
 * A side at $0 stays quiet even when the threshold is $1.
 */
export const liqTickerLines = (source, notableUsd) => {
    if (!source || source.liqBarStart == null)
        return [];
    const lines = [];
    const add = (side, btc, usd) => {
        if (btc == null || usd == null || !(usd > 0) || usd < notableUsd)
            return;
        lines.push(liqTickerLine(side, btc, usd));
    };
    add('long', source.longLiqBtc, source.longLiqUsd);
    add('short', source.shortLiqBtc, source.shortLiqUsd);
    return lines;
};
