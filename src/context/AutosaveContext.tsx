import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useApp } from './AppContext';
import { db } from '../firebase';
import { doc, collection } from 'firebase/firestore';
import { safeSetDoc, safeDeleteDoc, safeOnSnapshot } from '../utils/firestoreSafe';
import { smartNetworkAdapter } from '../utils/networkAdapter';
import {
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  saveItemToIndexedDB,
  getItemFromIndexedDB,
  removeItemFromIndexedDB,
} from '../utils/safeStorage';

export interface DraftEntry<T = any> {
  key: string;
  moduleName: string;
  data: T;
  userId?: string;
  timestamp: number;
  lastSavedFormatted: string;
  isDirty?: boolean;
}

export interface LockInfo {
  key: string;
  tabId: string;
  moduleName?: string;
  timestamp: number;
}

interface AutosaveContextType {
  saveDraft: (key: string, moduleName: string, data: any, immediate?: boolean) => void;
  getDraft: <T = any>(key: string) => T | null;
  getDraftEntry: <T = any>(key: string) => DraftEntry<T> | null;
  removeDraft: (key: string) => void;
  clearAllDrafts: () => void;
  hasDraft: (key: string) => boolean;
  isSaving: boolean;
  lastSavedText: string | null;
  activeDrafts: DraftEntry[];
  dirtyKeysCount: number;
  markClean: (key: string) => void;

  // Sync-Lock System API
  acquireLock: (key: string, moduleName?: string) => { acquired: boolean; lockedBy?: string };
  releaseLock: (key: string) => void;
  isKeyLocked: (key: string) => boolean;
  getLockInfo: (key: string) => LockInfo | null;
  currentTabId: string;
}

const STORAGE_KEY_PREFIX = 'smantri_autosave_v2_';
const INDEX_STORAGE_KEY = 'smantri_autosave_index_v2';
const SYNC_LOCK_CHANNEL_NAME = 'smantri_sync_lock_channel';

const AutosaveContext = createContext<AutosaveContextType | undefined>(undefined);

export const AutosaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);

  // Tab Unique ID for Sync-Lock Ownership
  const currentTabId = useRef('tab_' + Math.random().toString(36).substring(2, 9)).current;

  // Sync-Lock State across tabs
  const [locks, setLocks] = useState<{ [key: string]: LockInfo }>({});
  const locksRef = useRef<{ [key: string]: LockInfo }>({});

  const [draftIndex, setDraftIndex] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(INDEX_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeDrafts, setActiveDrafts] = useState<DraftEntry[]>([]);
  const debounceTimersRef = useRef<{ [key: string]: any }>({});
  const pendingDataRef = useRef<{ [key: string]: { moduleName: string; data: any; timestamp: number } }>({});
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const lastRemoteSyncTimeRef = useRef<{ [key: string]: number }>({});

  // Format current time in Indonesian style HH.mm.ss
  const formatTimeNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}.${m}.${s} WIB`;
  };

  // Synchronize active drafts from localStorage
  const refreshActiveDrafts = useCallback(() => {
    try {
      const idxRaw = localStorage.getItem(INDEX_STORAGE_KEY);
      const keys: string[] = idxRaw ? JSON.parse(idxRaw) : [];
      const drafts: DraftEntry[] = [];

      for (const k of keys) {
        const itemRaw = localStorage.getItem(STORAGE_KEY_PREFIX + k);
        if (itemRaw) {
          try {
            const parsed = JSON.parse(itemRaw);
            if (!parsed.userId || !currentUser || parsed.userId === currentUser.id) {
              drafts.push(parsed);
            }
          } catch (e) {
            console.warn('Corrupt draft entry:', k, e);
          }
        }
      }

      setActiveDrafts(drafts);
    } catch (e) {
      console.error('Error refreshing active drafts:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshActiveDrafts();
  }, [refreshActiveDrafts]);

  // Programmatic legacy local storage trash cleanup (Zero garbage)
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('smantri_draft_') || 
          key.startsWith('smantri_temp_') || 
          key.includes('__test_') || 
          key.startsWith('peerjs:')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        localStorage.removeItem(k);
      });
      console.log('[Cleanup Master]: Obsolete legacy local storage trash successfully purged.');
    } catch (e) {}
  }, []);

  // Sync-Lock Methods
  const acquireLock = useCallback(
    (key: string, moduleName?: string) => {
      const existing = locksRef.current[key];
      const now = Date.now();
      // If locked by another tab and lock is active (< 12 sec)
      if (existing && existing.tabId !== currentTabId && now - existing.timestamp < 12000) {
        return { acquired: false, lockedBy: existing.tabId };
      }

      const lockObj: LockInfo = { key, tabId: currentTabId, moduleName, timestamp: now };
      locksRef.current = { ...locksRef.current, [key]: lockObj };
      setLocks({ ...locksRef.current });

      // Broadcast lock acquisition across tabs
      try {
        syncChannelRef.current?.postMessage({
          type: 'LOCK_ACQUIRED',
          payload: lockObj,
        });
      } catch (e) {}

      return { acquired: true };
    },
    [currentTabId]
  );

  const releaseLock = useCallback(
    (key: string) => {
      const existing = locksRef.current[key];
      if (existing && existing.tabId === currentTabId) {
        const updated = { ...locksRef.current };
        delete updated[key];
        locksRef.current = updated;
        setLocks(updated);

        try {
          syncChannelRef.current?.postMessage({
            type: 'LOCK_RELEASED',
            payload: { key, tabId: currentTabId },
          });
        } catch (e) {}
      }
    },
    [currentTabId]
  );

  const isKeyLocked = useCallback(
    (key: string) => {
      const lock = locksRef.current[key];
      if (!lock) return false;
      if (lock.tabId === currentTabId) return false;
      return Date.now() - lock.timestamp < 12000;
    },
    [currentTabId]
  );

  const getLockInfo = useCallback(
    (key: string) => {
      const lock = locksRef.current[key];
      if (!lock) return null;
      if (lock.tabId === currentTabId) return null;
      if (Date.now() - lock.timestamp >= 12000) return null;
      return lock;
    },
    [currentTabId]
  );

  // In-memory fast cache for recent full draft objects (including images)
  const fullDraftMemoryCache = useRef<Map<string, any>>(new Map()).current;

  // Actual write to localStorage + IndexedDB + Firestore Cloud Real-Time Persistence
  const flushDraftToStorage = useCallback(
    (key: string, moduleName: string, data: any) => {
      try {
        setIsSaving(true);
        const timeFormatted = formatTimeNow();
        const entry: DraftEntry = {
          key,
          moduleName,
          data,
          userId: currentUser?.id,
          timestamp: Date.now(),
          lastSavedFormatted: timeFormatted,
          isDirty: true,
        };

        // Cache in memory for instant retrieval
        fullDraftMemoryCache.set(key, entry);

        // 1. Asynchronously persist FULL draft (including unlimited high-res images) to IndexedDB
        saveItemToIndexedDB(STORAGE_KEY_PREFIX + key, entry).catch(() => {});

        // 2. Prepare lightweight payload for LocalStorage: strip heavy base64 images if present
        let lightweightData = data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.capturedImages) && data.capturedImages.length > 0) {
            // Keep count info but omit huge base64 strings from 5MB localStorage
            lightweightData = {
              ...data,
              capturedImagesCount: data.capturedImages.length,
              capturedImages: [],
            };
          }
        }

        const lightweightEntry: DraftEntry = {
          ...entry,
          data: lightweightData,
        };

        // Save safely to Local Storage using safeSetItem (immune to QuotaExceededError)
        safeSetItem(STORAGE_KEY_PREFIX + key, JSON.stringify(lightweightEntry));

        // Update index list
        setDraftIndex((prev) => {
          let updated = prev;
          if (!prev.includes(key)) {
            updated = [...prev, key];
            safeSetItem(INDEX_STORAGE_KEY, JSON.stringify(updated));
          }
          return updated;
        });

        // 3. Broadcast via BroadcastChannel to other tabs (0 KB/s internet data!)
        try {
          syncChannelRef.current?.postMessage({
            type: 'DRAFT_UPDATED',
            payload: lightweightEntry,
          });
        } catch (e) {}

        // 4. Remote Cloud Draft Sync (Faster 3s throttle or immediate)
        const now = Date.now();
        const lastSync = lastRemoteSyncTimeRef.current[key] || 0;

        if (db && now - lastSync >= 3000) {
          lastRemoteSyncTimeRef.current[key] = now;
          const docRef = doc(db, 'drafts', key);
          safeSetDoc(
            docRef,
            {
              key,
              moduleName,
              data: lightweightData,
              userId: currentUser?.id || 'anonymous',
              timestamp: now,
              updatedAt: new Date().toISOString(),
              lastSavedFormatted: timeFormatted,
              lockTabId: currentTabId,
            },
            { merge: true }
          );
        }

        setLastSavedText(`Tersimpan otomatis ${timeFormatted}`);
        refreshActiveDrafts();
      } catch (err) {
        console.error('Failed to save autosave draft:', err);
      } finally {
        setTimeout(() => setIsSaving(false), 300);
      }
    },
    [currentUser?.id, currentTabId, refreshActiveDrafts, fullDraftMemoryCache]
  );

  // Save with smart adaptive debounce
  const saveDraft = useCallback(
    (key: string, moduleName: string, data: any, immediate = false) => {
      // Automatically attempt lock acquisition
      acquireLock(key, moduleName);

      pendingDataRef.current[key] = { moduleName, data, timestamp: Date.now() };

      if (debounceTimersRef.current[key]) {
        clearTimeout(debounceTimersRef.current[key]);
      }

      if (immediate) {
        flushDraftToStorage(key, moduleName, data);
        delete pendingDataRef.current[key];
      } else {
        setIsSaving(true);
        // Smart Adaptive Debounce based on internet speed (1.8s - 4.5s)
        const debounceDelay = Math.max(1800, smartNetworkAdapter.getProfile().autosaveDebounceMs);
        debounceTimersRef.current[key] = setTimeout(() => {
          flushDraftToStorage(key, moduleName, data);
          delete pendingDataRef.current[key];
        }, debounceDelay);
      }
    },
    [acquireLock, flushDraftToStorage]
  );

  // Get stored draft data (checks memory cache first, then localStorage)
  const getDraft = useCallback(<T = any>(key: string): T | null => {
    // 1. Fast path: in-memory cache with full images
    if (fullDraftMemoryCache.has(key)) {
      return fullDraftMemoryCache.get(key)?.data || null;
    }

    try {
      const raw = safeGetItem(STORAGE_KEY_PREFIX + key);
      if (!raw) return null;
      const parsed: DraftEntry<T> = JSON.parse(raw);
      return parsed.data || null;
    } catch {
      return null;
    }
  }, [fullDraftMemoryCache]);

  // Get full draft entry with metadata
  const getDraftEntry = useCallback(<T = any>(key: string): DraftEntry<T> | null => {
    if (fullDraftMemoryCache.has(key)) {
      return fullDraftMemoryCache.get(key) || null;
    }

    try {
      const raw = safeGetItem(STORAGE_KEY_PREFIX + key);
      if (!raw) return null;
      const parsed: DraftEntry<T> = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
    }
  }, [fullDraftMemoryCache]);

  // Remove single draft
  const removeDraft = useCallback(
    (key: string) => {
      if (debounceTimersRef.current[key]) {
        clearTimeout(debounceTimersRef.current[key]);
        delete debounceTimersRef.current[key];
      }
      delete pendingDataRef.current[key];
      fullDraftMemoryCache.delete(key);
      releaseLock(key);

      try {
        safeRemoveItem(STORAGE_KEY_PREFIX + key);
        removeItemFromIndexedDB(STORAGE_KEY_PREFIX + key).catch(() => {});
        setDraftIndex((prev) => {
          const updated = prev.filter((k) => k !== key);
          safeSetItem(INDEX_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        // Broadcast removal across tabs
        try {
          syncChannelRef.current?.postMessage({
            type: 'DRAFT_REMOVED',
            payload: { key },
          });
        } catch (e) {}

        // Delete from Firestore
        if (db) {
          const docRef = doc(db, 'drafts', key);
          safeDeleteDoc(docRef);
        }

        refreshActiveDrafts();
      } catch (e) {
        console.error('Error removing draft:', e);
      }
    },
    [fullDraftMemoryCache, releaseLock, refreshActiveDrafts]
  );

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    Object.keys(debounceTimersRef.current).forEach((k) => {
      clearTimeout(debounceTimersRef.current[k]);
    });
    debounceTimersRef.current = {};
    pendingDataRef.current = {};
    fullDraftMemoryCache.clear();

    try {
      const idxRaw = safeGetItem(INDEX_STORAGE_KEY);
      const keys: string[] = idxRaw ? JSON.parse(idxRaw) : [];
      for (const k of keys) {
        safeRemoveItem(STORAGE_KEY_PREFIX + k);
        removeItemFromIndexedDB(STORAGE_KEY_PREFIX + k).catch(() => {});
        releaseLock(k);
      }
      safeRemoveItem(INDEX_STORAGE_KEY);
      setDraftIndex([]);
      setActiveDrafts([]);
      setLastSavedText(null);
    } catch (e) {
      console.error('Error clearing all drafts:', e);
    }
  }, [releaseLock]);

  // Check if draft exists
  const hasDraft = useCallback((key: string): boolean => {
    if (fullDraftMemoryCache.has(key)) return true;
    const raw = safeGetItem(STORAGE_KEY_PREFIX + key);
    return !!raw;
  }, [fullDraftMemoryCache]);

  // Mark clean
  const markClean = useCallback(
    (key: string) => {
      try {
        const raw = safeGetItem(STORAGE_KEY_PREFIX + key);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.isDirty = false;
          safeSetItem(STORAGE_KEY_PREFIX + key, JSON.stringify(parsed));
          refreshActiveDrafts();
        }
      } catch (e) {
        console.warn('Failed to mark clean', e);
      }
    },
    [refreshActiveDrafts]
  );

  // Flush all pending
  const flushAllPending = useCallback(() => {
    Object.entries(pendingDataRef.current).forEach(([k, item]) => {
      try {
        const timeFormatted = formatTimeNow();
        const entry: DraftEntry = {
          key: k,
          moduleName: item.moduleName,
          data: item.data,
          userId: currentUser?.id,
          timestamp: item.timestamp,
          lastSavedFormatted: timeFormatted,
          isDirty: true,
        };

        // Strip heavy images from localStorage payload
        let lightweightData = item.data;
        if (lightweightData && typeof lightweightData === 'object' && Array.isArray(lightweightData.capturedImages)) {
          lightweightData = {
            ...lightweightData,
            capturedImagesCount: lightweightData.capturedImages.length,
            capturedImages: [],
          };
        }
        safeSetItem(STORAGE_KEY_PREFIX + k, JSON.stringify({ ...entry, data: lightweightData }));

        // Sync to Firestore
        if (db) {
          safeSetDoc(
            doc(db, 'drafts', k),
            {
              key: k,
              moduleName: item.moduleName,
              data: lightweightData,
              userId: currentUser?.id || 'anonymous',
              timestamp: item.timestamp,
              updatedAt: new Date().toISOString(),
              lastSavedFormatted: timeFormatted,
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.error('Flush error during unload:', e);
      }
    });
  }, [currentUser?.id]);

  // Setup BroadcastChannel for Sync-Lock & Multi-Tab Realtime Messaging
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(SYNC_LOCK_CHANNEL_NAME);
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (!type) return;

        if (type === 'LOCK_ACQUIRED' && payload?.key) {
          if (payload.tabId !== currentTabId) {
            locksRef.current = { ...locksRef.current, [payload.key]: payload };
            setLocks({ ...locksRef.current });
          }
        } else if (type === 'LOCK_RELEASED' && payload?.key) {
          const updated = { ...locksRef.current };
          delete updated[payload.key];
          locksRef.current = updated;
          setLocks(updated);
        } else if (type === 'DRAFT_UPDATED' && payload?.key) {
          safeSetItem(STORAGE_KEY_PREFIX + payload.key, JSON.stringify(payload));
          refreshActiveDrafts();
        } else if (type === 'DRAFT_REMOVED' && payload?.key) {
          safeRemoveItem(STORAGE_KEY_PREFIX + payload.key);
          refreshActiveDrafts();
        } else if (type === 'TAB_EXIT' && payload?.tabId) {
          const updated = { ...locksRef.current };
          Object.keys(updated).forEach((k) => {
            if (updated[k].tabId === payload.tabId) {
              delete updated[k];
            }
          });
          locksRef.current = updated;
          setLocks(updated);
        } else if (type === 'TAB_HEARTBEAT' && payload?.tabId) {
          // Update timestamp for active tab's locks
          let changed = false;
          const updated = { ...locksRef.current };
          Object.keys(updated).forEach((k) => {
            if (updated[k].tabId === payload.tabId) {
              updated[k].timestamp = Date.now();
              changed = true;
            }
          });
          if (changed) {
            locksRef.current = updated;
            setLocks(updated);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this browser:', e);
    }

    // Heartbeat every 3 seconds to keep locks active across tabs
    const heartbeatTimer = setInterval(() => {
      const now = Date.now();
      // 1. Broadcast heartbeat
      try {
        syncChannelRef.current?.postMessage({
          type: 'TAB_HEARTBEAT',
          payload: { tabId: currentTabId },
        });
      } catch (e) {}

      // 2. Clean expired locks (> 12 sec old)
      let expiredFound = false;
      const updated = { ...locksRef.current };
      Object.keys(updated).forEach((k) => {
        if (now - updated[k].timestamp > 12000) {
          delete updated[k];
          expiredFound = true;
        }
      });
      if (expiredFound) {
        locksRef.current = updated;
        setLocks(updated);
      }
    }, 3500);

    return () => {
      clearInterval(heartbeatTimer);
      try {
        syncChannelRef.current?.postMessage({
          type: 'TAB_EXIT',
          payload: { tabId: currentTabId },
        });
        syncChannelRef.current?.close();
      } catch (e) {}
    };
  }, [currentTabId, refreshActiveDrafts]);

  // Real-time Firestore onSnapshot listener for cross-device draft synchronization
  useEffect(() => {
    if (!db) return;
    try {
      const draftsRef = collection(db, 'drafts');
      const unsubscribe = safeOnSnapshot(draftsRef, (snapshot) => {
        snapshot.docChanges().forEach((change: any) => {
          const docData = change.doc.data();
          if (docData && docData.key) {
            // Ignore if modified by this tab
            if (docData.lockTabId === currentTabId) return;

            if (change.type === 'removed') {
              safeRemoveItem(STORAGE_KEY_PREFIX + docData.key);
            } else {
              const entry: DraftEntry = {
                key: docData.key,
                moduleName: docData.moduleName || 'general',
                data: docData.data,
                userId: docData.userId,
                timestamp: docData.timestamp || Date.now(),
                lastSavedFormatted: docData.lastSavedFormatted || 'cloud',
                isDirty: false,
              };
              safeSetItem(STORAGE_KEY_PREFIX + docData.key, JSON.stringify(entry));
            }
          }
        });
        refreshActiveDrafts();
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('[AutosaveContext] Error setting up drafts listener:', e);
    }
  }, [currentTabId, refreshActiveDrafts]);


  // Browser Silent Unload & Navigation Teardown
  useEffect(() => {
    const handleTeardown = () => {
      flushAllPending();

      try {
        syncChannelRef.current?.postMessage({
          type: 'TAB_EXIT',
          payload: { tabId: currentTabId },
        });
      } catch (e) {}

      try {
        const cachedState = localStorage.getItem('smantri_cloud_state');
        if (cachedState && typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob([cachedState], { type: 'application/json' });
          navigator.sendBeacon('/api/state/sync', blob);
        }
      } catch (e) {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleTeardown();
      }
    };

    window.addEventListener('beforeunload', handleTeardown);
    window.addEventListener('pagehide', handleTeardown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleTeardown);
      window.removeEventListener('pagehide', handleTeardown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentTabId, flushAllPending]);

  const dirtyKeysCount = activeDrafts.filter((d) => d.isDirty).length;

  return (
    <AutosaveContext.Provider
      value={{
        saveDraft,
        getDraft,
        getDraftEntry,
        removeDraft,
        clearAllDrafts,
        hasDraft,
        isSaving,
        lastSavedText,
        activeDrafts,
        dirtyKeysCount,
        markClean,
        // Sync-Lock System
        acquireLock,
        releaseLock,
        isKeyLocked,
        getLockInfo,
        currentTabId,
      }}
    >
      {children}
    </AutosaveContext.Provider>
  );
};

export const useAutosave = () => {
  const context = useContext(AutosaveContext);
  if (!context) {
    throw new Error('useAutosave must be used within an AutosaveProvider');
  }
  return context;
};
