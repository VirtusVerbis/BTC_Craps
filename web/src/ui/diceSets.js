import { poseQuat } from './dicePhysics';
export const DICE_SET_IDS = [
    'random',
    'all-sevens',
    'hard-way',
    '3v',
    '2v',
    '6-5-5-4',
    'straight-sixes',
    'crossed-sixes',
    '6-5-4-4',
    '6-4-5-6',
    '6-5-5-6',
    '1364',
];
const set = (id, label, description, faces) => ({
    id,
    label,
    description,
    faces,
    quats: faces ? [poseQuat(faces[0].top, faces[0].front), poseQuat(faces[1].top, faces[1].front)] : null,
});
export const DICE_SETS = [
    set('random', 'Random', 'No target. Each hold gets a new face, and the toss stays unsorted.', null),
    set('all-sevens', 'All Sevens', 'Aims at 7. If the dice stay together, every turn is a seven.', [
        { top: 4, front: 2 },
        { top: 3, front: 5 },
    ]),
    set('hard-way', 'Hard Way', 'Aims at hard 4, 6, 8, and 10. If the dice stay together, 7 does not come up.', [
        { top: 3, front: 5 },
        { top: 3, front: 5 },
    ]),
    set('3v', '3 V', 'Aims at 6 and 8 only.', [
        { top: 3, front: 2 },
        { top: 3, front: 6 },
    ]),
    set('2v', '2 V', 'Aims at 4 and 10 only.', [
        { top: 2, front: 4 },
        { top: 2, front: 6 },
    ]),
    set('6-5-5-4', '6/5 – 5/4', 'If the dice stay together, aims at 5, 9, 3, and 11. Twelve of the sixteen on-axis faces are place numbers.', [
        { top: 6, front: 5 },
        { top: 5, front: 4 },
    ]),
    set('straight-sixes', 'Straight Sixes', 'If the dice stay together, aims at 4, 10, 2, and 12.', [
        { top: 6, front: 5 },
        { top: 6, front: 5 },
    ]),
    set('crossed-sixes', 'Crossed Sixes', 'If the dice stay together, aims at 5, 9, 2, and 12.', [
        { top: 6, front: 5 },
        { top: 6, front: 4 },
    ]),
    set('6-5-4-4', '6/5 – 4/4', 'If the dice stay together, aims at 6, 8, 3, and 11. Twelve of the sixteen on-axis faces are place numbers.', [
        { top: 6, front: 4 },
        { top: 5, front: 4 },
    ]),
    set('6-4-5-6', '6/4 – 5/6', 'If the dice stay together, aims at 4, 10, 3, and 11. Inside numbers show up when the dice slip apart but stay on axis.', [
        { top: 6, front: 4 },
        { top: 5, front: 6 },
    ]),
    set('6-5-5-6', '6/5 – 5/6', 'Aims at 3 and 11 only. If the dice stay together, place numbers do not come up.', [
        { top: 6, front: 5 },
        { top: 5, front: 6 },
    ]),
    set('1364', '1364', 'If the dice stay together, aims at 2, 6, 8, and 12. A 3 or an 11 cannot come up while both dice stay on axis.', [
        { top: 3, front: 6 },
        { top: 3, front: 6 },
    ]),
];
const BY_ID = new Map(DICE_SETS.map((entry) => [entry.id, entry]));
export const isDiceSetId = (value) => typeof value === 'string' && BY_ID.has(value);
export const diceSet = (id) => BY_ID.get(id) ?? DICE_SETS[0];
