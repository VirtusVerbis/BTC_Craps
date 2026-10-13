/** Max canvas `devicePixelRatio` for the chip WebGL layer. */
export const CHIP_CANVAS_MAX_DPR = 2

/** Optional `?dpr=` override (integer 1–3, or `full` for uncapped). */
export const resolveChipCanvasDprCap = (maxDefault: number): number => {
  if (typeof window === 'undefined') return maxDefault
  const raw = new URLSearchParams(window.location.search).get('dpr')
  if (raw === 'full') return Math.max(1, window.devicePixelRatio)
  if (raw != null) {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 1) return n
  }
  return maxDefault
}

/** Instanced discs per chip color (standing + loose + restack). */
export const CHIP_WEBGL_MAX_INSTANCES = 512

/** Circle segments (lower = faster on Mali-class GPUs). */
export const CHIP_WEBGL_CYLINDER_SEGMENTS = 20
