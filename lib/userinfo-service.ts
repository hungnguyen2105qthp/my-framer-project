import { db, isFirebaseAdminAvailable } from './firebase-admin';

// Type definitions for user info (similar to UserProfileData but with email as document ID)
export interface UserInfoData {
  uid: string;
  email: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  provider: string;
  created_at: number;
  updated_at: number;
  last_signin: number;
}

// Store user info in userinfo collection with email as document ID
export async function storeUserInfo(userInfo: UserInfoData): Promise<boolean> {
  // console.log('💾 Storing user info in userinfo collection...');
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available - cannot store user info');
    return false;
  }

  try {
    const userInfoRef = db.collection('userinfo').doc(userInfo.email);
    await userInfoRef.set(userInfo, { merge: true });
    
    // console.log('✅ User info stored successfully in userinfo collection:', {
//       email: userInfo.email,
//       first_name: userInfo.first_name,
//       last_name: userInfo.last_name,
//       display_name: userInfo.display_name
//     });
    
    return true;
  } catch (error) {
    // console.error('❌ Error storing user info:', error);
    return false;
  }
}

// Get user info by email from userinfo collection
export async function getUserInfoByEmail(email: string): Promise<UserInfoData | null> {
  // console.log('🔍 Getting user info from userinfo collection for:', email);
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available - cannot get user info');
    return null;
  }

  try {
    const userInfoRef = db.collection('userinfo').doc(email);
    const userInfoDoc = await userInfoRef.get();
    
    if (!userInfoDoc.exists) {
      // console.log('⚠️ No user info found for email:', email);
      return null;
    }

    const userInfo = userInfoDoc.data() as UserInfoData;
    // console.log('✅ Retrieved user info from userinfo collection:', {
//       email: userInfo.email,
//       first_name: userInfo.first_name,
//       last_name: userInfo.last_name,
//       display_name: userInfo.display_name
//     });
    
    return userInfo;
  } catch (error) {
    // console.error('❌ Error getting user info:', error);
    return null;
  }
}

// Get user info by UID from userinfo collection
export async function getUserInfoByUID(uid: string): Promise<UserInfoData | null> {
  // console.log('🔍 Getting user info from userinfo collection for UID:', uid);
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available - cannot get user info');
    return null;
  }

  try {
    const userInfoQuery = await db.collection('userinfo').where('uid', '==', uid).limit(1).get();
    
    if (userInfoQuery.empty) {
      // console.log('⚠️ No user info found for UID:', uid);
      return null;
    }

    const userInfoDoc = userInfoQuery.docs[0];
    const userInfo = userInfoDoc.data() as UserInfoData;
    
    // console.log('✅ Retrieved user info from userinfo collection by UID:', {
//       email: userInfo.email,
//       first_name: userInfo.first_name,
//       last_name: userInfo.last_name,
//       display_name: userInfo.display_name
//     });
    
    return userInfo;
  } catch (error) {
    // console.error('❌ Error getting user info by UID:', error);
    return null;
  }
}

// Get user's full name from userinfo collection
export async function getUserFullName(email: string): Promise<string> {
  const userInfo = await getUserInfoByEmail(email);
  
  if (userInfo?.first_name && userInfo?.last_name) {
    return `${userInfo.first_name} ${userInfo.last_name}`;
  } else if (userInfo?.first_name) {
    // Only use first name if last name is not available
    return userInfo.first_name;
  } else if (userInfo?.display_name) {
    return userInfo.display_name;
  }
  
  // Never use email as fallback - return empty string instead
  return '';
}

// Get user's first name from userinfo collection
export async function getUserFirstName(email: string): Promise<string> {
  const userInfo = await getUserInfoByEmail(email);
  
  if (userInfo?.first_name) {
    return userInfo.first_name;
  } else if (userInfo?.display_name) {
    // Try to extract first name from display name
    const nameParts = userInfo.display_name.split(' ');
    return nameParts[0] || '';
  }
  
  // Never use email as fallback - return empty string instead
  return '';
}

// Get user's last name from userinfo collection
export async function getUserLastName(email: string): Promise<string> {
  const userInfo = await getUserInfoByEmail(email);
  
  if (userInfo?.last_name) {
    return userInfo.last_name;
  } else if (userInfo?.display_name) {
    // Try to extract last name from display name
    const nameParts = userInfo.display_name.split(' ');
    return nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  }
  
  return '';
}

// Update last signin timestamp for user
export async function updateLastSignin(email: string): Promise<void> {
  // console.log('🕐 Updating last signin for:', email);
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available');
    return;
  }

  try {
    const userInfoRef = db.collection('userinfo').doc(email);
    await userInfoRef.update({
      last_signin: Date.now(),
      updated_at: Date.now()
    });
    
    // console.log('✅ Last signin updated for:', email);
  } catch (error) {
    // console.error('❌ Error updating last signin:', error);
  }
}

// Get display name from user info
export function getDisplayName(userInfo: UserInfoData): string {
  if (userInfo.display_name) {
    return userInfo.display_name;
  }
  
  if (userInfo.first_name && userInfo.last_name) {
    return `${userInfo.first_name} ${userInfo.last_name}`;
  }
  
  if (userInfo.first_name) {
    return userInfo.first_name;
  }
  
  // Never use email as fallback - return empty string instead
  return '';
}

// Get first name from user info
export function getFirstName(userInfo: UserInfoData): string {
  if (userInfo.first_name) {
    return userInfo.first_name;
  }
  
  if (userInfo.display_name) {
    const nameParts = userInfo.display_name.trim().split(' ');
    return nameParts[0] || '';
  }
  
  return '';
}

// Get last name from user info
export function getLastName(userInfo: UserInfoData): string {
  if (userInfo.last_name) {
    return userInfo.last_name;
  }
  
  if (userInfo.display_name) {
    const nameParts = userInfo.display_name.trim().split(' ');
    if (nameParts.length >= 2) {
      return nameParts.slice(1).join(' ');
    }
  }
  
  return '';
}

// Get full name from user info
export function getFullName(userInfo: UserInfoData): string {
  if (userInfo.first_name && userInfo.last_name) {
    return `${userInfo.first_name} ${userInfo.last_name}`;
  }
  
  if (userInfo.display_name) {
    return userInfo.display_name;
  }
  
  // Never use email as fallback - return empty string instead
  return '';
} 