import {
  HEATMAP_DEPTH_PERSIST_VERSION,
  type HeatmapDepthPersistedBlob,
  type HeatmapDepthPersistedColumn,
} from './heatmapDepthPersistTypes'
import { trimPersistedColumnsWallClock, upsertPersistedDepthColumns } from './heatmapDepthPersistMerge'

const DB_NAME = 'btc_craps_heatmap_depth'
const STORE_NAME = 'session'
const RECORD_KEY = 'v1'

let dbPromise: Promise<IDBDatabase | null> | null = null

const openDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onerror = () => resolve(null)
      req.onsuccess = () => resolve(req.result)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

const readBlob = async (): Promise<HeatmapDepthPersistedBlob | null> => {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(RECORD_KEY)
      req.onsuccess = () => {
        const raw = req.result as HeatmapDepthPersistedBlob | undefined
        if (!raw || raw.v !== HEATMAP_DEPTH_PERSIST_VERSION || !Array.isArray(raw.columns)) {
          resolve(null)
          return
        }
        resolve(raw)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const writeBlob = async (blob: HeatmapDepthPersistedBlob): Promise<void> => {
  const db = await openDb()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(blob, RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export const loadHeatmapDepthPersistedColumns = async (): Promise<HeatmapDepthPersistedColumn[]> => {
  const blob = await readBlob()
  if (!blob) return []
  return trimPersistedColumnsWallClock(blob.columns)
}

export const flushHeatmapDepthPersistedColumns = async (
  incoming: readonly HeatmapDepthPersistedColumn[],
  now = Date.now(),
): Promise<void> => {
  if (incoming.length === 0) return
  const prior = (await readBlob())?.columns ?? []
  const merged = upsertPersistedDepthColumns(prior, incoming, now)
  const trimmed = trimPersistedColumnsWallClock(merged, now)
  await writeBlob({
    v: HEATMAP_DEPTH_PERSIST_VERSION,
    savedAt: now,
    columns: trimmed,
  })
}