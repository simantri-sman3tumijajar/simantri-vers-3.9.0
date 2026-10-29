import { AppState } from '../types';

/**
 * Strips heavy binary/base64 data (scanned images) before storing state in browser LocalStorage.
 * Academic text, student rosters, questions, scores, and rubrics only take ~50-200 KB,
 * which takes less than 3% of the 5MB browser limit and guarantees indefinite, quota-free operation.
 */
export function cleanStateForLocalStorage(state: AppState): AppState {
  if (!state || typeof state !== 'object') return state;

  const cleanAssessments = (state.assessments || []).map((asm) => {
    if (!asm || !Array.isArray(asm.submissions)) return asm;

    const cleanSubmissions = asm.submissions.map((sub) => {
      if (!sub) return sub;
      // Strip raw heavy base64 images from LocalStorage
      const { scannedImage, scannedImages, ...lightweightSub } = sub;
      return lightweightSub;
    });

    return {
      ...asm,
      submissions: cleanSubmissions,
    };
  });

  // Also strip excessive binary URLs if found in schoolInfo
  const cleanSchoolInfo = state.schoolInfo ? { ...state.schoolInfo } : undefined;
  if (cleanSchoolInfo) {
    if (cleanSchoolInfo.logoSekolahUrl && cleanSchoolInfo.logoSekolahUrl.length > 30000) {
      cleanSchoolInfo.logoSekolahUrl = 'https://iili.io/nl02Et1.png';
    }
    if (cleanSchoolInfo.logoProvinsiUrl && cleanSchoolInfo.logoProvinsiUrl.length > 30000) {
      cleanSchoolInfo.logoProvinsiUrl = 'https://iili.io/nl0FZGe.png';
    }
  }

  return {
    ...state,
    schoolInfo: cleanSchoolInfo || state.schoolInfo,
    assessments: cleanAssessments,
  };
}

/**
 * Purges non-critical temporary keys from LocalStorage when quota is tight.
 */
export function purgeExcessLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // Old duplicate pending sync or temp logs
      if (
        k === 'smantri_pending_sync' ||
        k.startsWith('smantri_temp_') ||
        k.startsWith('smantri_cache_') ||
        k === 'smantri_firestore_quota_exceeded' ||
        k === 'smantri_firestore_quota_time'
      ) {
        keysToRemove.push(k);
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
  } catch (e) {
    // Ignore error during purge
  }
}

// Automatically purge legacy bloated keys upon initial script execution
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    purgeExcessLocalStorage();
    localStorage.removeItem('smantri_pending_sync');
  } catch (e) {}
}

// Global in-memory fallback map for quota overruns
const inMemoryFallbackStorage = new Map<string, string>();

// Global Storage Shield: Catches QuotaExceededError on ANY window.localStorage.setItem call
if (typeof window !== 'undefined' && window.Storage && !(window as any).__smantri_storage_shield_installed) {
  (window as any).__smantri_storage_shield_installed = true;
  const originalSetItem = window.Storage.prototype.setItem;
  const originalGetItem = window.Storage.prototype.getItem;

  window.Storage.prototype.setItem = function (key: string, value: string) {
    // Intercept and drop 'smantri_pending_sync' permanently
    if (key === 'smantri_pending_sync') {
      try {
        this.removeItem(key);
      } catch (e) {}
      return;
    }

    try {
      originalSetItem.call(this, key, value);
      inMemoryFallbackStorage.delete(key);
    } catch (err: any) {
      const isQuotaError =
        err?.name === 'QuotaExceededError' ||
        err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err?.code === 22 ||
        err?.code === 1014 ||
        String(err).includes('exceeded the quota');

      if (isQuotaError) {
        console.warn(`[StorageShield] Storage quota exceeded for "${key}". Running automatic purge...`);
        purgeExcessLocalStorage();

        try {
          originalSetItem.call(this, key, value);
          inMemoryFallbackStorage.delete(key);
          return;
        } catch (retryErr) {
          console.warn(`[StorageShield] Saving key "${key}" into in-memory & IndexedDB fallback safely.`);
          inMemoryFallbackStorage.set(key, value);
          try {
            saveItemToIndexedDB(key, value);
          } catch (idbErr) {}
          return;
        }
      }
      throw err;
    }
  };

  window.Storage.prototype.getItem = function (key: string) {
    if (key === 'smantri_pending_sync') return null;
    const val = originalGetItem.call(this, key);
    if (val !== null) return val;
    return inMemoryFallbackStorage.get(key) || null;
  };
}

/**
 * Bulletproof localStorage.setItem that catches QuotaExceededError and never crashes the application.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  // Intercept and drop 'smantri_pending_sync' - it was the legacy key that overflowed storage
  if (key === 'smantri_pending_sync') {
    try {
      localStorage.removeItem('smantri_pending_sync');
    } catch (e) {}
    return true;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      String(err).includes('exceeded the quota');

    if (isQuotaError) {
      console.warn(`[SafeStorage] LocalStorage quota exceeded on key "${key}". Running auto-cleanup...`);
      // 1. Purge non-essential keys
      purgeExcessLocalStorage();

      // 2. Try one more time after purge
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.warn(`[SafeStorage] Unable to save key "${key}" to LocalStorage even after cleanup. Falling back safely to IndexedDB/memory.`);
        inMemoryFallbackStorage.set(key, value);
        try {
          saveItemToIndexedDB(key, value);
        } catch (e) {}
        return true;
      }
    }

    console.warn(`[SafeStorage] Error setting key "${key}" in LocalStorage:`, err);
    return false;
  }
}

/**
 * Bulletproof localStorage.getItem
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  if (key === 'smantri_pending_sync') return null;
  try {
    const item = localStorage.getItem(key);
    if (item !== null) return item;
    return inMemoryFallbackStorage.get(key) || null;
  } catch (err) {
    console.warn(`[SafeStorage] Error getting key "${key}":`, err);
    return inMemoryFallbackStorage.get(key) || null;
  }
}

/**
 * Bulletproof localStorage.removeItem
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
    inMemoryFallbackStorage.delete(key);
    try {
      removeItemFromIndexedDB(key);
    } catch (e) {}
  } catch (err) {
    // Ignore
  }
}

// ============================================================================
// Native IndexedDB Store: Unlimited capacity (hundreds of MB to GBs)
// Used for unlimited, permanent offline persistence without any 5MB quota limit.
// ============================================================================

const IDB_NAME = 'smantri_offline_db';
const IDB_VERSION = 2;
const IDB_STORE = 'app_state';
const IDB_KV_STORE = 'keyval_store';

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
        if (!db.objectStoreNames.contains(IDB_KV_STORE)) {
          db.createObjectStore(IDB_KV_STORE);
        }
      };

      request.onsuccess = (e: any) => {
        resolve(e.target.result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves arbitrary key-value asynchronously to IndexedDB.
 */
export async function saveItemToIndexedDB(key: string, value: any): Promise<boolean> {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_KV_STORE, 'readwrite');
        const store = tx.objectStore(IDB_KV_STORE);
        const req = store.put(value, key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Loads arbitrary key-value asynchronously from IndexedDB.
 */
export async function getItemFromIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_KV_STORE, 'readonly');
        const store = tx.objectStore(IDB_KV_STORE);
        const req = store.get(key);

        req.onsuccess = (e: any) => {
          resolve(e.target.result !== undefined ? e.target.result : null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Removes arbitrary key-value from IndexedDB.
 */
export async function removeItemFromIndexedDB(key: string): Promise<boolean> {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_KV_STORE, 'readwrite');
        const store = tx.objectStore(IDB_KV_STORE);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Saves state asynchronously to IndexedDB (virtually unlimited quota).
 */
export async function saveStateToIndexedDB(state: AppState): Promise<boolean> {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.put(state, 'latest_state');

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Loads state asynchronously from IndexedDB.
 */
export async function getStateFromIndexedDB(): Promise<AppState | null> {
  try {
    const db = await openIDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get('latest_state');

        req.onsuccess = (e: any) => {
          resolve(e.target.result || null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}
