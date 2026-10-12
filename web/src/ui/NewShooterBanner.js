import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NEW_SHOOTER_BANNER_MS, NEW_SHOOTER_BANNER_Y, NEW_SHOOTER_SHIMMER_MS } from './overlayConstants';
const BANNER_SRC = '/here-comes-a-new-shooter.png';
/** Shows the generator banner once each time Shooter mode turns on. */
export const NewShooterBanner = ({ enabled }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!enabled) {
            setVisible(false);
            return;
        }
        setVisible(true);
        const id = window.setTimeout(() => setVisible(false), NEW_SHOOTER_BANNER_MS);
        return () => window.clearTimeout(id);
    }, [enabled]);
    if (!visible)
        return null;
    return (_jsxs("div", { className: "new-shooter-banner", style: { top: NEW_SHOOTER_BANNER_Y }, role: "status", "aria-label": "Here comes a new shooter", children: [_jsx("img", { src: BANNER_SRC, alt: "", draggable: false }), _jsx("div", { className: "new-shooter-shimmer", style: { animationDuration: `${NEW_SHOOTER_SHIMMER_MS}ms` } })] }));
};
