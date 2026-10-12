import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { DIE_BACK_WALL_TILT_DEG, DIE_LAUNCH_TILT_DEG, PUCK_IMAGE_WIDTH_PX } from './diceConstants';
import { dieFaceGradient, diePigment, dieRainbowStep, dieShade } from './diceColor';
import { formatShotClock } from './gestureThrow';
import { puckPlacement } from './puckState';
const PIP_LAYOUT = {
    1: [[50, 50]],
    2: [
        [28, 28],
        [72, 72],
    ],
    3: [
        [28, 28],
        [50, 50],
        [72, 72],
    ],
    4: [
        [28, 28],
        [72, 28],
        [28, 72],
        [72, 72],
    ],
    5: [
        [28, 28],
        [72, 28],
        [50, 50],
        [28, 72],
        [72, 72],
    ],
    6: [
        [28, 28],
        [72, 28],
        [28, 50],
        [72, 50],
        [28, 72],
        [72, 72],
    ],
};
const viewTiltDeg = (depth) => DIE_LAUNCH_TILT_DEG + depth * (DIE_BACK_WALL_TILT_DEG - DIE_LAUNCH_TILT_DEG);
const FACES = [
    { name: 'front', value: 2 },
    { name: 'back', value: 5 },
    { name: 'right', value: 3 },
    { name: 'left', value: 4 },
    { name: 'top', value: 1 },
    { name: 'bottom', value: 6 },
];
const useRainbowStep = (active) => {
    const [step, setStep] = useState(0);
    useEffect(() => {
        if (!active)
            return undefined;
        const startedAt = performance.now();
        let frame = 0;
        const tick = (now) => {
            const next = dieRainbowStep(now - startedAt);
            setStep((current) => (current === next ? current : next));
            frame = window.requestAnimationFrame(tick);
        };
        setStep(0);
        frame = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frame);
    }, [active]);
    return step;
};
const Face = ({ name, value, color, rainbowStep, }) => {
    const pigment = diePigment(color, rainbowStep);
    return (_jsx("div", { className: `die-face die-face-${name}`, style: {
            backgroundImage: dieFaceGradient(pigment),
            ['--die-shade']: dieShade(pigment),
        }, children: PIP_LAYOUT[value].map(([x, y]) => (_jsx("span", { className: "die-pip", style: { left: `${x}%`, top: `${y}%` } }, `${name}-${x}-${y}`))) }));
};
export const DiceLayer = ({ presentation, bonusLines = [], dieColor = 'orange', }) => {
    const rainbowStep = useRainbowStep(dieColor === 'rainbow');
    const puck = puckPlacement(presentation.point);
    const result = presentation.result;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dice-layer", "data-die-color": dieColor, "aria-hidden": result == null, children: [_jsx("img", { className: "puck", src: puck.src, alt: "", draggable: false, style: { left: puck.x, top: puck.y, width: PUCK_IMAGE_WIDTH_PX * puck.scale } }), presentation.dice.map((die) => die.visible ? (_jsx("div", { className: "die", style: {
                            width: die.size,
                            height: die.size,
                            left: die.x - die.size / 2,
                            top: die.y - die.size / 2,
                            ['--die-half']: `${die.size / 2}px`,
                        }, children: _jsx("div", { className: "die-spin", style: { transform: `rotateX(${viewTiltDeg(die.depth)}deg) ${die.transform}` }, children: FACES.map((face) => (_jsx(Face, { name: face.name, value: face.value, color: dieColor, rainbowStep: rainbowStep }, face.name))) }) }, die.id)) : null)] }), presentation.shotClockMs != null ? (_jsxs("div", { className: "shot-clock", children: [_jsx("div", { className: "shot-clock-label", children: "Shot Clock" }), _jsx("div", { className: "shot-clock-time", children: formatShotClock(presentation.shotClockMs) })] })) : null, result ? (_jsx("div", { className: "dice-result", children: 'noRoll' in result ? (_jsx("div", { className: "dice-result-total", children: "No Roll!" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "dice-result-total", children: result.total }), result.label ? _jsx("div", { className: "dice-result-label", children: result.label }) : null, bonusLines.map((line) => (_jsx("div", { className: "dice-result-bonus", children: line }, line)))] })) })) : null] }));
};
