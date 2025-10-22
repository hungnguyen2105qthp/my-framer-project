'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { initializeUserSettings } from '@/lib/user-settings';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { user } = useAuth();
  const [meetingPlatform, setMeetingPlatform] = useState("scheduled");
  const [inboxProcessing, setInboxProcessing] = useState("enabled");
  const [isProcessing, setIsProcessing] = useState(false);

  // Create or update user in Firestore when component mounts
  useEffect(() => {
    const initializeUser = async () => {
      if (!user?.email) return;

      try {
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        const db = getFirestore();
        
        // Create/update user document
        await setDoc(doc(db, 'users', user.email), {
          email: user.email,
          name: user.displayName,
          createdAt: new Date(),
          updatedAt: new Date(),
          onboardingStarted: true
        }, { merge: true });

      } catch (error) {
        // console.error('Error initializing user:', error);
      }
    };

    initializeUser();
  }, [user]);

  // Check for OAuth callback when component mounts
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const success = urlParams.get('success');
      const storedState = localStorage.getItem('onboardingAuthState');

      // console.log('🔍 Checking OAuth for onboarding...');
      // console.log('Code present:', !!code);
      // console.log('State present:', !!state);
      // console.log('Stored state present:', !!storedState);
      // console.log('Error present:', !!error);
      // console.log('Success:', !!success);

      // Clear stored state
      localStorage.removeItem('onboardingAuthState');
      
      // Handle success case
      if (success === 'true' || (code && state && storedState && state === storedState)) {
        // console.log('✅ OAuth successful');
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          // Update user preferences in Firestore
          const { getFirestore, doc, setDoc } = await import('firebase/firestore');
          const db = getFirestore();
          await setDoc(doc(db, 'users', user.email), {
            email: user.email,
            name: user.displayName,
            updatedAt: new Date(),
            meetingPlatform: meetingPlatform === "none" ? null : meetingPlatform,
            inboxProcessingEnabled: inboxProcessing === "enabled",
            onboardingCompleted: true
          }, { merge: true });

          // Initialize user settings
          await initializeUserSettings(user.email);

          // Redirect to specific meeting immediately
          window.location.href = '/dashboard/meetings/1750402455859-lemn60ey5t?success=true';
        } catch (error) {
          // console.error('Error during preference storage:', error);
          // Still redirect on error
          window.location.href = '/dashboard/meetings/1750402455859-lemn60ey5t?success=true';
        }
      }

      if (error) {
        // console.error('❌ OAuth error:', error);
        // Redirect on error
        window.location.href = '/dashboard/meetings/1750402455859-lemn60ey5t?error=' + encodeURIComponent(error);
      }
    };

    checkOAuthCallback();
  }, [user, meetingPlatform, inboxProcessing]);

  const handleNext = async () => {
    if (!user?.email) return;

    try {
      setIsProcessing(true);

      // Update user preferences before starting OAuth
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const db = getFirestore();
      await setDoc(doc(db, 'users', user.email), {
        email: user.email,
        name: user.displayName,
        updatedAt: new Date(),
        meetingPlatform: meetingPlatform === "none" ? null : meetingPlatform,
        inboxProcessingEnabled: inboxProcessing === "enabled",
        onboardingInProgress: true
      }, { merge: true });

      // Store state for OAuth flow
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('onboardingAuthState', state);
      localStorage.setItem('onboardingRedirect', window.location.href);
      localStorage.setItem('onboarding_user_email', user.email);
      localStorage.setItem('onboarding_in_progress', 'true');

      // Get the ID token
      const idToken = await user.getIdToken();
      
      // Request Gmail permissions
      const response = await fetch('/api/email/gmail/auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Origin': window.location.origin,
          'X-Auth-State': state,
          'X-Source': 'onboarding-full'
        },
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to OAuth URL
        window.location.href = data.url;
      } else if (data.error) {
        throw new Error(`Connection Failed: ${data.error}`);
      }
    } catch (error) {
      // console.error('Error during OAuth:', error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      window.location.href = '/dashboard/meetings/1750402455859-lemn60ey5t?error=' + encodeURIComponent(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Main container with glass effect */}
      <div className="w-full max-w-2xl mx-auto p-8 space-y-12 relative">
        {/* Logo and Brand */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lightpurp.png" 
              alt="Wisp AI" 
              className="h-14 w-auto dark:hidden"
            />
            <img 
              src="/darkpurp.png" 
              alt="Wisp AI" 
              className="h-14 w-auto hidden dark:block"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Welcome to Wisp AI
          </h1>
          <p className="text-lg text-gray-600 max-w-lg mx-auto">
            Let's personalize your experience to help you capture and share meetings effortlessly
          </p>
        </div>

        {/* Settings Container */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl space-y-10 border border-white/20">
          {/* Meeting Platform Selection */}
          <div className="space-y-4">
            <label className="block text-lg font-medium text-gray-700 mb-3">
              Which meetings should Wisp join?
            </label>
            <Select value={meetingPlatform} onValueChange={setMeetingPlatform}>
              <SelectTrigger className="w-full bg-white/90 border-gray-200 hover:border-purple-300 transition-colors rounded-xl h-14 text-base">
                <SelectValue placeholder="Select meeting option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled" className="text-base py-3">
                  Scheduled Zoom, Google, Microsoft meetings
                </SelectItem>
                <SelectItem value="none" className="text-base py-3">
                  None
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inbox Processing Selection */}
          <div className="space-y-4">
            <label className="block text-lg font-medium text-gray-700 mb-3">
              How would you like your inbox managed?
            </label>
            <Select value={inboxProcessing} onValueChange={setInboxProcessing}>
              <SelectTrigger className="w-full bg-white/90 border-gray-200 hover:border-purple-300 transition-colors rounded-xl h-14 text-base">
                <SelectValue placeholder="Select inbox processing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled" className="text-base py-3">
                  Reorganize my inbox and draft replies
                </SelectItem>
                <SelectItem value="none" className="text-base py-3">
                  No inbox management
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-8">
          <Button 
            onClick={handleNext}
            disabled={isProcessing}
            className={`
              w-full max-w-md h-14 text-lg font-medium rounded-xl
              bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
              text-white shadow-lg hover:shadow-xl
              transition-all duration-200 transform hover:scale-[1.02]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            `}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Setting up your workspace...</span>
              </div>
            ) : (
              "Continue"
            )}
          </Button>
        </div>

        {/* Optional: Progress indicator */}
        <div className="flex justify-center pt-4">
          <p className="text-sm text-gray-500">
            Step 1 of 2: Configuring your preferences
          </p>
        </div>
      </div>
    </div>
  );
} 