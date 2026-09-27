// Simple in-memory LRU with TTL.
// Map preserves insertion order — evict oldest on overflow; refresh on read.
const TTL_MS = 60 * 60 * 1000
const MAX_ENTRIES = 1000

const store = new Map()

export function cacheGet(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  store.delete(key)
  store.set(key, entry)
  return entry.value
}

export function cacheSet(key, value) {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value
    store.delete(oldest)
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS })
}
