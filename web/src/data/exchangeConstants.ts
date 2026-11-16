/** Mirrors Android `MainActivity.EXCHANGE_EMIT_THROTTLE_MS`. */
export const EXCHANGE_EMIT_THROTTLE_MS = 100

/** Mirrors Android `WebSocketRepository` volume reset interval. */
export const VOLUME_RESET_INTERVAL_MS = 5000

/** Mirrors Android `WebSocketRepository` reconnect loop `delay(10000)`. */
export const WS_RECONNECT_PROBE_MS = 10_000

/** Coinbase `level2` snapshots for BTC-USD exceed the default WS frame cap. */
export const COINBASE_WS_MAX_PAYLOAD_BYTES = 8_388_608

/** Binance partial-depth payloads can exceed 32 KiB on first push. */
export const BINANCE_DEPTH_WS_MAX_PAYLOAD_BYTES = 1_048_576
