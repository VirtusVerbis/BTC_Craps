import type { VenueId } from './microstructure/types'

/** Delay between successive venue REST calls (reduces burst rate limits). */
export const HEATMAP_VENUE_MID_STAGGER_MS = 300

/** Wait before a single quick retry on rate limit. */
export const HEATMAP_VENUE_MID_QUICK_RETRY_MS = 2_000

const BACKOFF_STEPS_MS = [5 * 60_000, 10 * 60_000, 15 * 60_000] as const
const BACKOFF_JITTER_MS = 30_000

type VenueBackoff = { failCount: number; nextAttemptAt: number }

const backoffByVenue = new Map<VenueId, VenueBackoff>()

const backoffDurationMs = (failCount: number): number => {
  const idx = Math.min(Math.max(failCount - 1, 0), BACKOFF_STEPS_MS.length - 1)
  return BACKOFF_STEPS_MS[idx]!
}

const jitterMs = (): number => Math.floor(Math.random() * BACKOFF_JITTER_MS)

/** Venues that should not be REST-refetched until `nextAttemptAt`. */
export const getVenuesInFetchBackoff = (now = Date.now()): ReadonlySet<VenueId> => {
  const skip = new Set<VenueId>()
  for (const [venue, state] of backoffByVenue) {
    if (state.nextAttemptAt > now) skip.add(venue)
  }
  return skip
}

export const recordVenueMidFetchSuccess = (venue: VenueId): void => {
  backoffByVenue.delete(venue)
}

export const recordVenueMidFetchRateLimited = (venue: VenueId, now = Date.now()): void => {
  const prev = backoffByVenue.get(venue)
  const failCount = (prev?.failCount ?? 0) + 1
  backoffByVenue.set(venue, {
    failCount,
    nextAttemptAt: now + backoffDurationMs(failCount) + jitterMs(),
  })
}

/** Test-only reset. */
export const resetVenueMidFetchBackoffForTests = (): void => {
  backoffByVenue.clear()
}

export const pauseMs = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })