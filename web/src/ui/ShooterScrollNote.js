import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const FADE_OUT_MS = 800;
/** Shown for the whole Shooter session. Fades out once Auto mode returns. */
export const ShooterScrollNote = ({ active }) => {
    const [phase, setPhase] = useState(active ? 'shown' : 'hidden');
    useEffect(() => {
        if (active) {
            setPhase('shown');
            return;
        }
        setPhase((current) => (current === 'shown' ? 'leaving' : current));
    }, [active]);
    useEffect(() => {
        if (phase !== 'leaving')
            return undefined;
        const id = window.setTimeout(() => setPhase('hidden'), FADE_OUT_MS);
        return () => window.clearTimeout(id);
    }, [phase]);
    if (phase === 'hidden')
        return null;
    return (_jsxs("p", { className: phase === 'leaving' ? 'shooter-scroll-note is-leaving' : 'shooter-scroll-note', "aria-live": "polite", children: [_jsx("span", { children: "Mobile scrolling" }), _jsx("span", { children: "disabled." })] }));
};
