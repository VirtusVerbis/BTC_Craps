import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from './config/constants';
import { fetchBinanceBtc1mKlines } from './data/candles';
import { BlockHeightService } from './data/blockHeight';
import { MarketDataService } from './data/marketData';
import { emptyCharacterPnl } from './ui/characterPnl';
import { emptyBonusStakes, loadShooterBook } from './ui/shooterProfile';
import { loadDieColor, nextDieColor, saveDieColor } from './ui/diceColor';
import { emptyRollStreakView } from './ui/rollStreak';
import { CrapsScene } from './ui/CrapsScene';
import { Overlay } from './ui/Overlay';
import { SplashSequence } from './ui/SplashSequence';
import { Stage } from './ui/Stage';
import { BG2_MAX_CANDLES } from './ui/androidMirrorConstants';
import { useBg2ChartVisible } from './ui/useBg2ChartVisibility';
import { useBg2MemeState } from './ui/useBg2MemeState';
import { BONUS_FLASH_MS, BONUS_LABEL_EXTRA_MS } from './ui/bonusConstants';
import { applyBonusRoll, bonusFlashTotals, emptyBonusHand } from './ui/bonusCraps';
import { bonusTestHand, isBonusTestSeed } from './ui/bonusTest';
import { loadHistogramRolls, pushRoll, saveHistogramRolls } from './ui/histogramModel';
import { useDiceThrow } from './ui/useDiceThrow';
import { loadDiceControlBook, loadDiceControlSettings, recordDiceControlRoll, saveDiceControlBook, saveDiceControlSettings, } from './ui/diceControl';
import { DiceControlHistogram, DiceControlPanel } from './ui/DiceControlPanel';
import { ShooterScrollNote } from './ui/ShooterScrollNote';
import { useShooterGesture, useShooterPageLock } from './ui/useShooterGesture';
import { useHistogramVisibility } from './ui/useHistogramVisibility';
import { useFg3CatState } from './ui/useFg3CatState';
import { useVideoOverlayState } from './ui/useVideoOverlayState';
import { VideoOverlay } from './ui/VideoOverlay';
const emptyMarket = () => ({
    binance: {
        exchange: 'binance',
        price: 0,
        buyVolume: 0,
        sellVolume: 0,
        updatedAt: 0,
    },
    coinbase: {
        exchange: 'coinbase',
        price: 0,
        buyVolume: 0,
        sellVolume: 0,
        updatedAt: 0,
    },
});
const initialFeedUpdate = {
    market: emptyMarket(),
    status: {
        binance: 'disconnected',
        coinbase: 'disconnected',
    },
};
const initialBlockState = {
    blockHeight: null,
    elapsedMs: 0,
    blockFlashOn: false,
    staleFlashOn: false,
};
const GITHUB_MARK_PATH = 'M12 .5C5.65.5.5 5.67.5 12.03c0 5.11 3.3 9.45 7.88 10.98.58.1.8-.25.8-.56 0-.27-.01-1.16-.02-2.1-3.2.71-3.87-1.38-3.87-1.38-.52-1.36-1.28-1.72-1.28-1.72-1.04-.73.08-.72.08-.72 1.15.08 1.76 1.2 1.76 1.2 1.02 1.78 2.68 1.26 3.33.96.1-.76.4-1.26.72-1.55-2.55-.3-5.23-1.3-5.23-5.8 0-1.28.45-2.33 1.18-3.15-.12-.3-.51-1.5.11-3.13 0 0 .97-.32 3.17 1.2a10.8 10.8 0 0 1 5.77 0c2.2-1.52 3.16-1.2 3.16-1.2.63 1.63.24 2.83.12 3.13.73.82 1.17 1.87 1.17 3.15 0 4.51-2.68 5.49-5.24 5.78.42.37.78 1.09.78 2.2 0 1.6-.01 2.88-.01 3.27 0 .31.21.67.81.56A11.55 11.55 0 0 0 23.5 12.03C23.5 5.67 18.35.5 12 .5Z';
const GitHubMark = () => (_jsx("svg", { className: "repo-link-icon", viewBox: "0 0 24 24", role: "img", "aria-hidden": "true", focusable: "false", children: _jsx("path", { fill: "currentColor", d: GITHUB_MARK_PATH }) }));
function App() {
    const appShellRef = useRef(null);
    const stageAnchorRef = useRef(null);
    const stageRef = useRef(null);
    const displayRef = useRef(null);
    const shooterControlsRef = useRef(null);
    const [diceControl, setDiceControl] = useState(loadDiceControlSettings);
    const diceControlRef = useRef(diceControl);
    diceControlRef.current = diceControl;
    const [diceControlBook, setDiceControlBook] = useState(loadDiceControlBook);
    const onDiceControl = useCallback((next) => {
        setDiceControl(next);
        saveDiceControlSettings(next);
    }, []);
    const onDiceControlRoll = useCallback((roll) => {
        setDiceControlBook((current) => {
            const next = recordDiceControlRoll(current, roll);
            saveDiceControlBook(next);
            return next;
        });
    }, []);
    const [manualShooter, setManualShooter] = useState(false);
    const [splashDone, setSplashDone] = useState(false);
    const onSplashDone = useCallback(() => setSplashDone(true), []);
    const [feed, setFeed] = useState(initialFeedUpdate);
    const [blockState, setBlockState] = useState(initialBlockState);
    const [candles, setCandles] = useState([]);
    const [sceneWidthPx, setSceneWidthPx] = useState(REFERENCE_WIDTH);
    const [sceneHeightPx, setSceneHeightPx] = useState(REFERENCE_HEIGHT);
    const [displayWidthPx, setDisplayWidthPx] = useState(REFERENCE_WIDTH);
    useLayoutEffect(() => {
        const el = stageAnchorRef.current;
        const display = displayRef.current;
        if (!el)
            return;
        const measure = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            setSceneWidthPx(w > 0 ? w : REFERENCE_WIDTH);
            setSceneHeightPx(h > 0 ? h : REFERENCE_HEIGHT);
            const dw = display?.getBoundingClientRect().width ?? 0;
            if (dw > 0)
                setDisplayWidthPx(dw);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        if (display)
            ro.observe(display);
        return () => ro.disconnect();
    }, []);
    const setFeedRef = useRef(setFeed);
    setFeedRef.current = setFeed;
    const bg2Meme = useBg2MemeState(feed.market.binance.price, feed.market.coinbase.price, manualShooter);
    const hasActiveBg2Meme = bg2Meme.activeMeme !== null;
    const videoOverlay = useVideoOverlayState(manualShooter);
    const isVideoActive = videoOverlay.isVideoActive;
    const bg2Visible = useBg2ChartVisible(hasActiveBg2Meme || isVideoActive);
    const fg3 = useFg3CatState(manualShooter);
    const [dieColor, setDieColor] = useState(loadDieColor);
    const onTimeClick = useCallback(() => {
        setDieColor((current) => {
            const next = nextDieColor(current);
            saveDieColor(next);
            return next;
        });
    }, []);
    const [rolls, setRolls] = useState(loadHistogramRolls);
    useEffect(() => {
        saveHistogramRolls(rolls);
    }, [rolls]);
    const [bonusHits, setBonusHits] = useState([]);
    const [bonusFlashing, setBonusFlashing] = useState([]);
    const [bonusLines, setBonusLines] = useState([]);
    const [histogramBoost, setHistogramBoost] = useState(0);
    const bonusHandRef = useRef(emptyBonusHand());
    const bonusFlashTimer = useRef(undefined);
    const onCountedRoll = useCallback((result) => {
        if (!('total' in result)) {
            setBonusLines([]);
            return 0;
        }
        setRolls((current) => pushRoll(current, result.total));
        const step = applyBonusRoll(bonusHandRef.current, result.total);
        bonusHandRef.current = step.hand;
        setBonusHits(step.hand.hits);
        setBonusLines(step.lines);
        if (step.flash) {
            setBonusFlashing(bonusFlashTotals(step.flash));
            setHistogramBoost((current) => current + 1);
            window.clearTimeout(bonusFlashTimer.current);
            bonusFlashTimer.current = window.setTimeout(() => setBonusFlashing([]), BONUS_FLASH_MS);
        }
        else if (result.total === 7) {
            window.clearTimeout(bonusFlashTimer.current);
            setBonusFlashing([]);
        }
        return step.lines.length > 0 ? BONUS_LABEL_EXTRA_MS : 0;
    }, []);
    useEffect(() => () => window.clearTimeout(bonusFlashTimer.current), []);
    const armBonusTest = useCallback((seed) => {
        const hand = bonusTestHand(seed);
        bonusHandRef.current = hand;
        setBonusHits(hand.hits);
        setBonusLines([]);
        setBonusFlashing([]);
        window.clearTimeout(bonusFlashTimer.current);
    }, []);
    useEffect(() => {
        if (!import.meta.env.DEV)
            return;
        window.btcCrapsBonus = { arm: armBonusTest };
        const params = new URLSearchParams(window.location.search);
        const seed = params.get('bonus');
        if (isBonusTestSeed(seed)) {
            armBonusTest(seed);
            params.delete('bonus');
            const query = params.toString();
            window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
        }
        return () => {
            delete window.btcCrapsBonus;
        };
    }, [armBonusTest]);
    const histogram = useHistogramVisibility(splashDone, histogramBoost);
    const dice = useDiceThrow(feed.market, splashDone, rolls, onCountedRoll, bonusHandRef, manualShooter, shooterControlsRef, diceControlRef, onDiceControlRoll);
    const gestureReady = manualShooter && dice?.phase === 'holding';
    useShooterGesture(gestureReady, stageRef, shooterControlsRef);
    useShooterPageLock(manualShooter);
    const onShooterMode = useCallback(() => {
        setManualShooter((current) => {
            if (current)
                shooterControlsRef.current?.launchAutoNow();
            return !current;
        });
    }, []);
    const marketService = useMemo(() => new MarketDataService((update) => {
        setFeedRef.current(update);
    }), []);
    useEffect(() => {
        const blockService = new BlockHeightService(setBlockState);
        blockService.start();
        return () => blockService.stop();
    }, []);
    useEffect(() => {
        marketService.start();
        return () => marketService.stop();
    }, [marketService]);
    useEffect(() => {
        const load = () => {
            void fetchBinanceBtc1mKlines(BG2_MAX_CANDLES).then(setCandles);
        };
        load();
        const id = window.setInterval(load, 60_000);
        return () => window.clearInterval(id);
    }, []);
    const showCandleChart = bg2Visible && !isVideoActive && !manualShooter;
    const showBg2Meme = splashDone && hasActiveBg2Meme && !isVideoActive && !manualShooter;
    return (_jsxs("main", { ref: appShellRef, className: "app-shell", children: [!splashDone ? _jsx(SplashSequence, { onDone: onSplashDone }) : null, _jsxs("div", { className: "app-layout", children: [_jsx("div", { className: "stage-anchor", ref: stageAnchorRef, children: _jsxs(Stage, { shellRef: appShellRef, stageRef: stageRef, displayRef: displayRef, children: [_jsx(CrapsScene, { showCandleChart: showCandleChart, showBg2Meme: showBg2Meme, bg2ActiveMeme: bg2Meme.activeMeme, candles: candles, showFg3Cat: fg3.active && !manualShooter, fg3Direction: fg3.direction, fg3Frame: fg3.frame, fg3Left: fg3.left, fg3Top: fg3.top, fg3Width: fg3.width, fg3Height: fg3.height, dice: dice, rolls: rolls, histogramReveal: histogram.reveal, histogramAnimate: histogram.animate, histogramTransitionMs: histogram.transitionMs, bonusHits: bonusHits, bonusFlashing: bonusFlashing, bonusLines: bonusLines, dieColor: dieColor, characterPnl: dice?.pnl ?? emptyCharacterPnl() }), _jsx(Overlay, { market: feed.market, block: blockState, onTimeClick: onTimeClick, shooter: dice?.shooter ?? loadShooterBook(), bonusStakes: dice?.bonusStakes ?? emptyBonusStakes(), rollStreak: dice?.rollStreak ?? emptyRollStreakView(), shooterMode: manualShooter, status: feed.status }), videoOverlay.active && !manualShooter ? (_jsx(VideoOverlay, { videoId: videoOverlay.active.videoId, soundEnabled: videoOverlay.soundEnabled, onEnded: videoOverlay.completeActiveVideo, onPlaybackError: videoOverlay.failActiveVideo, onClose: videoOverlay.completeActiveVideo, sceneWidthPx: sceneWidthPx, sceneHeightPx: sceneHeightPx })) : null] }) }), _jsxs("div", { className: "table-side", children: [_jsxs("div", { className: "shooter-mode-row", children: [_jsx("button", { className: manualShooter ? 'shooter-mode-button is-manual' : 'shooter-mode-button is-auto', type: "button", style: { width: Math.max(120, displayWidthPx / 3) }, "aria-pressed": manualShooter, onClick: onShooterMode, children: manualShooter ? 'Auto' : 'Shooter' }), _jsx(ShooterScrollNote, { active: manualShooter })] }), _jsx(DiceControlPanel, { settings: diceControl, onChange: onDiceControl }), _jsx(DiceControlHistogram, { settings: diceControl, book: diceControlBook }), _jsxs("aside", { className: "repo-links-panel", "aria-label": "Source repositories", children: [_jsx("div", { className: "repo-link-lnurl", "aria-label": "LNURL address", children: _jsx("img", { className: "lnurl-badge", src: "/mobile/lnurl_address.jpg.jpeg", alt: "LNURL address", draggable: false }) }), _jsxs("a", { className: "repo-link", href: "https://github.com/VirtusVerbis/BTC_Craps", target: "_blank", rel: "noopener noreferrer", children: [_jsx(GitHubMark, {}), _jsx("span", { children: "GitHub Repo" })] }), _jsxs("p", { className: "repo-release-note", children: ["Released on 2026-Oct-10", _jsx("br", {}), "Bitcoin was $82k.", _jsx("br", {}), "Website is work in progress..."] })] })] })] })] }));
}
export default App;
