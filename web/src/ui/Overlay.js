import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useLiqCountdown, useOpenInterest } from '../data/openInterest';
import { mobileAssetManifest } from './mobileAssetManifest';
import { resolveMobileAssetUrl } from './mobileAssetUrls';
import { formatElapsed, formatExchangePriceLabel, formatLiqBtc, formatLiqUsd } from './format';
import { HotShooterTicker } from './HotShooterTicker';
import { LiqTicker } from './LiqTicker';
import { NewShooterBanner } from './NewShooterBanner';
import { LIQ_LABEL_X, LIQ_LABEL_Y, OI_LABEL_FONT_REM, OI_LABEL_X, OI_LABEL_Y } from './overlayConstants';
import { SHOOTER_ON } from './characterBetConstants';
import { formatAllSmall, formatAllTall, formatMakeEmAll, formatShooterPnl, shooterFigureColor, } from './shooterProfile';
import { ROLL_STREAK_COLORS, formatRollStreak, rollStreakColorIndex, rollStreakColorStep, rollStreakNeedsRainbow, } from './rollStreak';
const RollStreakLabel = ({ view }) => {
    const rainbow = rollStreakNeedsRainbow(view.current);
    const [step, setStep] = useState(0);
    const text = formatRollStreak(view.current, view.longest);
    useEffect(() => {
        if (!rainbow)
            return undefined;
        const startedAt = performance.now();
        let frame = 0;
        const tick = (now) => {
            const next = rollStreakColorStep(now - startedAt);
            setStep((current) => (current === next ? current : next));
            frame = window.requestAnimationFrame(tick);
        };
        setStep(0);
        frame = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frame);
    }, [rainbow]);
    return (_jsx("p", { className: rainbow ? 'shooter-hud shooter-hud-pnl roll-streak' : 'shooter-hud roll-streak', style: { fontSize: `${OI_LABEL_FONT_REM}rem` }, children: text.split('').map((char, index) => (_jsx("span", { className: "roll-streak-char", style: rainbow
                ? { color: ROLL_STREAK_COLORS[rollStreakColorIndex(index, step, ROLL_STREAK_COLORS.length)] }
                : undefined, children: char }, `${text.length}-${index}`))) }));
};
const exchangeMaxVolume = (buyVolume, sellVolume) => Math.max(buyVolume, sellVolume, 1);
const PRICE_GRAY = '#757575';
const PRICE_WHITE = '#ffffff';
const PRICE_GREEN = '#4caf50';
const PRICE_RED = '#f44336';
const PRICE_COLOR_HOLD_MS = 500;
const isDirectionalPriceColor = (color) => color === PRICE_GREEN || color === PRICE_RED;
const priceColorFromMobileRule = (unavailable, currentPrice, previousPrice) => {
    if (unavailable)
        return PRICE_GRAY;
    if (previousPrice === undefined)
        return PRICE_WHITE;
    if (currentPrice > previousPrice)
        return PRICE_GREEN;
    if (currentPrice < previousPrice)
        return PRICE_RED;
    return PRICE_WHITE;
};
const deriveEffectiveStatus = (raw, price, buyVolume, sellVolume) => {
    if (raw === 'connected' || raw === 'connecting')
        return raw;
    const hasLiveData = (Number.isFinite(price) && price > 0) || buyVolume > 0 || sellVolume > 0;
    return hasLiveData ? 'connected' : 'disconnected';
};
const FeedGlyph = ({ status }) => {
    const on = status === 'connected';
    const color = on ? '#4caf50' : status === 'connecting' ? '#ffc107' : '#757575';
    return (_jsx("span", { className: "feed-glyph", style: { color }, title: status, "aria-hidden": true, children: _jsx("svg", { className: "feed-glyph-svg", viewBox: "0 0 24 24", role: "img", "aria-label": "wifi status", children: _jsx("path", { fill: "currentColor", d: "M12 18.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm0-2.8a5.9 5.9 0 0 1 4.2 1.8l1.3-1.4a7.8 7.8 0 0 0-11 0l1.3 1.4A5.9 5.9 0 0 1 12 15.7Zm0-4.4a10.2 10.2 0 0 1 7.3 3l1.3-1.4a12.1 12.1 0 0 0-17.2 0l1.3 1.4a10.2 10.2 0 0 1 7.3-3Zm0-4.4c-4 0-7.8 1.6-10.6 4.4L2.7 8.7a14.9 14.9 0 0 1 18.6 0l1.3-1.4A14.8 14.8 0 0 0 12 6.9Z" }) }) }));
};
const VolumeBar = ({ volume, maxVolume, color, alignEnd, animate, }) => {
    const p = maxVolume > 0 ? Math.min(1, volume / maxVolume) : 0;
    const [pulse, setPulse] = useState(1);
    useEffect(() => {
        if (!animate)
            return;
        setPulse(1.15);
        const t = window.setTimeout(() => setPulse(1), 300);
        return () => window.clearTimeout(t);
    }, [animate, volume]);
    const w = Math.min(1, p * pulse);
    return (_jsx("div", { className: `volume-bar-track ${alignEnd ? 'volume-bar-track-end' : ''}`, children: _jsx("div", { className: "volume-bar-fill", style: {
                width: `${w * 100}%`,
                backgroundColor: color,
                marginLeft: alignEnd ? 'auto' : 0,
            } }) }));
};
const formatOpenInterest = (value) => Math.round(value).toLocaleString('en-US');
const formatAccountPct = (value) => `${Math.round(value)}%`;
export const Overlay = ({ market, block, onTimeClick, shooter, bonusStakes, rollStreak, shooterMode, status, }) => {
    const makeEmAll = SHOOTER_ON ? formatMakeEmAll(shooter.allWorking) : null;
    const allTall = formatAllTall(bonusStakes.tall);
    const allSmall = formatAllSmall(bonusStakes.small);
    const openInterest = useOpenInterest();
    const liqCountdown = useLiqCountdown(openInterest?.liqBarStart ?? null);
    const longLiqBtc = openInterest?.longLiqBtc;
    const shortLiqBtc = openInterest?.shortLiqBtc;
    const longLiqUsd = openInterest?.longLiqUsd;
    const shortLiqUsd = openInterest?.shortLiqUsd;
    const binanceMaxV = exchangeMaxVolume(market.binance.buyVolume, market.binance.sellVolume);
    const coinbaseMaxV = exchangeMaxVolume(market.coinbase.buyVolume, market.coinbase.sellVolume);
    const prevBinance = useRef(undefined);
    const prevCoinbase = useRef(undefined);
    const prevBinBuy = useRef(undefined);
    const prevBinSell = useRef(undefined);
    const prevCbBuy = useRef(undefined);
    const prevCbSell = useRef(undefined);
    const [binPulse, setBinPulse] = useState(false);
    const [cbPulse, setCbPulse] = useState(false);
    const [binanceDisplayColor, setBinanceDisplayColor] = useState(PRICE_WHITE);
    const [coinbaseDisplayColor, setCoinbaseDisplayColor] = useState(PRICE_WHITE);
    const binanceHoldUntilRef = useRef(0);
    const coinbaseHoldUntilRef = useRef(0);
    const binanceHoldTimerRef = useRef(null);
    const coinbaseHoldTimerRef = useRef(null);
    useEffect(() => {
        const bBuy = market.binance.buyVolume;
        const bSell = market.binance.sellVolume;
        if (bBuy !== prevBinBuy.current || bSell !== prevBinSell.current) {
            setBinPulse(true);
            const t = window.setTimeout(() => setBinPulse(false), 320);
            prevBinBuy.current = bBuy;
            prevBinSell.current = bSell;
            return () => window.clearTimeout(t);
        }
        return undefined;
    }, [market.binance.buyVolume, market.binance.sellVolume]);
    useEffect(() => {
        const cBuy = market.coinbase.buyVolume;
        const cSell = market.coinbase.sellVolume;
        if (cBuy !== prevCbBuy.current || cSell !== prevCbSell.current) {
            setCbPulse(true);
            const t = window.setTimeout(() => setCbPulse(false), 320);
            prevCbBuy.current = cBuy;
            prevCbSell.current = cSell;
            return () => window.clearTimeout(t);
        }
        return undefined;
    }, [market.coinbase.buyVolume, market.coinbase.sellVolume]);
    const binPriceLabel = formatExchangePriceLabel(market.binance.price);
    const cbPriceLabel = formatExchangePriceLabel(market.coinbase.price);
    const effectiveBinStatus = deriveEffectiveStatus(status.binance, market.binance.price, market.binance.buyVolume, market.binance.sellVolume);
    const effectiveCbStatus = deriveEffectiveStatus(status.coinbase, market.coinbase.price, market.coinbase.buyVolume, market.coinbase.sellVolume);
    const pBin = market.binance.price;
    const prevBin = prevBinance.current;
    const binanceUnavailable = binPriceLabel === 'Unavailable';
    const binanceColor = priceColorFromMobileRule(binanceUnavailable, pBin, prevBin);
    const pCb = market.coinbase.price;
    const prevCb = prevCoinbase.current;
    const coinbaseUnavailable = cbPriceLabel === 'Unavailable';
    const coinbaseColor = priceColorFromMobileRule(coinbaseUnavailable, pCb, prevCb);
    useEffect(() => {
        if (binanceHoldTimerRef.current !== null) {
            window.clearTimeout(binanceHoldTimerRef.current);
            binanceHoldTimerRef.current = null;
        }
        const now = Date.now();
        if (binanceColor === PRICE_GRAY) {
            binanceHoldUntilRef.current = 0;
            setBinanceDisplayColor(PRICE_GRAY);
            return;
        }
        if (isDirectionalPriceColor(binanceColor)) {
            binanceHoldUntilRef.current = now + PRICE_COLOR_HOLD_MS;
            setBinanceDisplayColor(binanceColor);
            return;
        }
        const remaining = binanceHoldUntilRef.current - now;
        setBinanceDisplayColor((current) => {
            if (isDirectionalPriceColor(current) && remaining > 0) {
                binanceHoldTimerRef.current = window.setTimeout(() => {
                    setBinanceDisplayColor((activeColor) => {
                        if (isDirectionalPriceColor(activeColor) && Date.now() >= binanceHoldUntilRef.current) {
                            return PRICE_WHITE;
                        }
                        return activeColor;
                    });
                    binanceHoldTimerRef.current = null;
                }, remaining);
                return current;
            }
            binanceHoldUntilRef.current = 0;
            return binanceColor;
        });
    }, [binanceColor]);
    useEffect(() => {
        if (coinbaseHoldTimerRef.current !== null) {
            window.clearTimeout(coinbaseHoldTimerRef.current);
            coinbaseHoldTimerRef.current = null;
        }
        const now = Date.now();
        if (coinbaseColor === PRICE_GRAY) {
            coinbaseHoldUntilRef.current = 0;
            setCoinbaseDisplayColor(PRICE_GRAY);
            return;
        }
        if (isDirectionalPriceColor(coinbaseColor)) {
            coinbaseHoldUntilRef.current = now + PRICE_COLOR_HOLD_MS;
            setCoinbaseDisplayColor(coinbaseColor);
            return;
        }
        const remaining = coinbaseHoldUntilRef.current - now;
        setCoinbaseDisplayColor((current) => {
            if (isDirectionalPriceColor(current) && remaining > 0) {
                coinbaseHoldTimerRef.current = window.setTimeout(() => {
                    setCoinbaseDisplayColor((activeColor) => {
                        if (isDirectionalPriceColor(activeColor) && Date.now() >= coinbaseHoldUntilRef.current) {
                            return PRICE_WHITE;
                        }
                        return activeColor;
                    });
                    coinbaseHoldTimerRef.current = null;
                }, remaining);
                return current;
            }
            coinbaseHoldUntilRef.current = 0;
            return coinbaseColor;
        });
    }, [coinbaseColor]);
    useEffect(() => {
        if (!binanceUnavailable && Number.isFinite(pBin) && pBin > 0) {
            prevBinance.current = pBin;
        }
    }, [binanceUnavailable, pBin]);
    useEffect(() => {
        if (!coinbaseUnavailable && Number.isFinite(pCb) && pCb > 0) {
            prevCoinbase.current = pCb;
        }
    }, [coinbaseUnavailable, pCb]);
    useEffect(() => () => {
        if (binanceHoldTimerRef.current !== null) {
            window.clearTimeout(binanceHoldTimerRef.current);
        }
        if (coinbaseHoldTimerRef.current !== null) {
            window.clearTimeout(coinbaseHoldTimerRef.current);
        }
    }, []);
    const hudBg = mobileAssetManifest.hudBackground;
    return (_jsxs("div", { className: "overlay", children: [hudBg ? (_jsx("img", { className: "overlay-hud-bg", src: resolveMobileAssetUrl(hudBg), alt: "", draggable: false })) : null, _jsxs("div", { className: "overlay-row", children: [_jsxs("div", { className: "overlay-column overlay-column-start", children: [_jsxs("p", { className: "overlay-label", children: ["Binance ", _jsx("span", { className: "overlay-ticker", children: "(BTC-USDT)" }), " ", _jsx(FeedGlyph, { status: effectiveBinStatus })] }), _jsx("p", { className: "overlay-price", style: { color: binanceDisplayColor }, children: binanceUnavailable ? binPriceLabel : `$${binPriceLabel}` }), _jsx(VolumeBar, { volume: market.binance.buyVolume, maxVolume: binanceMaxV, color: "#4caf50", alignEnd: false, animate: binPulse }), _jsx(VolumeBar, { volume: market.binance.sellVolume, maxVolume: binanceMaxV, color: "#f44336", alignEnd: false, animate: binPulse }), SHOOTER_ON && shooter.pnl.shown ? (_jsxs("p", { className: "shooter-hud shooter-hud-pnl", style: { fontSize: `${OI_LABEL_FONT_REM}rem` }, children: [_jsx("span", { className: "shooter-hud-tag", children: "P/L " }), _jsx("span", { style: { color: shooterFigureColor(shooter) }, children: formatShooterPnl(shooter) })] })) : null, SHOOTER_ON ? _jsx(RollStreakLabel, { view: rollStreak }) : null] }), _jsxs("button", { className: "time-button", type: "button", onClick: onTimeClick, children: [_jsx("span", { className: "overlay-label time-label", children: "Time" }), _jsx("span", { className: `time-block-height ${block.blockFlashOn ? 'flash' : ''}`, children: block.blockHeight === null ? '—' : block.blockHeight }), _jsx("span", { className: `time-elapsed ${block.staleFlashOn ? 'flash' : 'subtle'}`, children: formatElapsed(block.elapsedMs) })] }), _jsxs("div", { className: "overlay-column overlay-column-end", children: [_jsxs("p", { className: "overlay-label overlay-label-end", children: ["Coinbase ", _jsx("span", { className: "overlay-ticker", children: "(BTC-USD)" }), " ", _jsx(FeedGlyph, { status: effectiveCbStatus })] }), _jsx("p", { className: "overlay-price", style: { color: coinbaseDisplayColor }, children: coinbaseUnavailable ? cbPriceLabel : `$${cbPriceLabel}` }), _jsx(VolumeBar, { volume: market.coinbase.buyVolume, maxVolume: coinbaseMaxV, color: "#4caf50", alignEnd: true, animate: cbPulse }), _jsx(VolumeBar, { volume: market.coinbase.sellVolume, maxVolume: coinbaseMaxV, color: "#f44336", alignEnd: true, animate: cbPulse }), makeEmAll ? (_jsx("p", { className: "shooter-hud shooter-hud-end", style: { fontSize: `${OI_LABEL_FONT_REM}rem` }, children: makeEmAll })) : null, allTall ? (_jsx("p", { className: "shooter-hud shooter-hud-end", style: { fontSize: `${OI_LABEL_FONT_REM}rem` }, children: allTall })) : null, allSmall ? (_jsx("p", { className: "shooter-hud shooter-hud-end", style: { fontSize: `${OI_LABEL_FONT_REM}rem` }, children: allSmall })) : null] })] }), _jsxs("div", { className: "overlay-oi", style: {
                    left: OI_LABEL_X,
                    top: OI_LABEL_Y,
                    fontSize: `${OI_LABEL_FONT_REM}rem`,
                }, children: [_jsxs("p", { children: ["O/I : ", openInterest ? formatOpenInterest(openInterest.openInterest) : '—'] }), _jsxs("p", { children: ["Long ", openInterest ? formatAccountPct(openInterest.longPct) : '—', " (Pass)"] }), _jsxs("p", { children: ["Short ", openInterest ? formatAccountPct(openInterest.shortPct) : '—', " (Don't)"] })] }), SHOOTER_ON ? _jsx(HotShooterTicker, { current: rollStreak.current }) : null, _jsx(NewShooterBanner, { enabled: shooterMode }), _jsx(LiqTicker, { snapshot: openInterest }), _jsxs("div", { className: "overlay-oi overlay-liq", style: {
                    left: LIQ_LABEL_X,
                    top: LIQ_LABEL_Y,
                    fontSize: `${OI_LABEL_FONT_REM}rem`,
                }, children: [_jsxs("p", { children: ["next ", liqCountdown] }), _jsxs("p", { className: "overlay-liq-row", children: [_jsx("span", { children: "Long liq" }), _jsx("span", { children: longLiqBtc == null ? '—' : `${formatLiqBtc(longLiqBtc)} BTC` }), _jsx("span", { children: longLiqUsd == null ? '—' : formatLiqUsd(longLiqUsd) })] }), _jsxs("p", { className: "overlay-liq-row", children: [_jsx("span", { children: "Short liq" }), _jsx("span", { children: shortLiqBtc == null ? '—' : `${formatLiqBtc(shortLiqBtc)} BTC` }), _jsx("span", { children: shortLiqUsd == null ? '—' : formatLiqUsd(shortLiqUsd) })] })] })] }));
};
