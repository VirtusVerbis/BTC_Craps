export const isBonusTestSeed = (value) => value === 'small' || value === 'tall' || value === 'both';
/** The total that finishes this seed. 6 and 8 come up more often than 12. */
export const bonusTestMissingTotal = (seed) => (seed === 'small' ? 6 : 8);
/** One roll short of the labels under test. */
export const bonusTestHand = (seed) => {
    if (seed === 'small') {
        return { started: true, hits: [2, 3, 4, 5], wonSmall: false, wonTall: false, wonAll: false };
    }
    if (seed === 'tall') {
        return { started: true, hits: [9, 10, 11, 12], wonSmall: false, wonTall: false, wonAll: false };
    }
    return {
        started: true,
        hits: [2, 3, 4, 5, 6, 9, 10, 11, 12],
        wonSmall: true,
        wonTall: false,
        wonAll: false,
    };
};
