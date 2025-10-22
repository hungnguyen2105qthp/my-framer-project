import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function checkUserAuthorization(email: string): Promise<boolean> {
  try {
    const authorizedUsersRef = collection(db, 'authorizedUsers')
    const snapshot = await getDocs(authorizedUsersRef)
    
    const authorizedEmails = snapshot.docs.map(doc => doc.data().email)
    return authorizedEmails.includes(email)
  } catch (error) {
    console.error('Error checking user authorization:', error)
    return false
  }
}

export async function getAuthorizedUsers() {
  try {
    const authorizedUsersRef = collection(db, 'authorizedUsers')
    const snapshot = await getDocs(authorizedUsersRef)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching authorized users:', error)
    return []
  }
}