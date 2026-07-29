/**
 * ============================================================
 * Firebase Configuration & Initialization
 * Project: school-project-d725e
 * ============================================================
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// ── Helper: read env from Vite or Node ────────────────────────────
const getEnv = (key: string, fallback = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

// ── Firebase project config ───────────────────────────────────────
// Values are read from .env (VITE_FIREBASE_*) with hardcoded fallbacks
// so the app works correctly even if Vite hasn't loaded env yet.
const firebaseConfig = {
  apiKey:            getEnv('VITE_FIREBASE_API_KEY',            'AIzaSyANFgwZ6gg85rw7JQ6Q2htp-LHf_Npe9iU'),
  authDomain:        getEnv('VITE_FIREBASE_AUTH_DOMAIN',        'school-project-d725e.firebaseapp.com'),
  databaseURL:       getEnv('VITE_FIREBASE_DATABASE_URL',       'https://school-project-d725e-default-rtdb.firebaseio.com'),
  projectId:         getEnv('VITE_FIREBASE_PROJECT_ID',         'school-project-d725e'),
  storageBucket:     getEnv('VITE_FIREBASE_STORAGE_BUCKET',     'school-project-d725e.firebasestorage.app'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID','790528248308'),
  appId:             getEnv('VITE_FIREBASE_APP_ID',             '1:790528248308:web:51e7c307c2717aa443d1a1'),
  measurementId:     getEnv('VITE_FIREBASE_MEASUREMENT_ID',     'G-EWXWS20LP5'),
};

/**
 * Returns true when Firebase is properly configured (always true here
 * since we have hardcoded fallback values).
 */
export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// ── App singleton (safe for Vite HMR hot-reload) ─────────────────
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/** Firebase Auth instance */
export const auth: Auth = getAuth(app);

// Enforce browserLocalPersistence so logged-in users NEVER get logged out when closing tab/browser
setPersistence(auth, browserLocalPersistence).catch(() => null);

/** Firestore database instance */
export const db: Firestore = getFirestore(app);

export default app;
