/** Whole-dollar craps payouts. Profit only; the stake coming back is separate. */
export const MAX_ODDS_TO_LINE = 100;
const POINT_NUMBERS = [4, 5, 6, 8, 9, 10];
/** Place 4/10 pay 9:5, 5/9 pay 7:5, 6/8 pay 7:6. */
export const PLACE_PAY = {
    4: { unit: 5, profit: 9 },
    10: { unit: 5, profit: 9 },
    5: { unit: 5, profit: 7 },
    9: { unit: 5, profit: 7 },
    6: { unit: 6, profit: 7 },
    8: { unit: 6, profit: 7 },
};
/** Pass odds: 4/10 pay 2:1, 5/9 pay 3:2, 6/8 pay 6:5. */
export const TAKE_ODDS_PAY = {
    4: { unit: 1, profit: 2 },
    10: { unit: 1, profit: 2 },
    5: { unit: 2, profit: 3 },
    9: { unit: 2, profit: 3 },
    6: { unit: 5, profit: 6 },
    8: { unit: 5, profit: 6 },
};
/** Don't odds: 4/10 pay 1:2, 5/9 pay 2:3, 6/8 pay 5:6. */
export const LAY_ODDS_PAY = {
    4: { unit: 2, profit: 1 },
    10: { unit: 2, profit: 1 },
    5: { unit: 3, profit: 2 },
    9: { unit: 3, profit: 2 },
    6: { unit: 6, profit: 5 },
    8: { unit: 6, profit: 5 },
};
const LINE_PAY = { unit: 1, profit: 1 };
export const isPointNumber = (value) => POINT_NUMBERS.includes(value);
const nearestCent = (value) => Math.round(value * 100) / 100;
/**
 * Book the largest whole-dollar multiple of `unit`.
 * A $4 place-6 wager books nothing. $14 on place 6 books $12 and pays $14 when it hits.
 * The unbooked remainder is rounded to the cent.
 */
export const bookDollars = (stake, unit) => {
    if (!(stake > 0) || !(unit >= 1))
        return { booked: 0, unbooked: stake > 0 ? nearestCent(stake) : 0 };
    const whole = Math.floor(stake + 1e-6);
    const booked = Math.floor(whole / unit) * unit;
    return { booked, unbooked: nearestCent(stake - booked) };
};
/** 100 times the whole dollars actually on the line. */
export const maxOddsDollars = (lineStake) => bookDollars(lineStake, LINE_PAY.unit).booked * MAX_ODDS_TO_LINE;
const noBet = (stake) => ({
    outcome: 'none',
    booked: 0,
    unbooked: stake > 0 ? nearestCent(stake) : 0,
    profit: 0,
    staysUp: false,
});
const resting = (booked, unbooked) => ({
    outcome: 'none',
    booked,
    unbooked,
    profit: 0,
    staysUp: booked > 0,
});
const wholeProfit = (booked, pay) => (booked / pay.unit) * pay.profit;
const settleBooked = (booked, unbooked, won, lostBet, push, staysUpOnWin, pay) => {
    if (!(booked > 0))
        return noBet(unbooked);
    if (push)
        return { outcome: 'push', booked, unbooked, profit: 0, staysUp: true };
    if (won) {
        return { outcome: 'win', booked, unbooked, profit: wholeProfit(booked, pay), staysUp: staysUpOnWin };
    }
    if (lostBet)
        return { outcome: 'lose', booked, unbooked, profit: -booked, staysUp: false };
    return resting(booked, unbooked);
};
const settleLine = (point, stake, won, lostBet, push) => {
    const { booked, unbooked } = bookDollars(stake, LINE_PAY.unit);
    if (point != null && !isPointNumber(point))
        return resting(booked, unbooked);
    return settleBooked(booked, unbooked, won, lostBet, push, true, LINE_PAY);
};
/** Pass wins on a come-out 7 or 11, loses on 2, 3, or 12, then wins if the point returns before a 7. */
export const settlePassLine = (point, total, stake) => {
    const comeOut = point == null;
    const pointOn = point != null && isPointNumber(point);
    return settleLine(point, stake, (comeOut && (total === 7 || total === 11)) || (pointOn && total === point), (comeOut && (total === 2 || total === 3 || total === 12)) || (pointOn && total === 7), false);
};
/** Don't Pass wins on a come-out 2 or 3, pushes on 12, loses on 7 or 11, then wins if a 7 beats the point. */
export const settleDontPass = (point, total, stake) => {
    const comeOut = point == null;
    const pointOn = point != null && isPointNumber(point);
    return settleLine(point, stake, (comeOut && (total === 2 || total === 3)) || (pointOn && total === 7), (comeOut && (total === 7 || total === 11)) || (pointOn && total === point), comeOut && total === 12);
};
/**
 * Odds ride behind a line bet only after a point is set.
 * The booked amount cannot exceed 100 times the whole-dollar line stake.
 */
const settleOdds = (point, total, lineStake, oddsStake, payFor, won, lostBet) => {
    if (point == null || !isPointNumber(point))
        return noBet(oddsStake);
    const pay = payFor[point];
    const offered = Math.min(Math.max(oddsStake, 0), maxOddsDollars(lineStake));
    const { booked, unbooked: belowUnit } = bookDollars(offered, pay.unit);
    const overCap = Math.max(oddsStake, 0) - offered;
    const unbooked = nearestCent(belowUnit + overCap);
    const resolves = total === point || total === 7;
    return settleBooked(booked, unbooked, resolves && won, resolves && lostBet, false, false, pay);
};
export const settlePassOdds = (point, total, lineStake, oddsStake) => settleOdds(point, total, lineStake, oddsStake, TAKE_ODDS_PAY, total === point, total === 7);
export const settleDontPassOdds = (point, total, lineStake, oddsStake) => settleOdds(point, total, lineStake, oddsStake, LAY_ODDS_PAY, total === 7, total === point);
/** Hard 4 and 10 pay 7:1. Hard 6 and 8 pay 9:1. */
export const HARD_NUMBERS = [4, 6, 8, 10];
export const HARD_PAY = {
    4: { unit: 1, profit: 7 },
    10: { unit: 1, profit: 7 },
    6: { unit: 1, profit: 9 },
    8: { unit: 1, profit: 9 },
};
export const isHardNumber = (value) => HARD_NUMBERS.includes(value);
/** Both dice show the same face. Hard 6 is 3 and 3, hard 8 is 4 and 4. */
export const isHardRoll = (dieA, dieB) => dieA != null && dieB != null && dieA === dieB && dieA >= 1 && dieA <= 6;
/**
 * Hard ways win only on the pair and stay up. The easy way of that number loses, and any 7 loses.
 * Any other roll is no action. Off on the come-out.
 */
export const settleHard = (point, total, number, stake, hard) => {
    if (!isHardNumber(number))
        return noBet(stake);
    const { booked, unbooked } = bookDollars(stake, HARD_PAY[number].unit);
    if (point == null || !isPointNumber(point))
        return resting(booked, unbooked);
    const hit = total === number;
    return settleBooked(booked, unbooked, hit && hard, total === 7 || (hit && !hard), false, true, HARD_PAY[number]);
};
/**
 * Place bets are off on the come-out. After a point, the number pays if it rolls before a 7.
 * A winner stays on that number.
 */
export const settlePlace = (point, total, number, stake) => {
    if (!isPointNumber(number))
        return noBet(stake);
    const { booked, unbooked } = bookDollars(stake, PLACE_PAY[number].unit);
    if (point == null || !isPointNumber(point))
        return resting(booked, unbooked);
    return settleBooked(booked, unbooked, total === number, total === 7, false, true, PLACE_PAY[number]);
};
const FIELD_PAY = { unit: 1, profit: 1 };
const FIELD_TRIPLE_PAY = { unit: 1, profit: 3 };
const FIELD_WINNERS = new Set([2, 3, 4, 9, 10, 11, 12]);
/**
 * One roll. Wins on 2, 3, 4, 9, 10, 11, and 12. Loses on 5, 6, 7, and 8.
 * 2 and 12 pay 3:1. The other winners pay 1:1. Off on the come-out.
 */
export const settleField = (point, total, stake) => {
    const { booked, unbooked } = bookDollars(stake, FIELD_PAY.unit);
    if (point == null || !isPointNumber(point))
        return noBet(stake);
    const triple = total === 2 || total === 12;
    return settleBooked(booked, unbooked, FIELD_WINNERS.has(total), !FIELD_WINNERS.has(total), false, false, triple ? FIELD_TRIPLE_PAY : FIELD_PAY);
};
/**
 * A lay wins when a 7 beats the number, and loses when the number rolls.
 * True odds, no commission, no line-odds cap. Off on the come-out.
 */
export const settleLay = (point, total, number, stake) => {
    if (!isPointNumber(number))
        return noBet(stake);
    const { booked, unbooked } = bookDollars(stake, LAY_ODDS_PAY[number].unit);
    if (point == null || !isPointNumber(point))
        return resting(booked, unbooked);
    return settleBooked(booked, unbooked, total === 7, total === number, false, false, LAY_ODDS_PAY[number]);
};
