import { db } from './firebase-admin';
import { UserSettings } from './user-settings';

export async function getUserSettingsAdmin(email: string): Promise<UserSettings | null> {
  const userDoc = await db.collection('user_settings').doc(email).get();
  return userDoc.exists ? userDoc.data() as UserSettings : null;
}

export async function disableAutoProcessingAdmin(email: string): Promise<void> {
  await Promise.all([
    // Update Gmail settings
    db.collection('gmail_settings').doc(email).set({
      autoProcessing: false,
      processingStatus: null,
      lastProcessedTime: null
    }, { merge: true })
  ]);
} 