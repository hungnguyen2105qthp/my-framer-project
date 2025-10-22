// Server-side only Firebase Admin configuration
// This file should only be imported in API routes or server components

import * as admin from 'firebase-admin';

// Initialize services (will be set after proper initialization)
let db: any = null;
let auth: any = null;
let storage: any = null;
let FieldValue: any = null;

// Initialize Firebase Admin only on the server side
if (typeof window === 'undefined') {
  try {
    // Get environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('🔍 Firebase Admin Config Check:');
    console.log('- Project ID:', projectId ? '✅ Set' : '❌ Missing');
    console.log('- Client Email:', clientEmail ? '✅ Set' : '❌ Missing');
    console.log('- Private Key:', privateKey ? '✅ Set' : '❌ Missing');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️ Firebase Admin credentials missing - some features may not work');
    }

    // Helper function to fix private key formatting
    function formatPrivateKey(key: string): string {
      if (!key) return key;
      
      // Remove any extra quotes and whitespace
      key = key.trim();
      
      // Remove surrounding quotes if present
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
      }
      
      // Handle different newline formats
      // Replace literal \n with actual newlines
      key = key.replace(/\\n/g, '\n');
      
      // Also handle cases where newlines might be encoded differently
      key = key.replace(/\\\\n/g, '\n');
      
      // Ensure proper key format
      if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
        // console.error('❌ Private key missing BEGIN header');
        throw new Error('Invalid private key format: missing BEGIN header');
      }
      
      if (!key.includes('-----END PRIVATE KEY-----')) {
        // console.error('❌ Private key missing END header');
        throw new Error('Invalid private key format: missing END header');
      }
      
      return key;
    }

    const apps = admin.apps;
    
    if (!apps.length && projectId && clientEmail && privateKey) {
      try {
        // Try multiple private key formatting approaches
        let formattedPrivateKey = privateKey;
        let initializationSuccess = false;
        
        // Method 1: Standard formatting
        try {
          formattedPrivateKey = formatPrivateKey(privateKey);
          const credential = admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedPrivateKey,
          });
          
          admin.initializeApp({
            credential,
            projectId,
          });
          
          initializationSuccess = true;
          // console.log('✅ Firebase Admin initialized with standard formatting');
        } catch (method1Error) {
          // console.log('⚠️ Standard formatting failed, trying alternative...');
        }
        
        // Method 2: Alternative formatting if Method 1 failed
        if (!initializationSuccess) {
          try {
            // Try with raw private key (some platforms handle this better)
            const credential = admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey,
            });
            
            admin.initializeApp({
              credential,
              projectId,
            });
            
            initializationSuccess = true;
            // console.log('✅ Firebase Admin initialized with raw private key');
          } catch (method2Error) {
            // console.log('⚠️ Raw private key failed, trying environment variable approach...');
          }
        }
        
        // Method 3: Use environment variable directly
        if (!initializationSuccess) {
          try {
            const credential = admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: process.env.FIREBASE_PRIVATE_KEY,
            });
            
            admin.initializeApp({
              credential,
              projectId,
            });
            
            initializationSuccess = true;
            // console.log('✅ Firebase Admin initialized with direct env variable');
          } catch (method3Error) {
            throw new Error('All private key formatting methods failed');
          }
        }
        
        // Validate credentials before proceeding
        if (formattedPrivateKey.includes('YOUR_ACTUAL_PRIVATE_KEY_HERE') || formattedPrivateKey.length < 100) {
          console.error('❌ Firebase Admin credentials not properly configured');
          throw new Error('Invalid private key: appears to be placeholder or too short');
        }
        
        console.log('✅ Firebase Admin initialized successfully with project:', projectId);
        
        // Initialize services after successful initialization
        db = admin.firestore();
        auth = admin.auth();
        storage = admin.storage();
        FieldValue = admin.firestore.FieldValue;
        
        console.log('🔍 Firebase services initialized successfully');
        
      } catch (error: any) {
        console.error('❌ Firebase Admin initialization failed:', {
          message: error.message,
          code: error.code,
          stack: error.stack?.split('\n')[0]
        });
        
        // Provide more specific error messages
        if (error.message?.includes('DECODER routines::unsupported')) {
          // console.error('💡 This is likely a private key formatting issue. Check that:');
          // console.error('   - FIREBASE_PRIVATE_KEY is properly escaped in environment variables');
          // console.error('   - Newlines in the key are represented as \\n');
          // console.error('   - The key includes proper BEGIN/END headers');
        }
        
        if (error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
          // console.error('💡 This appears to be a network connectivity issue');
        }
        
        // Don't throw error to prevent server crash - just log and continue
        // console.warn('⚠️ Firebase Admin not available - token storage will fail');
      }
    } else if (apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      try {
        // Initialize services from existing app
        db = admin.firestore();
        auth = admin.auth();
        storage = admin.storage();
        FieldValue = admin.firestore.FieldValue;
        console.log('🔍 Firebase services initialized from existing app');
      } catch (error) {
        console.error('❌ Error getting Firebase services from existing app:', error);
      }
    } else {
      // console.warn('⚠️ Firebase Admin not initialized - credentials not provided');
    }
  } catch (error) {
    // console.error('❌ Failed to load Firebase Admin:', error);
  }
}

// Export services and utilities
export { db, auth, storage, FieldValue };

// Export db as adminDb for backward compatibility
export const adminDb = db;

// Helper function to check if Firebase Admin is available
export function isFirebaseAdminAvailable(): boolean {
  return db !== null && auth !== null;
}

// Helper function to safely use db with error handling
export async function safeFirestoreOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!db) {
    // console.error('❌ Firestore operation failed: Firebase Admin not available');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    // console.error('❌ Firestore operation failed:', error);
    return fallback;
  }
} 