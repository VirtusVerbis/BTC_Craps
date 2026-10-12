export type ChipRendererMode = 'dom' | 'webgl'

const STORAGE_KEY = 'btc-craps-chip-renderer'

const parseMode = (raw: string | null | undefined): ChipRendererMode | null => {
  if (raw === 'webgl' || raw === 'dom') return raw
  return null
}

/** Build-time default from Vite; falls back to DOM. */
export const buildChipRendererMode = (): ChipRendererMode => {
  const env = import.meta.env.VITE_CHIP_RENDERER
  return parseMode(env) ?? 'dom'
}

/**
 * Effective chip renderer: `?chips=webgl|dom`, then localStorage override, then build default.
 */
export const resolveChipRendererMode = (): ChipRendererMode => {
  if (typeof window === 'undefined') return buildChipRendererMode()
  const params = parseMode(new URLSearchParams(window.location.search).get('chips'))
  if (params) return params
  try {
    const stored = parseMode(window.localStorage.getItem(STORAGE_KEY))
    if (stored) return stored
  } catch {
    /* private mode */
  }
  return buildChipRendererMode()
}

export const persistChipRendererMode = (mode: ChipRendererMode): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

/** Optional `?dpr=` override for chip canvas (integer 1–3, or `full` for uncapped). */
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
