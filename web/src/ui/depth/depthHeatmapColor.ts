/** Display t=0 uses this fraction along the stop ramp (skips near-bg navy). */
export const HEATMAP_COLOR_RAMP_FLOOR = 0.15

/** Sequential ramp: dark → teal → amber → red (resting size intensity). */
const STOPS: readonly [number, number, number][] = [
  [10, 14, 23],
  [30, 58, 95],
  [45, 212, 191],
  [251, 191, 36],
  [239, 68, 68],
]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const heatmapColor01Rgb = (t: number): readonly [number, number, number] => {
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
  return [r, g, b] as const
}

export const heatmapColor01 = (t: number): string => {
  const [r, g, b] = heatmapColor01Rgb(t)
  return `rgb(${r}, ${g}, ${b})`
}

/** WCAG relative luminance in 0–1 (for contrasting chip backgrounds). */
export const heatmapRgbRelativeLuminance = (r: number, g: number, b: number): number => {
  const channel = (c: number): number => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}