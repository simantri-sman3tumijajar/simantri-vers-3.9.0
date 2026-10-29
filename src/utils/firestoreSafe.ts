import {
  DocumentReference,
  SetOptions,
  setDoc,
  deleteDoc,
  onSnapshot,
  Query,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const lastWriteTimes: { [path: string]: number } = {};
const pendingWrites: { [path: string]: { docRef: DocumentReference; data: any; options?: SetOptions; timer: any } } = {};
const MIN_WRITE_INTERVAL_MS = 300; // Rapid and responsive writes

export function getFirestoreCircuitBreakerStatus() {
  return {
    isQuotaExceeded: false,
    isPermissionDenied: false,
  };
}

export function resetCircuitBreaker() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('smantri_firestore_quota_exceeded');
      localStorage.removeItem('smantri_firestore_quota_time');
    } catch (e) {}
  }
}

export function sanitizeFirestorePayload(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const clean = { ...data };

  // 1. Strip raw base64 scan images from submissions so Firestore doc size stays well within 1MB
  if (Array.isArray(clean.assessments)) {
    clean.assessments = clean.assessments.map((a: any) => {
      if (!a) return a;
      return {
        ...a,
        submissions: Array.isArray(a.submissions)
          ? a.submissions.map((s: any) => {
              if (!s) return s;
              const { scannedImages, scannedImage, ...rest } = s;
              return rest;
            })
          : a.submissions,
      };
    });
  }

  // 2. Strip raw base64 scan images from archives
  if (Array.isArray(clean.archives)) {
    clean.archives = clean.archives.slice(0, 10).map((arch: any) => {
      if (!arch) return arch;
      return {
        ...arch,
        assessments: Array.isArray(arch.assessments)
          ? arch.assessments.map((a: any) => {
              if (!a) return a;
              return {
                ...a,
                submissions: Array.isArray(a.submissions)
                  ? a.submissions.map((s: any) => {
                      if (!s) return s;
                      const { scannedImages, scannedImage, ...rest } = s;
                      return rest;
                    })
                  : a.submissions,
              };
            })
          : arch.assessments,
      };
    });
  }

  // 3. Trim giant base64 teacher photos for Firestore document (full photos are preserved in Local/IndexedDB and server storage)
  if (Array.isArray(clean.teachers)) {
    clean.teachers = clean.teachers.map((t: any) => {
      if (!t) return t;
      if (t.fotoUrl && typeof t.fotoUrl === 'string' && t.fotoUrl.startsWith('data:image/') && t.fotoUrl.length > 2000) {
        return { ...t, fotoUrl: '' };
      }
      return t;
    });
  }

  // 4. Sanitize logos in schoolInfo
  if (clean.schoolInfo) {
    clean.schoolInfo = { ...clean.schoolInfo };
    if (clean.schoolInfo.logoSekolahUrl && clean.schoolInfo.logoSekolahUrl.length > 20000) {
      clean.schoolInfo.logoSekolahUrl = 'https://iili.io/n1vlf2t.png';
    }
    if (clean.schoolInfo.logoProvinsiUrl && clean.schoolInfo.logoProvinsiUrl.length > 20000) {
      clean.schoolInfo.logoProvinsiUrl = 'https://iili.io/n1vlpFS.png';
    }
  }

  // 5. Ensure NO 'undefined' properties exist, as Firestore throws unsupported field value error
  try {
    return JSON.parse(JSON.stringify(clean));
  } catch (e) {
    return clean;
  }
}

async function executeSetDoc(docRef: DocumentReference, data: any, options?: SetOptions): Promise<boolean> {
  if (!db) return false;
  const path = docRef.path;
  lastWriteTimes[path] = Date.now();
  const safeData = sanitizeFirestorePayload(data);
  try {
    if (options) {
      await setDoc(docRef, safeData, options);
    } else {
      await setDoc(docRef, safeData);
    }
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (e) {
        console.warn(`[Firestore SetDoc Permission Error (${path})]:`, e);
      }
    } else {
      console.warn(`[Firestore SetDoc Warning (${path})]:`, msg);
    }
    return false;
  }
}

/**
 * Throttled & Queue-Guaranteed setDoc for instant updates and reliable trailing write
 */
export async function safeSetDoc(
  docRef: DocumentReference,
  data: any,
  options?: SetOptions
): Promise<boolean> {
  if (!db) {
    return false;
  }

  const path = docRef.path;
  const now = Date.now();
  const lastTime = lastWriteTimes[path] || 0;
  const diff = now - lastTime;

  // Clear any existing trailing write for this path
  if (pendingWrites[path]?.timer) {
    clearTimeout(pendingWrites[path].timer);
  }

  // If outside interval, execute immediately
  if (diff >= MIN_WRITE_INTERVAL_MS) {
    delete pendingWrites[path];
    return executeSetDoc(docRef, data, options);
  }

  // Within throttle window: queue trailing write so latest state is NEVER lost
  return new Promise<boolean>((resolve) => {
    const remainingTime = MIN_WRITE_INTERVAL_MS - diff;
    const timer = setTimeout(async () => {
      delete pendingWrites[path];
      const res = await executeSetDoc(docRef, data, options);
      resolve(res);
    }, remainingTime);

    pendingWrites[path] = { docRef, data, options, timer };
  });
}

/**
 * Safe deleteDoc wrapper
 */
export async function safeDeleteDoc(docRef: DocumentReference): Promise<boolean> {
  if (!db) return false;

  const path = docRef.path;
  try {
    await deleteDoc(docRef);
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      try {
        handleFirestoreError(error, OperationType.DELETE, path);
      } catch (e) {
        console.warn(`[Firestore DeleteDoc Permission Error (${path})]:`, e);
      }
    } else {
      console.warn('[Firestore DeleteDoc Warning]:', msg);
    }
    return false;
  }
}

/**
 * Robust live onSnapshot with graceful error handling and auto-reconnect
 */
export function safeOnSnapshot<T>(
  targetRef: DocumentReference | Query,
  onNext: (snapshot: any) => void,
  customErrorHandler?: (error: any) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const path = (targetRef as any)?.path || null;

  try {
    const unsub = onSnapshot(
      targetRef as any,
      (snapshot: any) => {
        onNext(snapshot);
      },
      (error: any) => {
        const msg = error?.message || String(error);
        if (customErrorHandler) {
          customErrorHandler(error);
        } else if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
          try {
            handleFirestoreError(error, OperationType.GET, path);
          } catch (e) {
            console.warn('[Firestore Live Stream Permission Notice]:', e);
          }
        } else {
          console.warn('[Firestore Live Stream Notice]:', msg);
        }
      }
    );
    return unsub;
  } catch (e) {
    console.warn('[Firestore Listener Exception]:', e);
    return () => {};
  }
}
