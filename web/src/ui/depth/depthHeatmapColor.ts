/** Display t=0 uses this fraction along the stop ramp (skips near-bg navy). */
export const HEATMAP_COLOR_RAMP_FLOOR = 0.25

/** Sequential ramp: dark → teal → amber → red (resting size intensity). */
const STOPS: readonly [number, number, number][] = [
  [10, 14, 23],
  [30, 58, 95],
  [45, 212, 191],
  [251, 191, 36],
  [239, 68, 68],
]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const heatmapColor01 = (t: number): string => {
  const u = Math.max(0, Math.min(1, t))
  const rampPos = HEATMAP_COLOR_RAMP_FLOOR + u * (1 - HEATMAP_COLOR_RAMP_FLOOR)
  const segments = STOPS.length - 1
  const pos = rampPos * segments
  const i = Math.min(segments - 1, Math.floor(pos))
  const local = pos - i
  const c0 = STOPS[i]!
  const c1 = STOPS[i + 1]!
  const r = Math.round(lerp(c0[0], c1[0], local))
  const g = Math.round(lerp(c0[1], c1[1], local))
  const b = Math.round(lerp(c0[2], c1[2], local))
  return `rgb(${r}, ${g}, ${b})`
}