import { initializeApp, getApp, FirebaseApp } from "firebase/app";

import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

// Initialize Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3RC-nn54hwzlM6ZUUFryWqLnR4tOctB0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "descript-15fab.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "descript-15fab",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "descript-15fab.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "619700216448",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:619700216448:web:0dadd2cc00bd80b8b2bc65"
};

// Check if we're running on the client side
const isClient = typeof window !== 'undefined';

// Initialize Firebase app
let app: FirebaseApp;
try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

// Initialize and export auth
export const auth = getAuth(app);

// Set auth persistence
if (isClient) {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      // console.error('Error setting auth persistence:', error);
    });
}

// Initialize and export Google provider with calendar permissions
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
// Add calendar scopes for seamless onboarding;

// Initialize and export Firestore
export const db = getFirestore(app);

// Initialize and export Storage
export const storage = getStorage(app);

// Initialize and export Functions (client-side only)
export const functions = isClient ? getFunctions(app) : null;

// Connect to Functions emulator in development
if (isClient && process.env.NODE_ENV === 'development' && functions) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    // Already connected or error connecting
  }
}

// Analytics removed - no longer needed

// For backward compatibility
export function getFirebaseAuth(): Auth {
  return auth;
}

export function getFirebaseDb(): Firestore {
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  return storage;
}

export function getFirebaseFunctions(): Functions | null {
  return functions;
}

// Analytics functions removed - no longer needed

export function getGoogleProvider(): GoogleAuthProvider {
  return googleProvider;
}