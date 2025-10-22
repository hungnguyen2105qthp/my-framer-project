import posthog from 'posthog-js'

// Initialize PostHog with comprehensive autocapture and custom event tracking
if (typeof window !== 'undefined') {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isWispAI = window.location.hostname === 'wispai.app';
  
  console.log(`🚀 PostHog initialized in ${isProduction ? 'production' : 'development'} mode`);
  console.log(`📍 Environment: ${isLocalhost ? 'localhost' : isWispAI ? 'wispai.app' : 'other'}`);
  console.log(`🔑 PostHog Key: ${process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'Set' : 'Missing'}`);
  
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug();
        console.log('🔧 PostHog debug mode enabled');
      }
      console.log('✅ PostHog loaded successfully');
      
      // Set up global properties for all events
      posthog.register({
        environment: isProduction ? 'production' : 'development',
        hostname: window.location.hostname,
        app_version: '1.0.0',
        platform: 'web'
      });
    },
    
    // Autocapture Configuration - enable all autocapture features
    autocapture: true,
    
    // Enable automatic pageview capture
    capture_pageview: true,
    capture_pageleave: true,
    
    // Capture all events (both anonymous and identified)
    person_profiles: 'always',
    
    // Session recording
    disable_session_recording: false,
    
    // Persistence
    persistence: 'localStorage',
    
    // Advanced settings
    advanced_disable_decide: false,
    advanced_disable_feature_flags: false,
    
    // Bootstrap with initial properties
    bootstrap: {
      distinctID: undefined,
      isIdentifiedID: false,
      featureFlags: {}
    }
  });
}

export { posthog } 