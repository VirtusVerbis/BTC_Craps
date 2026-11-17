const STORAGE_LIVE_OPEN = 'depthLiveWallsOpen'
const STORAGE_TAPE_OPEN = 'depthTapeOpen'

export const readLiveWallsOpen = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_LIVE_OPEN) === '1'
  } catch {
    return false
  }
}

export const readTapeOpen = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_TAPE_OPEN) === '1'
  } catch {
    return false
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