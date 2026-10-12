import { useEffect, useRef, useState } from 'react';
import { DIE_VOLUME_WINDOW_MS } from './diceConstants';
const emptyTotals = () => ({
    binanceBuy: 0,
    binanceSell: 0,
    coinbaseBuy: 0,
    coinbaseSell: 0,
});
/**
 * Trailing buy/sell totals for the dice. A drop in the overlay accumulator is a reset,
 * so the new value is the delta. The overlay's own 5s window is left alone.
 */
export const useDiceVolumeWindow = (market) => {
    const prev = useRef(null);
    const samples = useRef([]);
    const [totals, setTotals] = useState(emptyTotals);
    useEffect(() => {
        const current = {
            binanceBuy: market.binance.buyVolume,
            binanceSell: market.binance.sellVolume,
            coinbaseBuy: market.coinbase.buyVolume,
            coinbaseSell: market.coinbase.sellVolume,
        };
        const prior = prev.current;
        prev.current = current;
        if (!prior)
            return;
        const delta = (next, old) => (next >= old ? next - old : next);
        const now = performance.now();
        samples.current.push({
            t: now,
            binanceBuy: delta(current.binanceBuy, prior.binanceBuy),
            binanceSell: delta(current.binanceSell, prior.binanceSell),
            coinbaseBuy: delta(current.coinbaseBuy, prior.coinbaseBuy),
            coinbaseSell: delta(current.coinbaseSell, prior.coinbaseSell),
        });
        const cutoff = now - DIE_VOLUME_WINDOW_MS;
        samples.current = samples.current.filter((sample) => sample.t >= cutoff);
        const sum = samples.current.reduce((acc, sample) => ({
            binanceBuy: acc.binanceBuy + sample.binanceBuy,
            binanceSell: acc.binanceSell + sample.binanceSell,
            coinbaseBuy: acc.coinbaseBuy + sample.coinbaseBuy,
            coinbaseSell: acc.coinbaseSell + sample.coinbaseSell,
        }), emptyTotals());
        setTotals(sum);
    }, [market]);
    return totals;
};
