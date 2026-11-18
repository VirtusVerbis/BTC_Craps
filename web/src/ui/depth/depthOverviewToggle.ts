const STORAGE_OVERVIEW_OPEN = 'depthMarketOverviewOpen'

export const readOverviewOpen = (): boolean => {
  try {
    const v = sessionStorage.getItem(STORAGE_OVERVIEW_OPEN)
    if (v === '0') return false
    return true
  } catch {
    return true
  }
}

export const persistOverviewOpen = (open: boolean): void => {
  try {
    sessionStorage.setItem(STORAGE_OVERVIEW_OPEN, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}