import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LIQ_LABEL_Y, LIQ_TICKER_FONT_PX, LIQ_TICKER_HEIGHT_PX, LIQ_TICKER_SPEED_PX_PER_SEC, } from './overlayConstants';
import { ROLL_STREAK_COLORS, rollStreakColorIndex, rollStreakColorStep, } from './rollStreak';
import { HOT_SHOOTER_MS, HOT_SHOOTER_TEXT, openHotShooterGate, stepHotShooterGate } from './hotShooter';
import { tickerPass } from './tickerPass';
/** Empty bar shows before the words start moving. Matches the liquidation ticker. */
const BOX_FIRST_MS = 400;
const RainbowPhrase = ({ text, step, phraseRef, }) => (_jsx("span", { ref: phraseRef, className: "liq-ticker-phrase", children: Array.from(text).map((char, index) => (_jsx("span", { style: { color: ROLL_STREAK_COLORS[rollStreakColorIndex(index, step, ROLL_STREAK_COLORS.length)] }, children: char }, index))) }));
const HotShooterPass = ({ onDone }) => {
    const [scrolling, setScrolling] = useState(false);
    const [pass, setPass] = useState(null);
    const [step, setStep] = useState(0);
    const finishAfterPass = useRef(false);
    const boxRef = useRef(null);
    const phraseRef = useRef(null);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    useLayoutEffect(() => {
        const box = boxRef.current;
        const phrase = phraseRef.current;
        if (!box || !phrase)
            return;
        const phraseWidth = phrase.offsetWidth;
        const boxWidth = box.clientWidth;
        if (!(phraseWidth > 0) || !(boxWidth > 0))
            return;
        setPass(tickerPass(boxWidth, phraseWidth, LIQ_TICKER_SPEED_PX_PER_SEC));
    }, []);
    useEffect(() => {
        if (!pass)
            return undefined;
        const id = window.setTimeout(() => setScrolling(true), BOX_FIRST_MS);
        return () => window.clearTimeout(id);
    }, [pass]);
    useEffect(() => {
        if (!scrolling)
            return undefined;
        finishAfterPass.current = false;
        const id = window.setTimeout(() => {
            finishAfterPass.current = true;
        }, HOT_SHOOTER_MS);
        return () => window.clearTimeout(id);
    }, [scrolling]);
    useEffect(() => {
        const startedAt = performance.now();
        let frame = 0;
        const tick = (now) => {
            const next = rollStreakColorStep(now - startedAt);
            setStep((current) => (current === next ? current : next));
            frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frame);
    }, []);
    const finishPass = () => {
        if (!finishAfterPass.current)
            return;
        finishAfterPass.current = false;
        onDoneRef.current();
    };
    return (_jsx("div", { ref: boxRef, className: "liq-ticker", style: {
            top: LIQ_LABEL_Y - LIQ_TICKER_HEIGHT_PX * 2,
            height: LIQ_TICKER_HEIGHT_PX,
            fontSize: LIQ_TICKER_FONT_PX,
        }, children: _jsx("div", { className: scrolling && pass ? 'liq-ticker-track is-scrolling' : 'liq-ticker-track', style: {
                animationDuration: pass ? `${pass.passMs}ms` : undefined,
                ['--liq-ticker-start']: pass ? `${pass.start}px` : '0px',
                ['--liq-ticker-end']: pass ? `${pass.end}px` : '0px',
            }, onAnimationIteration: finishPass, children: _jsx(RainbowPhrase, { text: HOT_SHOOTER_TEXT, step: step, phraseRef: phraseRef }) }) }));
};
export const HotShooterTicker = ({ current }) => {
    const gateRef = useRef(null);
    const queuedId = useRef(null);
    const [playId, setPlayId] = useState(0);
    const [activeId, setActiveId] = useState(null);
    useEffect(() => {
        if (gateRef.current == null) {
            gateRef.current = openHotShooterGate(current);
            return;
        }
        const prev = gateRef.current;
        const next = stepHotShooterGate(prev, current);
        gateRef.current = next;
        if (next.playId !== prev.playId)
            setPlayId(next.playId);
    }, [current]);
    useEffect(() => {
        if (playId === 0)
            return;
        setActiveId((showing) => {
            if (showing == null)
                return playId;
            if (showing !== playId)
                queuedId.current = playId;
            return showing;
        });
    }, [playId]);
    if (activeId == null)
        return null;
    return (_jsx(HotShooterPass, { onDone: () => {
            const next = queuedId.current;
            queuedId.current = null;
            setActiveId(next);
        } }, activeId));
};
