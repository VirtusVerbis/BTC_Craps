import { useCallback, useEffect, useRef, useState } from 'react'
import {
  VIDEO_OVERLAY_AUTO_SPAWN_DELAY_MS,
  VIDEO_OVERLAY_DEFAULT_MUTED,
  VIDEO_OVERLAY_SPAWN_INTERVAL_MS,
} from './androidMirrorConstants'
import { VIDEO_OVERLAY_SET_IDS, VIDEO_SET_TO_VIDEO_ID } from './videoOverlayConfig'

export interface ActiveVideoOverlay {
  presetId: string
  videoId: string
}

interface VideoOverlayState {
  active: ActiveVideoOverlay | null
  isVideoActive: boolean
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  completeActiveVideo: () => void
  failActiveVideo: () => void
}

const shuffle = <T,>(arr: readonly T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const useVideoOverlayState = (): VideoOverlayState => {
  const [active, setActive] = useState<ActiveVideoOverlay | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(!VIDEO_OVERLAY_DEFAULT_MUTED)
  const activeRef = useRef<ActiveVideoOverlay | null>(null)
  const erroredPresetIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<string[]>([])
  const wakeLoopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const nextPreset = useCallback((): string | null => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(VIDEO_OVERLAY_SET_IDS)
    }
    while (queueRef.current.length > 0) {
      const id = queueRef.current.shift()
      if (!id) break
      if (!erroredPresetIdsRef.current.has(id) && VIDEO_SET_TO_VIDEO_ID[id]) {
        return id
      }
    }
    return null
  }, [])

  const wakeSpawnLoop = useCallback(() => {
    wakeLoopRef.current?.()
  }, [])

  const completeActiveVideo = useCallback(() => {
    activeRef.current = null
    setActive(null)
    wakeSpawnLoop()
  }, [wakeSpawnLoop])

  const failActiveVideo = useCallback(() => {
    const current = activeRef.current
    if (current) {
      erroredPresetIdsRef.current.add(current.presetId)
    }
    activeRef.current = null
    setActive(null)
    wakeSpawnLoop()
  }, [wakeSpawnLoop])

  useEffect(() => {
    let cancelled = false

    const waitUntilVideoClears = async () => {
      while (!cancelled && activeRef.current !== null) {
        await new Promise<void>((resolve) => {
          wakeLoopRef.current = resolve
        })
      }
      wakeLoopRef.current = null
    }

    const run = async () => {
      await sleep(VIDEO_OVERLAY_AUTO_SPAWN_DELAY_MS)
      while (!cancelled) {
        if (activeRef.current !== null) {
          await waitUntilVideoClears()
          continue
        }
        const presetId = nextPreset()
        if (presetId) {
          const videoId = VIDEO_SET_TO_VIDEO_ID[presetId]
          if (videoId) {
            setActive({ presetId, videoId })
            await waitUntilVideoClears()
          }
        }
        await sleep(VIDEO_OVERLAY_SPAWN_INTERVAL_MS)
      }
    }

    void run()

    return () => {
      cancelled = true
      wakeSpawnLoop()
    }
  }, [nextPreset, wakeSpawnLoop])

  return {
    active,
    isVideoActive: active !== null,
    soundEnabled,
    setSoundEnabled,
    completeActiveVideo,
    failActiveVideo,
  }
}

