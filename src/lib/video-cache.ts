/**
 * IndexedDB-based video cache for the browser.
 * Store: videos keyed by video id, value: { blob, size, ts }.
 */

const DB_NAME = "video-library-cache";
const DB_VERSION = 1;
const STORE = "videos";

export interface CacheRecord {
  blob: Blob;
  size: number;
  ts: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/** Open (and lazily create) the IndexedDB. */
export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("ts", "ts", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  return dbPromise;
}

/** Get a cached blob by video id, or null if not present. */
export async function getCachedBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const rec = req.result as CacheRecord | undefined;
        resolve(rec?.blob ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

function putRecord(db: IDBDatabase, id: string, blob: Blob): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const rec: CacheRecord & { id: string } = { id, blob, size: blob.size, ts: Date.now() };
    const req = store.put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function evictOldest(db: IDBDatabase, count = 1): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const idx = store.index("ts");
    const range = IDBKeyRange.lowerBound(0);
    const cursorReq = idx.openCursor(range, "next"); // ascending by ts → oldest first
    let deleted = 0;
    cursorReq.onsuccess = () => {
      const cur = cursorReq.result;
      if (cur && deleted < count) {
        cur.delete();
        deleted++;
        cur.continue();
      } else {
        resolve();
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

/** Store a blob; on quota error, evict oldest entries until it fits. */
export async function setCachedBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    try {
      await putRecord(db, id, blob);
      return;
    } catch (e) {
      const err = e as { name?: string; code?: number };
      // QuotaExceededError or UnknownError
      if (err?.name === "QuotaExceededError" || err?.name === "UnknownError") {
        // Evict progressively until it fits (or give up after enough tries)
        for (let tries = 0; tries < 8; tries++) {
          await evictOldest(db, 1);
          try {
            await putRecord(db, id, blob);
            return;
          } catch {
            // continue
          }
        }
      }
      // ignore other errors silently — cache is best-effort
    }
  } catch {
    // ignore
  }
}

/** Clear all cached videos. */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

/** Optional: navigator.storage.estimate() usage. */
export async function getCacheEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Create an object URL from a Blob. Caller MUST URL.revokeObjectURL. */
export function makeBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Optional: return number of cached entries (best-effort). */
export async function debugCacheInfo(): Promise<{ count: number } | null> {
  try {
    const db = await openDB();
    return await new Promise<{ count: number } | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.count();
      req.onsuccess = () => resolve({ count: req.result });
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
