import { REFERENCE_WIDTH } from '../config/constants';
import { DIE_LAUNCH_SIZE_PX, GESTURE_MIN_DISTANCE_PX, GESTURE_RELEASE_WINDOW_MS, } from './diceConstants';
/** Keep both dice on the rail. An x off the table uses the nearer end. */
export const clampLaunchX = (x) => {
    const min = DIE_LAUNCH_SIZE_PX;
    const max = REFERENCE_WIDTH - DIE_LAUNCH_SIZE_PX;
    return Math.min(max, Math.max(min, x));
};
/**
 * A qualifying upward stroke. Pointer-down x is the launch spot.
 * Later sideways travel is lean only. A short or downward stroke is ignored.
 */
export const gestureFromStroke = (points) => {
    if (points.length < 2)
        return null;
    const start = points[0];
    const end = points[points.length - 1];
    const upward = start.y - end.y;
    if (!(upward >= GESTURE_MIN_DISTANCE_PX))
        return null;
    const windowStart = end.t - GESTURE_RELEASE_WINDOW_MS;
    let origin = start;
    for (const point of points) {
        if (point.t >= windowStart) {
            origin = point;
            break;
        }
    }
    if (origin === end)
        origin = points[points.length - 2];
    const dt = (end.t - origin.t) / 1000;
    const speed = dt > 0 ? (origin.y - end.y) / dt : 0;
    return {
        launchX: clampLaunchX(start.x),
        speed,
        lean: (end.x - start.x) / upward,
    };
};
/** `01:00` style countdown. Partial seconds round up so the clock opens on the full minute. */
export const formatShotClock = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
