import { DIE_FACE_ALPHA, DIE_RAINBOW_STEP_MS } from './diceConstants';
import { ROLL_STREAK_COLORS } from './rollStreak';
/** Clock taps walk this list, then return to Bitcoin orange. */
export const DIE_COLOR_ORDER = ['orange', 'red', 'blue', 'green', 'purple', 'rainbow'];
const STORAGE_KEY = 'btc-craps.die-color';
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const mix = (color, toward, amount) => [
    Math.round(color[0] + (toward[0] - color[0]) * amount),
    Math.round(color[1] + (toward[1] - color[1]) * amount),
    Math.round(color[2] + (toward[2] - color[2]) * amount),
];
const hexToRgb = (hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
/** Light top, mid body, dark foot. Same shape as the glossy orange faces. */
export const pigmentFromHex = (hex) => {
    const mid = hexToRgb(hex);
    return {
        light: mix(mid, WHITE, 0.32),
        mid,
        dark: mix(mid, BLACK, 0.34),
    };
};
const SOLID_PIGMENTS = {
    /** Flat fill was `rgba(247, 147, 26, DIE_FACE_ALPHA)`. */
    orange: {
        light: [255, 186, 48],
        mid: [247, 147, 26],
        dark: [214, 96, 0],
    },
    /** Flat fill was `rgba(196, 28, 36, DIE_FACE_ALPHA)`. Photo acrylic red replaces that pigment. */
    red: {
        // light: [236, 78, 84],
        // mid: [196, 28, 36],
        // dark: [132, 12, 20],
        light: [247, 80, 66],
        mid: [238, 42, 33],
        dark: [197, 23, 19],
    },
    blue: {
        light: [96, 158, 255],
        mid: [24, 78, 232],
        dark: [8, 36, 148],
    },
    green: {
        light: [72, 228, 118],
        mid: [0, 176, 64],
        dark: [0, 112, 36],
    },
    purple: {
        light: [214, 122, 255],
        mid: [168, 56, 224],
        dark: [108, 18, 156],
    },
};
const isDieColorId = (value) => value != null && DIE_COLOR_ORDER.includes(value);
const safeLocalStorage = () => {
    try {
        return globalThis.localStorage ?? null;
    }
    catch {
        return null;
    }
};
export const nextDieColor = (current) => {
    const index = DIE_COLOR_ORDER.indexOf(current);
    const start = index < 0 ? 0 : index;
    return DIE_COLOR_ORDER[(start + 1) % DIE_COLOR_ORDER.length];
};
export const loadDieColor = () => {
    const storage = safeLocalStorage();
    if (!storage)
        return 'orange';
    try {
        const value = storage.getItem(STORAGE_KEY);
        return isDieColorId(value) ? value : 'orange';
    }
    catch {
        return 'orange';
    }
};
export const saveDieColor = (color) => {
    const storage = safeLocalStorage();
    if (!storage || !isDieColorId(color))
        return;
    try {
        storage.setItem(STORAGE_KEY, color);
    }
    catch {
        // Private mode or a full quota.
    }
};
/** Whole-die rainbow step. Every face uses this same slot. */
export const dieRainbowStep = (elapsedMs) => {
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || DIE_RAINBOW_STEP_MS <= 0)
        return 0;
    return Math.floor(elapsedMs / DIE_RAINBOW_STEP_MS);
};
export const diePigment = (color, rainbowStep = 0) => {
    if (color !== 'rainbow')
        return SOLID_PIGMENTS[color];
    const hex = ROLL_STREAK_COLORS[dieRainbowSlot(rainbowStep)];
    return pigmentFromHex(hex);
};
const dieRainbowSlot = (step) => {
    const count = ROLL_STREAK_COLORS.length;
    return ((step % count) + count) % count;
};
const rgba = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
export const dieFaceGradient = (pigment, alpha = DIE_FACE_ALPHA) => `linear-gradient(180deg, ${rgba(pigment.light, alpha)} 0%, ${rgba(pigment.mid, alpha)} 46%, ${rgba(pigment.dark, alpha)} 100%)`;
export const dieShade = (pigment) => `${pigment.dark[0]}, ${pigment.dark[1]}, ${pigment.dark[2]}`;
