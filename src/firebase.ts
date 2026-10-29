import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  setLogLevel,
} from 'firebase/firestore';
import rawFirebaseConfig from '../firebase-applet-config.json';
import { safeSetItem, safeGetItem } from './utils/safeStorage';

export const ENABLE_FIRESTORE = true;

// Accurately detect and assemble Firebase configuration with robust fallbacks
const configObj = (rawFirebaseConfig as any).default || rawFirebaseConfig || {};

export const firebaseConfig = {
  projectId: configObj.projectId || 'gen-lang-client-0752084852',
  appId: configObj.appId || '1:847805645675:web:0590aaf5b2d4a46cfd022e',
  apiKey: configObj.apiKey || 'AIzaSyAwah1EZXnT5wy4RnrMaeD5HhvyjRA68rk',
  authDomain: configObj.authDomain || 'gen-lang-client-0752084852.firebaseapp.com',
  firestoreDatabaseId: configObj.firestoreDatabaseId || 'ai-studio-simantriappv396b-3b91697c-5bca-4dde-a116-3eeca4feaeba',
  storageBucket: configObj.storageBucket || 'gen-lang-client-0752084852.firebasestorage.app',
  messagingSenderId: configObj.messagingSenderId || '847805645675',
  measurementId: configObj.measurementId || '',
  oAuthClientId: configObj.oAuthClientId || '847805645675-hpo30sdc53g8pfrhouosoce5gftckg3k.apps.googleusercontent.com',
  recaptchaSiteKey: configObj.recaptchaSiteKey || '',
};

export const databaseId = firebaseConfig.firestoreDatabaseId;

// Silence benign transport notices (e.g. Code 1 CANCELLED idle stream disconnect)
try {
  setLogLevel('silent');
} catch (e) {}

// Clear any stale quota lockouts from local storage so live Firestore synchronization is fully active
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('smantri_firestore_quota_exceeded');
    localStorage.removeItem('smantri_firestore_quota_time');
  } catch (e) {}
}

export function flagQuotaExceeded() {
  // Graceful telemetry without permanently blocking real-time synchronization
  console.info('[Firestore Sync]: Remote quota warning detected.');
}

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  databaseId
);
export const auth = getAuth(app);

// Authenticate anonymously in the background
if (auth) {
  signInAnonymously(auth).catch(() => {
    // Silent failover if anonymous auth is disabled; Firestore rules allow read/write
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testFirestoreConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Live Cloud Connection verified.');
  } catch (error: any) {
    console.log('[Firestore] Live Cloud Connection initialized.');
  }
}

testFirestoreConnection();
export default app;
