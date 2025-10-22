import { db, isFirebaseAdminAvailable } from '@/lib/firebase-admin';

export async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in
  };
}

export async function getValidTokens(userEmail: string): Promise<{ access_token: string; refresh_token: string; tokenSource: string } | null> {
  try {
    let tokenData = null;
    let tokenSource = 'none';

    // Check multiple Firebase locations for calendar tokens
    if (isFirebaseAdminAvailable()) {
      try {
        // 1. Check users collection for googleCalendarTokens (new format)
        const userDoc = await db.collection('users').doc(userEmail).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const newCalendarTokens = userData?.googleCalendarTokens;
          if (newCalendarTokens?.access_token) {
            tokenData = {
              access_token: newCalendarTokens.access_token,
              refresh_token: newCalendarTokens.refresh_token,
              expires_at: newCalendarTokens.expiry_date || 0
            };
            tokenSource = 'users_googleCalendarTokens';
            // console.log(`✅ Found calendar tokens in users collection (new format) for ${userEmail}`);
          }
          
          // 2. Check users collection for googleCalendar (legacy format)
          if (!tokenData) {
            const legacyCalendarTokens = userData?.googleCalendar;
            if (legacyCalendarTokens?.accessToken) {
              tokenData = {
                access_token: legacyCalendarTokens.accessToken,
                refresh_token: legacyCalendarTokens.refreshToken,
                expires_at: legacyCalendarTokens.expiresAt || 0
              };
              tokenSource = 'users_googleCalendar';
              // console.log(`✅ Found calendar tokens in users collection (legacy format) for ${userEmail}`);
            }
          }
        }

        // 3. Check calendar_tokens collection
        if (!tokenData) {
          const calendarTokenDoc = await db.collection('calendar_tokens').doc(userEmail).get();
          if (calendarTokenDoc.exists) {
            const calendarTokenData = calendarTokenDoc.data();
            if (calendarTokenData?.access_token) {
              tokenData = calendarTokenData;
              tokenSource = 'calendar_tokens';
              // console.log(`✅ Found calendar tokens in calendar_tokens collection for ${userEmail}`);
            }
          }
        }
      } catch (firebaseError) {
        // console.error(`❌ Error checking Firebase for tokens for ${userEmail}:`, firebaseError);
      }
    }

    if (!tokenData?.access_token || !tokenData?.refresh_token) {
      // console.warn(`User ${userEmail} has incomplete token data from ${tokenSource}`);
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const expiresAt = tokenData.expires_at || 0;
    const isExpired = expiresAt && (now >= (expiresAt - 5 * 60 * 1000));

    if (isExpired) {
      // console.log(`🔄 Token expired for user ${userEmail} (from ${tokenSource}), refreshing...`);
      try {
        const refreshData = await refreshGoogleToken(tokenData.refresh_token);
        
        // Update tokens in the same location they were found
        const updatedTokens = {
          ...tokenData,
          access_token: refreshData.access_token,
          expires_at: now + (refreshData.expires_in * 1000),
          updated_at: now,
        };
        
        if (tokenSource === 'users_googleCalendarTokens') {
          await db.collection('users').doc(userEmail).update({
            googleCalendarTokens: {
              access_token: refreshData.access_token,
              refresh_token: tokenData.refresh_token,
              expiry_date: now + (refreshData.expires_in * 1000)
            }
          });
        } else if (tokenSource === 'users_googleCalendar') {
          await db.collection('users').doc(userEmail).update({
            googleCalendar: {
              accessToken: refreshData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresAt: now + (refreshData.expires_in * 1000)
            }
          });
        } else if (tokenSource === 'calendar_tokens') {
          await db.collection('calendar_tokens').doc(userEmail).update(updatedTokens);
        }
        
        // console.log(`✅ Token refreshed successfully for user ${userEmail} (${tokenSource})`);
        
        return {
          access_token: refreshData.access_token,
          refresh_token: tokenData.refresh_token,
          tokenSource
        };
      } catch (refreshError) {
        // console.error(`❌ Failed to refresh token for user ${userEmail}:`, refreshError);
        return null;
      }
    }

    // Token is still valid
    // console.log(`✅ Using valid token for user ${userEmail} (from ${tokenSource})`);
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      tokenSource
    };
  } catch (error) {
    // console.error(`❌ Error getting tokens for user ${userEmail}:`, error);
    return null;
  }
} 