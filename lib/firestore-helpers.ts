import { db } from '@/lib/firebase-admin';

interface NylasToken {
  accessToken: string;
  provider: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTokenFromFirestore(email: string): Promise<NylasToken | null> {
  try {
    const tokenDoc = await db.collection('nylas_tokens').doc(email).get();
    
    if (!tokenDoc.exists) {
      return null;
    }
    
    const data = tokenDoc.data();
    return {
      accessToken: data?.accessToken,
      provider: data?.provider || 'nylas',
      email: data?.email,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    };
  } catch (error) {
    // console.error('Error getting Nylas token:', error);
    return null;
  }
}

export async function saveTokenToFirestore(email: string, token: Partial<NylasToken>) {
  try {
    await db.collection('nylas_tokens').doc(email).set({
      ...token,
      updatedAt: new Date(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    // console.error('Error saving Nylas token:', error);
    return false;
  }
}

export async function deleteTokenFromFirestore(email: string) {
  try {
    await db.collection('nylas_tokens').doc(email).delete();
    return true;
  } catch (error) {
    // console.error('Error deleting Nylas token:', error);
    return false;
  }
} 