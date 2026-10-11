/**
 * Puts used by a full day of successful samples. Two UTC minutes stored,
 * one skipped: 960. The free tier allows 1,000 puts per UTC day and resets
 * at 00:00 UTC, so this leaves 40 for an occasional retry.
 */
export const KV_PUTS_PER_DAY = 960

const MINUTES_PER_DAY = 24 * 60

/**
 * True on the minutes that store the Coinalyze snapshot.
 * Minute 0 and 1 of each 3-minute block store; minute 2 skips.
 * Gaps are one or two minutes, including across UTC midnight.
 */
export const shouldStoreSnapshot = (nowMs: number): boolean => {
  const minuteOfDay = Math.floor(nowMs / 60_000) % MINUTES_PER_DAY
  return minuteOfDay % 3 !== 2
}
