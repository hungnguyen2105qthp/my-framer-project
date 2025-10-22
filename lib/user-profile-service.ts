import { User } from 'firebase/auth';
import { db, isFirebaseAdminAvailable } from './firebase-admin';

// Type definitions for user profile
export interface UserProfileData {
  uid: string;
  email: string;
  display_name?: string;
  given_name?: string;
  family_name?: string;
  photo_url?: string;
  provider: string;
  created_at: number;
  updated_at: number;
  last_signin: number;
}

// Extract user profile information from Firebase auth result
export function extractUserProfile(user: User): UserProfileData {
  // console.log('📋 Extracting user profile from Firebase auth:', {
//     uid: user.uid,
//     email: user.email,
//     displayName: user.displayName,
//     photoURL: user.photoURL,
//     providerId: user.providerData[0]?.providerId
//   });

  // Parse display name into given and family names
  let given_name: string | undefined;
  let family_name: string | undefined;
  
  if (user.displayName) {
    const nameParts = user.displayName.trim().split(' ');
    if (nameParts.length >= 2) {
      given_name = nameParts[0];
      family_name = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      given_name = nameParts[0];
    }
  }

  const profile: UserProfileData = {
    uid: user.uid,
    email: user.email || '',
    display_name: user.displayName || undefined,
    given_name,
    family_name,
    photo_url: user.photoURL || undefined,
    provider: user.providerData[0]?.providerId || 'unknown',
    created_at: Date.now(),
    updated_at: Date.now(),
    last_signin: Date.now()
  };

  // console.log('✅ User profile extracted:', {
//     email: profile.email,
//     display_name: profile.display_name,
//     given_name: profile.given_name,
//     family_name: profile.family_name,
//     has_photo: !!profile.photo_url,
//     provider: profile.provider
//   });

  return profile;
}

// Store user profile in Firestore
export async function storeUserProfile(profile: UserProfileData): Promise<boolean> {
  // console.log('💾 Storing user profile in Firestore...');
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available - cannot store user profile');
    return false;
  }

  try {
    // Store in all necessary collections
    const batch = db.batch();
    
    // 1. Store by UID (primary user profile)
    const userProfileRef = db.collection('user_profiles').doc(profile.uid);
    batch.set(userProfileRef, profile, { merge: true });
    
    // 2. Store by email (for Gmail integration lookups)
    if (profile.email) {
      const emailProfileRef = db.collection('user_profiles_by_email').doc(profile.email);
      batch.set(emailProfileRef, profile, { merge: true });

      // 3. Initialize user document in users collection
      const userDocRef = db.collection('users').doc(profile.email);
      batch.set(userDocRef, {
        email: profile.email,
        name: profile.display_name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingStarted: false,
        onboardingCompleted: false,
        
        // Integration Data (initialized as null)
        slackIntegration: null,
        notionIntegration: null,
        hubspotIntegration: null,
        salesforceIntegration: null,
        linearIntegration: null,
        attioIntegration: null,
        mondayIntegration: null,

        // Email Processing Settings
        emailProcessing: {
          autoProcessingEnabled: false,
          pollingEnabled: false,
          webhookSetup: false,
          watchExpiration: null,
          historyId: null,
          status: 'idle',
          lastProcessedTime: null
        },

        // Email Preferences
        emailPreferences: {
          processNewEmails: true,
          processExistingEmails: true,
          includeAttachments: true,
          maxEmailsPerBatch: 50
        },

        // Draft Settings
        draftSettings: {
          enabled: true,
          useAI: true,
          includeContext: true,
          style: 'professional'
        },

        // Follow-up Settings
        followUpSettings: {
          enabled: true,
          reminderDays: 3,
          autoFollowUp: false
        }
      }, { merge: true });
    }
    
    await batch.commit();
    
    // console.log('✅ User profile stored successfully:', {
//       uid: profile.uid,
//       email: profile.email,
//       display_name: profile.display_name
//     });
    
    return true;
  } catch (error) {
    // console.error('❌ Error storing user profile:', error);
    return false;
  }
}

// Get user profile by email (for Gmail integration)
export async function getUserProfileByEmail(email: string): Promise<UserProfileData | null> {
  // console.log('🔍 Getting user profile by email:', email);
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available');
    return null;
  }

  try {
    const profileDoc = await db.collection('user_profiles_by_email').doc(email).get();
    
    if (!profileDoc.exists) {
      // console.log('❌ No user profile found for email:', email);
      return null;
    }
    
    const profileData = profileDoc.data() as UserProfileData;
    // console.log('✅ User profile retrieved:', {
//       email: profileData.email,
//       display_name: profileData.display_name,
//       given_name: profileData.given_name,
//       family_name: profileData.family_name
//     });
    
    return profileData;
  } catch (error) {
    // console.error('❌ Error retrieving user profile:', error);
    return null;
  }
}

// Get user profile by UID
export async function getUserProfileByUID(uid: string): Promise<UserProfileData | null> {
  // console.log('🔍 Getting user profile by UID:', uid);
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available');
    return null;
  }

  try {
    const profileDoc = await db.collection('user_profiles').doc(uid).get();
    
    if (!profileDoc.exists) {
      // console.log('❌ No user profile found for UID:', uid);
      return null;
    }
    
    const profileData = profileDoc.data() as UserProfileData;
    // console.log('✅ User profile retrieved:', {
//       uid: profileData.uid,
//       email: profileData.email,
//       display_name: profileData.display_name
//     });
    
    return profileData;
  } catch (error) {
    // console.error('❌ Error retrieving user profile:', error);
    return null;
  }
}

// Update last signin time
export async function updateLastSignin(email: string): Promise<void> {
  if (!isFirebaseAdminAvailable() || !email) return;

  try {
    const updateData = {
      last_signin: Date.now(),
      updated_at: Date.now()
    };

    const batch = db.batch();
    
    // Update both collections
    const emailProfileRef = db.collection('user_profiles_by_email').doc(email);
    batch.update(emailProfileRef, updateData);
    
    await batch.commit();
    
    // console.log('✅ Last signin updated for:', email);
  } catch (error) {
    // console.warn('⚠️ Could not update last signin:', error);
  }
}

// Utility functions for name formatting
export function getDisplayName(profile: UserProfileData): string {
  if (profile.display_name) {
    return profile.display_name;
  }
  
  if (profile.given_name && profile.family_name) {
    return `${profile.given_name} ${profile.family_name}`;
  }
  
  if (profile.given_name) {
    return profile.given_name;
  }
  
  // Fallback to email prefix
  const emailPrefix = profile.email.split('@')[0];
  return emailPrefix.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
}

export function getFirstName(profile: UserProfileData): string {
  if (profile.given_name) {
    return profile.given_name;
  }
  
  if (profile.display_name) {
    return profile.display_name.split(' ')[0];
  }
  
  // Fallback to email prefix first part
  const emailPrefix = profile.email.split('@')[0];
  const firstPart = emailPrefix.split('.')[0];
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
} 