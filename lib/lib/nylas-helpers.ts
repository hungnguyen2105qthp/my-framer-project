import Nylas from 'nylas';

export async function initializeNylas() {
  const nylas = new Nylas({
    apiKey: process.env.NYLAS_API_KEY!,
  });

  return nylas;
}

export async function exchangeNylasToken(code: string, redirectUri: string) {
  const nylas = await initializeNylas();
  
  const tokens = await nylas.auth.exchangeCodeForToken({
    clientId: process.env.NYLAS_CLIENT_ID!,
    clientSecret: process.env.NYLAS_CLIENT_SECRET!,
    code,
    redirectUri,
  });
  
  return tokens;
}

export async function getNylasStatus(accessToken: string) {
  const nylas = await initializeNylas();
  
  try {
    // Use the access token to make API calls
    const response = await fetch('https://api.nylas.com/account', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const account = await response.json();
    return {
      connected: true,
      email: account.email_address,
      provider: account.provider,
    };
  } catch (error: any) {
    // console.error('Error getting Nylas status:', error);
    return {
      connected: false,
      error: error.message || 'Unknown error',
    };
  }
} 