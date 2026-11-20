const STORAGE_OVERVIEW_OPEN = 'depthMarketOverviewOpen'

export const readOverviewOpen = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_OVERVIEW_OPEN) === '1'
  } catch {
    return false
  }
}

export const persistOverviewOpen = (open: boolean): void => {
  try {
    sessionStorage.setItem(STORAGE_OVERVIEW_OPEN, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}