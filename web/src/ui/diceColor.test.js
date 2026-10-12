import { afterEach, describe, expect, it, vi } from 'vitest';
import { DIE_RAINBOW_STEP_MS } from './diceConstants';
import { DIE_COLOR_ORDER, dieRainbowStep, loadDieColor, nextDieColor, saveDieColor } from './diceColor';
import { ROLL_STREAK_COLOR_STEP_MS } from './rollStreak';
describe('die color', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    it('starts on Bitcoin orange and walks the list back to orange', () => {
        let color = DIE_COLOR_ORDER[0];
        const seen = [color];
        for (let i = 0; i < DIE_COLOR_ORDER.length; i += 1) {
            color = nextDieColor(color);
            seen.push(color);
        }
        expect(seen).toEqual([...DIE_COLOR_ORDER, 'orange']);
    });
    it('steps the rainbow on its own clock, matching the roll streak at the default', () => {
        expect(DIE_RAINBOW_STEP_MS).toBe(ROLL_STREAK_COLOR_STEP_MS);
        expect(dieRainbowStep(0)).toBe(0);
        expect(dieRainbowStep(DIE_RAINBOW_STEP_MS - 1)).toBe(0);
        expect(dieRainbowStep(DIE_RAINBOW_STEP_MS)).toBe(1);
        expect(dieRainbowStep(DIE_RAINBOW_STEP_MS * 3)).toBe(3);
    });
    it('reloads the chosen color after a refresh', () => {
        const memory = new Map();
        vi.stubGlobal('localStorage', {
            getItem: (key) => memory.get(key) ?? null,
            setItem: (key, value) => {
                memory.set(key, value);
            },
        });
        saveDieColor('purple');
        expect(loadDieColor()).toBe('purple');
        memory.set('btc-craps.die-color', 'nope');
        expect(loadDieColor()).toBe('orange');
    });
});
