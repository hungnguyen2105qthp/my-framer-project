import { db, isFirebaseAdminAvailable } from './firebase-admin';

export interface NylasUserProfile {
  given_name?: string;
  family_name?: string;
  name?: string;
  email?: string;
  picture?: string;
  provider?: string;
}

// Extract user profile from Nylas id_token
export async function extractNylasUserProfile(userEmail: string): Promise<NylasUserProfile> {
  try {
    if (!isFirebaseAdminAvailable()) {
      // console.warn('⚠️ Firebase Admin not available for Nylas profile extraction');
      return {};
    }

    // Get the Nylas token data from Firestore
    const tokenDoc = await db.collection('nylas_tokens').doc(userEmail).get();
    
    if (!tokenDoc.exists) {
      // console.log('❌ No Nylas token found for user:', userEmail);
      return {};
    }

    const tokenData = tokenDoc.data();
    
    // Check if we have id_token stored
    if (!tokenData?.id_token) {
      // console.log('❌ No id_token found in Nylas token data for user:', userEmail);
      return {};
    }

    // Decode the id_token (JWT payload)
    const idToken = tokenData.id_token;
    const decodedProfile = decodeNylasIdToken(idToken);
    
    if (decodedProfile) {
      // console.log('✅ Extracted Nylas user profile:', {
//         email: decodedProfile.email,
//         given_name: decodedProfile.given_name,
//         family_name: decodedProfile.family_name,
//         name: decodedProfile.name,
//         provider: decodedProfile.provider
//       });
      
      // Store the extracted profile data back to Firestore for future use
      await storeNylasUserProfile(userEmail, decodedProfile);
      
      return decodedProfile;
    }

    return {};
  } catch (error) {
    // console.error('❌ Error extracting Nylas user profile:', error);
    return {};
  }
}

// Decode Nylas id_token to extract user profile information
function decodeNylasIdToken(idToken: string): NylasUserProfile | null {
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = idToken.split('.');
    
    if (parts.length !== 3) {
      // console.error('❌ Invalid JWT token format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64
    const decodedPayload = Buffer.from(paddedPayload, 'base64').toString('utf-8');
    
    // Parse JSON
    const profileData = JSON.parse(decodedPayload);
    
    // Extract relevant profile information
    const profile: NylasUserProfile = {
      email: profileData.email,
      given_name: profileData.given_name || profileData.givenName,
      family_name: profileData.family_name || profileData.familyName,
      name: profileData.name,
      picture: profileData.picture,
      provider: profileData.provider
    };

    return profile;
  } catch (error) {
    // console.error('❌ Error decoding Nylas id_token:', error);
    return null;
  }
}

// Store extracted Nylas user profile in Firestore
async function storeNylasUserProfile(userEmail: string, profile: NylasUserProfile): Promise<void> {
  try {
    if (!isFirebaseAdminAvailable()) {
      return;
    }

    const profileData = {
      ...profile,
      extracted_at: Date.now(),
      source: 'nylas_id_token'
    };

    // Store in nylas_tokens collection with user profile data
    const userDocRef = db.collection('nylas_tokens').doc(userEmail);
    await userDocRef.update({
      user_profile: profileData
    });

    // console.log('✅ Nylas user profile stored in Firestore for:', userEmail);
  } catch (error) {
    // console.error('❌ Error storing Nylas user profile:', error);
  }
}

// Get user's full name from Nylas profile
export function getNylasFullName(profile: NylasUserProfile): string {
  if (profile.name) {
    return profile.name;
  }
  
  if (profile.given_name && profile.family_name) {
    return `${profile.given_name} ${profile.family_name}`;
  }
  
  if (profile.given_name) {
    return profile.given_name;
  }
  
  return '';
}

// Get user's first name from Nylas profile
export function getNylasFirstName(profile: NylasUserProfile): string {
  if (profile.given_name) {
    return profile.given_name;
  }
  
  if (profile.name) {
    return profile.name.split(' ')[0];
  }
  
  return '';
}

// Get user's last name from Nylas profile
export function getNylasLastName(profile: NylasUserProfile): string {
  if (profile.family_name) {
    return profile.family_name;
  }
  
  if (profile.name) {
    const nameParts = profile.name.split(' ');
    return nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  }
  
  return '';
} 