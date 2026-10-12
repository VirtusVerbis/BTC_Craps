import { diceSet, isDiceSetId } from './diceSets';
export const DEFAULT_DICE_CONTROL = {
    comeOut: 'random',
    point: 'random',
    stacked: false,
    precisionTargeting: false,
};
const SETTINGS_KEY = 'btc-craps.dice-control-settings';
const COUNTS_KEY = 'btc-craps.dice-control-counts';
const FAIR_BY_TOTAL = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
const HARD_FACE = { 4: 2, 6: 3, 8: 4, 10: 5 };
export const profileKey = (phase, setId, grip) => `${phase}|${setId}|${grip}`;
/** The set the live phase will throw, including its fixed quaternions. */
export const holdFor = (settings, point) => {
    const set = diceSet(point == null ? settings.comeOut : settings.point);
    return { setId: set.id, stacked: settings.stacked, quats: set.quats };
};
const gripOf = (stacked) => (stacked ? 'stacked' : 'side');
const emptyGrid = () => Array.from({ length: 36 }, () => 0);
const isGrid = (value) => Array.isArray(value) &&
    value.length === 36 &&
    value.every((count) => typeof count === 'number' && Number.isInteger(count) && count >= 0);
const safeStorage = () => {
    try {
        return globalThis.localStorage ?? null;
    }
    catch {
        return null;
    }
};
export const loadDiceControlSettings = () => {
    const storage = safeStorage();
    if (!storage)
        return { ...DEFAULT_DICE_CONTROL };
    try {
        const parsed = JSON.parse(storage.getItem(SETTINGS_KEY) ?? '');
        if (!parsed || typeof parsed !== 'object')
            return { ...DEFAULT_DICE_CONTROL };
        const row = parsed;
        return {
            comeOut: isDiceSetId(row.comeOut) ? row.comeOut : 'random',
            point: isDiceSetId(row.point) ? row.point : 'random',
            stacked: row.stacked === true,
            precisionTargeting: row.precisionTargeting === true,
        };
    }
    catch {
        return { ...DEFAULT_DICE_CONTROL };
    }
};
export const saveDiceControlSettings = (settings) => {
    const storage = safeStorage();
    if (!storage)
        return;
    try {
        storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    catch {
        // Private mode or a full quota. Memory stays current.
    }
};
export const loadDiceControlBook = () => {
    const storage = safeStorage();
    if (!storage)
        return {};
    try {
        const parsed = JSON.parse(storage.getItem(COUNTS_KEY) ?? '');
        if (!parsed || typeof parsed !== 'object')
            return {};
        const profiles = parsed.profiles;
        if (!profiles || typeof profiles !== 'object')
            return {};
        const book = {};
        for (const [key, grid] of Object.entries(profiles)) {
            if (!isGrid(grid) || grid.every((count) => count === 0))
                continue;
            book[key] = grid;
        }
        return book;
    }
    catch {
        return {};
    }
};
export const saveDiceControlBook = (book) => {
    const storage = safeStorage();
    if (!storage)
        return;
    try {
        storage.setItem(COUNTS_KEY, JSON.stringify({ v: 1, profiles: book }));
    }
    catch {
        // Private mode or a full quota. Memory stays current.
    }
};
const cellIndex = (left, right) => (left - 1) * 6 + (right - 1);
export const gridTotal = (grid) => {
    if (!grid)
        return 0;
    let n = 0;
    for (const count of grid)
        n += count;
    return n;
};
export const addGrids = (left, right) => {
    if (!left && !right)
        return undefined;
    const next = emptyGrid();
    for (let i = 0; i < 36; i += 1)
        next[i] = (left?.[i] ?? 0) + (right?.[i] ?? 0);
    return gridTotal(next) > 0 ? next : undefined;
};
export const recordDiceControlRoll = (book, roll) => {
    if (roll.left < 1 || roll.left > 6 || roll.right < 1 || roll.right > 6)
        return book;
    const key = profileKey(roll.phase, roll.setId, gripOf(roll.stacked));
    const cells = book[key] ? [...book[key]] : emptyGrid();
    cells[cellIndex(roll.left, roll.right)] += 1;
    return { ...book, [key]: cells };
};
const totalsOf = (grid) => {
    const totals = Array.from({ length: 13 }, () => 0);
    if (!grid)
        return totals;
    for (let left = 1; left <= 6; left += 1) {
        for (let right = 1; right <= 6; right += 1) {
            totals[left + right] += grid[cellIndex(left, right)] ?? 0;
        }
    }
    return totals;
};
const hardCount = (grid, face) => {
    if (!grid)
        return 0;
    return grid[cellIndex(face, face)] ?? 0;
};
const columnsFor = (grid, randomGrid, compareRandom) => {
    const n = gridTotal(grid);
    const totals = totalsOf(grid);
    const randomN = gridTotal(randomGrid);
    const randomTotals = totalsOf(randomGrid);
    return Array.from({ length: 11 }, (_, index) => {
        const total = index + 2;
        const fair = FAIR_BY_TOTAL[total] / 36;
        const gap = n > 0 ? totals[total] / n - fair : 0;
        const error = n > 0 ? Math.sqrt((fair * (1 - fair)) / n) : Number.POSITIVE_INFINITY;
        const randomGap = compareRandom && randomN > 0 ? randomTotals[total] / randomN - fair : null;
        return {
            total,
            gap,
            solid: n > 0 && Math.abs(gap) > 2 * error,
            randomGap,
        };
    });
};
const hardFor = (grid, randomGrid, compareRandom) => {
    const n = gridTotal(grid);
    const randomN = gridTotal(randomGrid);
    return [4, 6, 8, 10].map((total) => ({
        total,
        count: hardCount(grid, HARD_FACE[total]),
        fair: n / 36,
        random: compareRandom && randomN > 0 ? hardCount(randomGrid, HARD_FACE[total]) : null,
    }));
};
const viewFor = (label, grid, randomGrid, compareRandom) => ({
    label,
    n: gridTotal(grid),
    columns: columnsFor(grid, randomGrid, compareRandom),
    hard: hardFor(grid, randomGrid, compareRandom),
});
const phaseGrid = (book, phase, setId, grip) => book[profileKey(phase, setId, grip)];
/** One chart when both dropdowns match. Two charts when they name different sets. */
export const diceControlCharts = (settings, book) => {
    const grip = gripOf(settings.stacked);
    const stackedLabel = settings.stacked ? ' · stacked' : '';
    if (settings.comeOut === settings.point) {
        const set = diceSet(settings.comeOut);
        const grid = addGrids(phaseGrid(book, 'come-out', set.id, grip), phaseGrid(book, 'point', set.id, grip));
        const randomGrid = set.id === 'random'
            ? undefined
            : addGrids(phaseGrid(book, 'come-out', 'random', grip), phaseGrid(book, 'point', 'random', grip));
        return [viewFor(`${set.label}${stackedLabel}`, grid, randomGrid, set.id !== 'random')];
    }
    return ['come-out', 'point'].map((phase) => {
        const set = diceSet(phase === 'come-out' ? settings.comeOut : settings.point);
        const prefix = phase === 'come-out' ? 'Come Out' : 'Point';
        return viewFor(`${prefix} · ${set.label}${stackedLabel}`, phaseGrid(book, phase, set.id, grip), set.id === 'random' ? undefined : phaseGrid(book, phase, 'random', grip), set.id !== 'random');
    });
};
