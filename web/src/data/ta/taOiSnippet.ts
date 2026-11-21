import type { OpenInterestSnapshot } from '../openInterest'

/** Short contextual O/I phrase for TA strip when skew is meaningful. */
export const taOiSnippet = (oi: OpenInterestSnapshot | null): string | null => {
  if (!oi) return null
  const long = oi.longPct
  const short = oi.shortPct
  if (!Number.isFinite(long) || !Number.isFinite(short)) return null
  if (long >= 58) return `Long-heavy O/I (${long.toFixed(0)}% long accounts)`
  if (short >= 58) return `Short-heavy O/I (${short.toFixed(0)}% short accounts)`
  if (oi.openInterest > 0 && long >= 52 && long < 58) return `Slightly long O/I (${long.toFixed(0)}% long)`
  if (oi.openInterest > 0 && short >= 52 && short < 58) return `Slightly short O/I (${short.toFixed(0)}% short)`
  return null
}