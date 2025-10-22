import { db, isFirebaseAdminAvailable } from './firebase-admin';

// Type definitions for user profile data
export interface UserProfile {
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  platform?: string;
}

// Extract user's name from stored Gmail token data
export async function getGmailUserProfile(userEmail: string): Promise<UserProfile | null> {
  // console.log('🔍 Getting Gmail user profile for:', userEmail);
  
  if (!isFirebaseAdminAvailable()) {
    // console.error('❌ Firebase Admin not available');
    return null;
  }
  
  try {
    const userDocRef = db.collection('gmail_tokens').doc(userEmail);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      // console.error('❌ No Gmail token data found for user:', userEmail);
      return null;
    }
    
    const tokenData = userDoc.data();
    
    const profile: UserProfile = {
      email: tokenData?.user_email || userEmail,
      name: tokenData?.user_name,
      given_name: tokenData?.user_given_name,
      family_name: tokenData?.user_family_name,
      picture: tokenData?.user_picture,
      platform: tokenData?.platform,
    };
    
    // console.log('✅ User profile retrieved:', {
//       email: profile.email,
//       name: profile.name,
//       given_name: profile.given_name,
//       family_name: profile.family_name,
//       has_picture: !!profile.picture,
//       platform: profile.platform
//     });
    
    return profile;
  } catch (error) {
    // console.error('❌ Error retrieving user profile:', error);
    return null;
  }
}

// Get user's display name (fallback logic)
export function getDisplayName(profile: UserProfile): string {
  // Try full name first
  if (profile.name) {
    return profile.name;
  }
  
  // Try combining first and last name
  if (profile.given_name && profile.family_name) {
    return `${profile.given_name} ${profile.family_name}`;
  }
  
  // Try just first name
  if (profile.given_name) {
    return profile.given_name;
  }
  
  // Try just last name
  if (profile.family_name) {
    return profile.family_name;
  }
  
  // Fallback to email prefix (formatted)
  const emailPrefix = profile.email.split('@')[0];
  return emailPrefix.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
}

// Get user's first name (for more personal communication)
export function getFirstName(profile: UserProfile): string {
  // Try given name first
  if (profile.given_name) {
    return profile.given_name;
  }
  
  // Try extracting first word from full name
  if (profile.name) {
    return profile.name.split(' ')[0];
  }
  
  // Fallback to email prefix (first part if separated by dots)
  const emailPrefix = profile.email.split('@')[0];
  const firstPart = emailPrefix.split('.')[0];
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

// Example usage for email templates
export async function getPersonalizedGreeting(userEmail: string): Promise<string> {
  const profile = await getGmailUserProfile(userEmail);
  
  if (!profile) {
    return 'Hello';
  }
  
  const firstName = getFirstName(profile);
  return `Hello ${firstName}`;
}

// Example usage for email signatures
export async function getEmailSignature(userEmail: string): Promise<string> {
  const profile = await getGmailUserProfile(userEmail);
  
  if (!profile) {
    // Fallback signature using email
    const emailPrefix = userEmail.split('@')[0];
    const formattedName = emailPrefix.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
    return ''; // Note: Removed personalized signature as requested
  }
  
  const displayName = getDisplayName(profile);
  return ''; // Note: Removed personalized signature as requested
} 

// Check if there are already replies written for a Gmail thread
export async function checkGmailExistingReplies(gmail: any, threadId: string, userEmail: string): Promise<boolean> {
  try {
    // console.log(`🔍 Checking for existing replies in Gmail thread ${threadId}...`);
    
    // Get all messages in the thread
    const threadResponse = await gmail.users.threads.get({
      userId: 'me',
      id: threadId
    });
    
    if (!threadResponse.data.messages || threadResponse.data.messages.length === 0) {
      // console.log(`⚠️ No messages found in Gmail thread ${threadId}`);
      return false;
    }
    
    // console.log(`📧 Found ${threadResponse.data.messages.length} messages in Gmail thread ${threadId}`);
    
    // Check if any messages in the thread are from the user (indicating they've already replied)
    const userReplies = threadResponse.data.messages.filter(message => {
      const headers = message.payload?.headers || [];
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';
      return fromHeader.toLowerCase().includes(userEmail.toLowerCase());
    });
    
    if (userReplies.length > 0) {
      // console.log(`⏭️ Found ${userReplies.length} existing replies from user in Gmail thread ${threadId}`);
      userReplies.forEach((reply, index) => {
        const headers = reply.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const date = new Date(parseInt(reply.internalDate || '0')).toISOString();
        // console.log(`  Reply ${index + 1}: "${subject}" on ${date}`);
      });
      return true;
    }
    
    // Also check for existing drafts in this thread
    const existingDrafts = await gmail.users.drafts.list({
      userId: 'me',
      q: `in:draft thread:${threadId}`
    });
    
    if (existingDrafts.data.drafts && existingDrafts.data.drafts.length > 0) {
      // console.log(`⏭️ Found ${existingDrafts.data.drafts.length} existing drafts in Gmail thread ${threadId}`);
      existingDrafts.data.drafts.forEach((draft, index) => {
        const subject = draft.message?.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No subject';
        // console.log(`  Draft ${index + 1}: "${subject}"`);
      });
      return true;
    }
    
    // console.log(`✅ No existing replies or drafts found in Gmail thread ${threadId}`);
    return false;
    
  } catch (error) {
    // console.error(`❌ Error checking for existing replies in Gmail thread ${threadId}:`, error);
    // If we can't check, assume there might be replies to be safe
    return true;
  }
} 