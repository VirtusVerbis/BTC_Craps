/** Right edge of the O/I group, in stage pixels. Raising this moves the block right. */
export const OI_LABEL_X = 1065

/** Top of the first O/I line, in stage pixels. Raising this moves the block down. */
export const OI_LABEL_Y = 1800

/** Size of all three O/I lines. Matches the Binance / Coinbase name size. */
export const OI_LABEL_FONT_REM = 1.7578125

/** Left edge of the liquidation group, in stage pixels. */
export const LIQ_LABEL_X = 15

/** Top of the countdown line. Same band as the O/I block. */
export const LIQ_LABEL_Y = OI_LABEL_Y

/** One side of a 5-minute bar, in USD. Lower this to force the ticker while testing. */
export const LIQ_NOTABLE_USD = 10_000_000

/** Half of the 96px "No Roll!" label. */
export const LIQ_TICKER_FONT_PX = 48

/** How fast the ticker words move, in stage pixels per second. */
export const LIQ_TICKER_SPEED_PX_PER_SEC = 90

/**
 * How long one message stays up.
 * The pass already on screen finishes, so the phrase is not cut off.
 */
export const LIQ_TICKER_MS = 26_000

/** Ticker text. Yellow reads as an alarm against the felt and the open-interest orange. */
export const LIQ_TICKER_COLOR = '#FFE566'
