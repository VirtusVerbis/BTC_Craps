const STORAGE_LIVE_OPEN = 'depthLiveWallsOpen'
const STORAGE_TAPE_OPEN = 'depthTapeOpen'

export const readLiveWallsOpen = (): boolean => {
  try {
    const v = sessionStorage.getItem(STORAGE_LIVE_OPEN)
    if (v === '0') return false
    return true
  } catch {
    return true
  }
}

export const readTapeOpen = (): boolean => {
  try {
    const v = sessionStorage.getItem(STORAGE_TAPE_OPEN)
    if (v === '0') return false
    return true
  } catch {
    return true
  }
}

export const persistLiveWallsOpen = (open: boolean): void => {
  try {
    sessionStorage.setItem(STORAGE_LIVE_OPEN, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export const persistTapeOpen = (open: boolean): void => {
  try {
    sessionStorage.setItem(STORAGE_TAPE_OPEN, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}