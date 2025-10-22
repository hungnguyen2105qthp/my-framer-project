// User settings types
interface EmailCategorization {
  toRespond: boolean;
  fyi: boolean;
  comment: boolean;
  notification: boolean;
  meetingUpdate: boolean;
  awaitingReply: boolean;
  actioned: boolean;
  advertisement: boolean;
}

interface EmailPreferences {
  emailCategorization: EmailCategorization;
  respectUserLabels: boolean;
  emailRules: string[];
  alternativeEmails: string[];
  responseThreshold: string;
  advertisementStrictness: string;
}

interface DraftSettings {
  draftReplies: boolean;
  draftPrompt: string;
  emailSignature: string;
  signatureFont: string;
  signatureFontSize: number;
  signatureFontColor: string;
}

interface FollowUpSettings {
  followUps: boolean;
  followUpDays: number;
}

interface EmailProcessingStatus {
  initialProcessingComplete: boolean;
  lastProcessed: string | null;
}

interface EmailLabels {
  [key: string]: boolean;
}

export interface UserSettings {
  // Email Processing Settings
  autoProcessingEnabled: boolean;
  pollingEnabled: boolean;
  webhookSetup: boolean;
  watchExpiration: string | null;
  historyId: string | null;
  
  // Email Processing Status
  emailProcessing: EmailProcessingStatus;
  
  // Email Labels
  emailLabels?: EmailLabels;
  
  // Email Preferences
  emailPreferences: EmailPreferences;
  
  // Draft Settings
  draftSettings: DraftSettings;
  
  // Follow-up Settings
  followUpSettings: FollowUpSettings;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
  userEmail?: string;
  autoProcessing?: boolean;
  processingStatus?: string | null;
  lastProcessedTime?: number | null;
  email: string;
  onboardingStarted: boolean;
  onboardingCompleted: boolean;
}

// Default user settings
const DEFAULT_USER_SETTINGS: UserSettings = {
  // Email Processing Settings
  autoProcessingEnabled: false,
  pollingEnabled: false,
  webhookSetup: false,
  watchExpiration: null,
  historyId: null,
  
  // Email Processing Status
  emailProcessing: {
    initialProcessingComplete: false,
    lastProcessed: null
  },
  
  // Email Preferences
  emailPreferences: {
    emailCategorization: {
      toRespond: true,
      fyi: true,
      comment: true,
      notification: true,
      meetingUpdate: true,
      awaitingReply: true,
      actioned: true,
      advertisement: true,
    },
    respectUserLabels: true,
    emailRules: [],
    alternativeEmails: [],
    responseThreshold: 'med-high',
          advertisementStrictness: 'cold-unknown',
  },
  
  // Draft Settings
  draftSettings: {
    draftReplies: false,
    draftPrompt: '',
    emailSignature: '',
    signatureFont: 'default',
    signatureFontSize: 0,
    signatureFontColor: '#000000',
  },
  
  // Follow-up Settings
  followUpSettings: {
    followUps: false,
    followUpDays: 3,
  },
  email: '',
  onboardingStarted: true,
  onboardingCompleted: false
};

export async function initializeUserSettings(userEmail: string) {
  if (!userEmail) return null;
  
  try {
    const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');
    const { getFirebaseDb } = await import('./firebase');
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', userEmail);
    
    // Check if settings already exist
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new settings with defaults
      const newSettings = {
        ...DEFAULT_USER_SETTINGS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        email: userEmail,
        onboardingStarted: true,
        onboardingCompleted: false
      };
      
      await setDoc(userRef, newSettings);
      // console.log('✅ Initialized default user settings in users collection for:', userEmail);
      return newSettings;
    }
    
    return userDoc.data() as UserSettings;
  } catch (error) {
    // console.error('❌ Error initializing user settings:', error);
    return null;
  }
}

export async function updateUserSettings(userEmail: string, updates: Partial<UserSettings>) {
  if (!userEmail) return false;
  
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const { getFirebaseDb } = await import('./firebase');
    const db = getFirebaseDb();
    const userSettingsRef = doc(db, 'userSettings', userEmail);
    
    await setDoc(userSettingsRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // console.log('✅ Updated user settings for:', userEmail);
    return true;
  } catch (error) {
    // console.error('❌ Error updating user settings:', error);
    return false;
  }
}

export async function getUserSettings(email: string): Promise<UserSettings | null> {
  // This function uses firebase-admin and should only be called from server-side code
  // For client components, use an API route instead
  throw new Error('getUserSettings should only be called from server-side code. Use an API route for client components.');
}

export async function disableAutoProcessing(email: string): Promise<void> {
  // This function uses firebase-admin and should only be called from server-side code
  // For client components, use an API route instead
  throw new Error('disableAutoProcessing should only be called from server-side code. Use an API route for client components.');
} 