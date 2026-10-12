import { useEffect, useState } from 'react';
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants';
import { FG3_CAT_FRAME_DELAY_MS, FG3_CAT_OFFSCREEN_MARGIN_PX, FG3_CAT_SIZE_DP, FG3_CAT_SPAWN_INTERVAL_MS, FG3_CAT_SPAWN_Y_FACTOR, FG3_CAT_SPEED_PX_PER_TICK, } from './androidMirrorConstants';
const CAT_SIZE_PX = (FG3_CAT_SIZE_DP * REFERENCE_WIDTH) / 360;
const CAT_Y_PX = REFERENCE_HEIGHT * FG3_CAT_SPAWN_Y_FACTOR - CAT_SIZE_PX;
const spawnCat = () => {
    const direction = Math.random() < 0.5 ? 'left' : 'right';
    const xPx = direction === 'right'
        ? -CAT_SIZE_PX - FG3_CAT_OFFSCREEN_MARGIN_PX
        : REFERENCE_WIDTH + FG3_CAT_OFFSCREEN_MARGIN_PX;
    return { active: true, direction, frame: 0, xPx };
};
/** Foreground cat lifecycle: sparse spawn, cross-screen walk, despawn. */
export const useFg3CatState = (paused = false) => {
    const [cat, setCat] = useState({
        active: false,
        direction: 'left',
        frame: 0,
        xPx: -CAT_SIZE_PX - FG3_CAT_OFFSCREEN_MARGIN_PX,
    });
    useEffect(() => {
        if (!paused)
            return;
        setCat((prev) => (prev.active ? { ...prev, active: false, frame: 0 } : prev));
    }, [paused]);
    useEffect(() => {
        if (paused)
            return undefined;
        const spawnId = window.setInterval(() => {
            setCat((prev) => (prev.active ? prev : spawnCat()));
        }, FG3_CAT_SPAWN_INTERVAL_MS);
        const tickId = window.setInterval(() => {
            setCat((prev) => {
                if (!prev.active)
                    return prev;
                const step = prev.direction === 'right' ? FG3_CAT_SPEED_PX_PER_TICK : -FG3_CAT_SPEED_PX_PER_TICK;
                const nextX = prev.xPx + step;
                const isOffscreen = prev.direction === 'right'
                    ? nextX >= REFERENCE_WIDTH + FG3_CAT_OFFSCREEN_MARGIN_PX
                    : nextX + CAT_SIZE_PX <= -FG3_CAT_OFFSCREEN_MARGIN_PX;
                if (isOffscreen) {
                    return { ...prev, active: false, frame: 0, xPx: nextX };
                }
                return { ...prev, xPx: nextX, frame: (prev.frame + 1) % 2 };
            });
        }, FG3_CAT_FRAME_DELAY_MS);
        return () => {
            window.clearInterval(spawnId);
            window.clearInterval(tickId);
        };
    }, [paused]);
    return {
        active: cat.active,
        direction: cat.direction,
        frame: cat.frame,
        left: cat.xPx / REFERENCE_WIDTH,
        top: CAT_Y_PX / REFERENCE_HEIGHT,
        width: CAT_SIZE_PX / REFERENCE_WIDTH,
        height: CAT_SIZE_PX / REFERENCE_HEIGHT,
    };
};
