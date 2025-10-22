import Nylas, { WebhookTriggers } from 'nylas';

// Nylas configuration
export const nylasConfig = {
  apiKey: process.env.NYLAS_API_KEY || '',
  clientId: process.env.NYLAS_CLIENT_ID || '',
  apiUri: process.env.NYLAS_API_URI || 'https://api.nylas.com',
  webhookUri: process.env.NYLAS_WEBHOOK_URI || '',
  webhookTriggers: [
    WebhookTriggers.MessageCreated,
    WebhookTriggers.MessageUpdated,
    WebhookTriggers.ThreadReplied
  ]
};

// Initialize Nylas SDK
export const nylas = new Nylas({
  apiKey: nylasConfig.apiKey,
  apiUri: nylasConfig.apiUri
});

// Validate required config
export function validateNylasConfig(): string[] {
  const missingVars = [];
  if (!nylasConfig.apiKey) missingVars.push('NYLAS_API_KEY');
  if (!nylasConfig.clientId) missingVars.push('NYLAS_CLIENT_ID');
  return missingVars;
}

// Helper to get dynamic callback URI based on request
export function getDynamicCallbackUri(req: Request): string {
  // If NYLAS_CALLBACK_URI is set, use it
  if (process.env.NYLAS_CALLBACK_URI) {
    return process.env.NYLAS_CALLBACK_URI;
  }
  
  // Fallback to constructing from request
  const requestUrl = new URL(req.url);
  const platform = (req as any).headers?.get?.('x-platform') || '';
  
  // Use iOS-specific callback for iOS requests
  if (platform === 'ios') {
    return `${requestUrl.protocol}//${requestUrl.host}/api/email/nylas/callback-ios`;
  }
  
  // Default to email-specific callback endpoint for email OAuth flows
  return `${requestUrl.protocol}//${requestUrl.host}/api/email/nylas/callback`;
} 