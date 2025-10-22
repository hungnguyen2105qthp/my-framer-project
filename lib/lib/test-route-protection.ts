/**
 * Utility functions for protecting test routes in production
 */

export function isTestRouteAllowed(): boolean {
  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check if we're on localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
  }

  // Check environment variables
  if (process.env.ALLOW_TEST_ROUTES === 'true') {
    return true;
  }

  return false;
}

export function getTestRouteRedirectUrl(): string {
  // Redirect to home page in production
  return '/';
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' && 
         process.env.VERCEL_ENV === 'production';
} 