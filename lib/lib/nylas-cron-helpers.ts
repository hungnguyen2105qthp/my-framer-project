// Helper functions for Nylas cron job logic
// Moved from app/api/cron/process-nylas-emails/route.ts

import { db, isFirebaseAdminAvailable } from '@/lib/firebase-admin';
import { nylas } from '@/lib/nylas-config';
import { getUserFullName, getUserFirstName, getUserLastName } from '@/lib/userinfo-service';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Agent status tracking
interface AgentStep {
  step: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  details?: any;
  error?: string;
}

interface AgentSession {
  sessionId: string;
  userEmail: string;
  startTime: Date;
  steps: AgentStep[];
  currentStep: number;
  totalSteps: number;
}

// Global agent session tracking
const agentSessions = new Map<string, AgentSession>();

// Helper function to log agent steps
function logAgentStep(sessionId: string, step: string, description: string, details?: any) {
  const session = agentSessions.get(sessionId);
  if (session) {
    const stepIndex = session.steps.findIndex(s => s.step === step);
    if (stepIndex >= 0) {
      session.steps[stepIndex].status = 'in_progress';
      session.steps[stepIndex].startTime = new Date();
      session.steps[stepIndex].details = details;
    }
  }
  
  // console.log(`🤖 [AGENT STEP] ${step}: ${description}`);
  if (details) {
    // console.log(`   📋 Details:`, details);
  }
}

function completeAgentStep(sessionId: string, step: string, result?: any, error?: string) {
  const session = agentSessions.get(sessionId);
  if (session) {
    const stepIndex = session.steps.findIndex(s => s.step === step);
    if (stepIndex >= 0) {
      session.steps[stepIndex].status = error ? 'failed' : 'completed';
      session.steps[stepIndex].endTime = new Date();
      session.steps[stepIndex].duration = session.steps[stepIndex].endTime.getTime() - (session.steps[stepIndex].startTime?.getTime() || 0);
      session.steps[stepIndex].details = result;
      session.steps[stepIndex].error = error;
      session.currentStep++;
      
      if (error) {
        // console.log(`❌ [AGENT STEP FAILED] ${step}: ${error}`);
      } else {
        // console.log(`✅ [AGENT STEP COMPLETED] ${step} (${session.steps[stepIndex].duration}ms)`);
      }
    }
  }
}

// Initialize agent session
function initializeAgentSession(userEmail: string): string {
  const sessionId = `agent_${userEmail}_${Date.now()}`;
  const session: AgentSession = {
    sessionId,
    userEmail,
    startTime: new Date(),
    currentStep: 0,
    totalSteps: 8, // Total number of major steps
    steps: [
      { step: 'initialize', description: 'Initializing agent session and validating user', status: 'pending' },
      { step: 'fetch_emails', description: 'Fetching recent emails from Nylas', status: 'pending' },
      { step: 'analyze_style', description: 'Analyzing user writing style and extracting name', status: 'pending' },
      { step: 'create_folders', description: 'Creating or finding category folders', status: 'pending' },
      { step: 'classify_emails', description: 'Classifying emails using AI', status: 'pending' },
      { step: 'apply_folders', description: 'Applying category folders to emails', status: 'pending' },
      { step: 'generate_drafts', description: 'Generating draft replies for emails needing responses', status: 'pending' },
      { step: 'finalize', description: 'Finalizing processing and updating status', status: 'pending' }
    ]
  };
  
  agentSessions.set(sessionId, session);
  
  // console.log(`🤖 [AGENT SESSION STARTED] ${sessionId}`);
  // console.log(`👤 User: ${userEmail}`);
  // console.log(`📋 Total Steps: ${session.totalSteps}`);
  // console.log(`⏰ Start Time: ${session.startTime.toISOString()}`);
  
  return sessionId;
}

// Get agent session status
export function getAgentSessionStatus(sessionId: string): AgentSession | null {
  return agentSessions.get(sessionId) || null;
}

// Clean up old sessions (older than 1 hour)
function cleanupOldSessions() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [sessionId, session] of agentSessions.entries()) {
    if (session.startTime < oneHourAgo) {
      agentSessions.delete(sessionId);
    }
  }
}

export const categoryConfig = {
  'To respond': { name: '1: to respond', backgroundColor: '#cc3a21', textColor: '#ffffff' },
  'FYI': { name: '2: FYI', backgroundColor: '#e66550', textColor: '#ffffff' },
  'Comment': { name: '3: comment', backgroundColor: '#16a766', textColor: '#000000' },
  'Notification': { name: '4: notification', backgroundColor: '#149e60', textColor: '#ffffff' },
  'Meeting update': { name: '5: meeting update', backgroundColor: '#3dc789', textColor: '#ffffff' },
  'Awaiting reply': { name: '6: awaiting reply', backgroundColor: '#a479e2', textColor: '#ffffff' },
  'Actioned': { name: '7: actioned', backgroundColor: '#b694e8', textColor: '#ffffff' },
  'Advertisement': { name: '8: marketing', backgroundColor: '#f691b3', textColor: '#ffffff' }
};

// Function to analyze user's writing style from sent emails and extract user name
export async function analyzeUserWritingStyle(grantId: string, userEmail: string): Promise<{ style: string, name: string }> {
  // console.log('📝 Analyzing user writing style from sent emails...');
  
  try {
    // First, try to get user name from userinfo collection (primary source)
    const userFullName = await getUserFullName(userEmail);
    const userFirstName = await getUserFirstName(userEmail);
    const userLastName = await getUserLastName(userEmail);
    
    let finalName = 'User'; // Default fallback - never use email
    
    if (userFullName) {
      finalName = userFullName;
      // console.log('✅ User name from userinfo collection:', {
//         fullName: userFullName,
//         firstName: userFirstName,
//         last_name: userLastName
//       });
    } else if (userFirstName) {
      finalName = userFirstName;
      // console.log('✅ User first name from userinfo collection:', userFirstName);
    }

    const sentResponse = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 20,
        in: ['SENT']
      }
    });

    const sentMessages = sentResponse.data || [];
    // console.log(`📧 Found ${sentMessages.length} sent emails for style analysis`);

    const writingSamples: string[] = [];

    for (const message of sentMessages.slice(0, 10)) {
      try {
        const body = message.body || '';
        
        const cleanBody = body
          .replace(/On .* wrote:/g, '')
          .replace(/-----Original Message-----/g, '')
          .replace(/From:.*To:.*Subject:.*/g, '')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        if (cleanBody.length > 50 && cleanBody.length < 2000) {
          writingSamples.push(cleanBody);
        }
      } catch (error) {
        // console.warn('⚠️ Error processing sent email for style analysis:', error);
      }
    }

    // If we couldn't find a signature name, use 'User' as fallback
    if (!finalName || finalName === 'User') {
      finalName = 'User';
    }

    // console.log(`✅ Collected ${writingSamples.length} writing samples for analysis`);
    // console.log(`👤 Extracted user name: ${finalName}`);

    if (writingSamples.length === 0) {
      return {
        style: "Professional, concise, and friendly tone. Clear and direct communication style.",
        name: finalName
      };
    }

    const styleAnalysisPrompt = `
Analyze the following email writing samples and identify the key characteristics of this person's writing style. Focus on:

1. Tone (formal, casual, friendly, professional)
2. Communication style (direct, verbose, concise)
3. Common phrases and expressions
4. Greeting and closing patterns
5. Overall personality in writing

Email samples:
${writingSamples.slice(0, 5).map((sample, i) => `\nSample ${i + 1}:\n${sample}`).join('\n')}

Provide a concise analysis of the writing style that can be used to generate similar responses.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: styleAnalysisPrompt }],
      max_tokens: 400,
    });

    const styleAnalysis = completion.choices[0]?.message?.content || "Professional, concise, and friendly tone. Clear and direct communication style.";
    
    return { style: styleAnalysis, name: finalName };

  } catch (error) {
    // console.error('❌ Error analyzing writing style:', error);
    return { 
      style: "Professional, concise, and friendly tone. Clear and direct communication style.",
      name: 'User'
    };
  }
}

// Function to save user's representative sent emails to Firestore
export async function saveUserSentEmails(grantId: string, userEmail: string): Promise<boolean> {
  // console.log('📝 Saving user sent emails to Firestore for future reference...');
  
  try {
    // Check if we already have saved emails
    const existingDoc = await db.collection('writingSettings').doc(userEmail).get();
    if (existingDoc.exists) {
      // console.log('✅ User sent emails already saved, skipping...');
      return true;
    }

    // Fetch recent sent emails
    const sentResponse = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 10,
        in: ['SENT']
      }
    });

    const sentMessages = sentResponse.data || [];
    // console.log(`📧 Found ${sentMessages.length} sent emails to analyze`);

    const emailBodies: string[] = [];

    // Process up to 3 representative emails
    for (const message of sentMessages.slice(0, 3)) {
      try {
        const body = message.body || '';
        
        // Clean the email body
        const cleanBody = body
          .replace(/On .* wrote:/g, '')
          .replace(/-----Original Message-----/g, '')
          .replace(/From:.*To:.*Subject:.*/g, '')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        // Only include emails with substantial content (50-2000 characters)
        if (cleanBody.length >= 50 && cleanBody.length <= 2000) {
          emailBodies.push(cleanBody);
        }
      } catch (error) {
        // console.warn('⚠️ Error processing sent email for storage:', error);
      }
    }

    if (emailBodies.length === 0) {
      // console.log('⚠️ No suitable sent emails found for storage');
      return false;
    }

    // Combine all email bodies into a single string
    const writingStyleExamples = emailBodies.join('\n\n---\n\n');

    // Save to Firestore
    await db.collection('writingSettings').doc(userEmail).set({
      userEmail,
      writing_style_examples: writingStyleExamples,
      savedAt: new Date().toISOString(),
      count: emailBodies.length
    }, { merge: true });

    // console.log(`✅ Saved ${emailBodies.length} representative sent emails as combined writing style examples to Firestore`);
    return true;

  } catch (error) {
    // console.error('❌ Error saving user sent emails:', error);
    return false;
  }
}

// Function to get user's saved sent emails from Firestore
export async function getUserSentEmails(userEmail: string): Promise<string> {
  try {
    const doc = await db.collection('writingSettings').doc(userEmail).get();
    
    if (!doc.exists) {
      // console.log('⚠️ No saved sent emails found for user, attempting to fetch from Nylas...');
      
      // Try to get the user's Nylas grant ID to fetch emails
      try {
        const userDoc = await db.collection('nylas_tokens').doc(userEmail).get();
        if (userDoc.exists) {
          const tokenData = userDoc.data();
          const grantId = tokenData?.grantId;
          
          if (grantId) {
            // console.log('📝 Attempting to save user sent emails from Nylas...');
            const saved = await saveUserSentEmails(grantId, userEmail);
            
            if (saved) {
              // Re-fetch the saved emails
              const updatedDoc = await db.collection('writingSettings').doc(userEmail).get();
              if (updatedDoc.exists) {
                const data = updatedDoc.data();
                const writingStyleExamples = data?.writing_style_examples || '';
                // console.log(`✅ Successfully created writing style examples from Nylas (${writingStyleExamples.length} characters)`);
                return writingStyleExamples;
              }
            }
          }
        }
      } catch (fetchError) {
        // console.warn('⚠️ Could not fetch emails from Nylas:', fetchError);
      }
      
      // console.log('⚠️ No writing style examples available');
      return '';
    }

    const data = doc.data();
    const writingStyleExamples = data?.writing_style_examples || '';
    
    // console.log(`✅ Retrieved writing style examples from Firestore (${writingStyleExamples.length} characters)`);
    return writingStyleExamples;

  } catch (error) {
    // console.error('❌ Error retrieving user sent emails:', error);
    return '';
  }
}

// Helper function to validate if extracted text is likely a name
export function isValidName(name: string): boolean {
  // Basic validation for names
  const words = name.split(/\s+/);
  
  // Should have 2-4 words (first, middle?, last, suffix?)
  if (words.length < 2 || words.length > 4) return false;
  
  // Each word should start with capital letter and be reasonable length
  for (const word of words) {
    if (!/^[A-Z][a-z]{1,20}$/.test(word)) return false;
  }
  
  // Exclude common non-name words that might appear in signatures
  const excludeWords = ['Thanks', 'Regards', 'Best', 'Sincerely', 'Cheers', 'Team', 'Support', 'Admin'];
  for (const word of words) {
    if (excludeWords.includes(word)) return false;
  }
  
  return true;
}

// Function to properly capitalize names
export function capitalizeNames(name: string): string {
  if (!name) return '';
  return name.split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

// Function to get user's calendar events by calling the /api/nylas-calendar/events endpoint
export async function getUserCalendarEvents(userEmail: string): Promise<string> {
  try {
    // console.log('📅 Fetching calendar events via /api/nylas-calendar/events endpoint...');
    
    // Call the calendar events endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const eventsResponse = await fetch(`${baseUrl}/api/nylas-calendar/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userEmail}`
      }
    });

    if (!eventsResponse.ok) {
      // console.log('📅 Calendar events endpoint returned error:', eventsResponse.status);
      return '';
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.data || [];
    
    // console.log(`📅 Retrieved ${events.length} calendar events via endpoint`);
    
    if (events.length === 0) {
      return 'No upcoming calendar events in the next 3 months.';
    }

    // Filter events to next 7 days for more relevant context
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingEvents = events.filter((event: any) => {
      const start = event.when?.startTime ? new Date(event.when.startTime * 1000) : null;
      if (!start) return false;
      return start >= now && start <= nextWeek;
    });

    if (upcomingEvents.length === 0) {
      return 'No upcoming calendar events in the next 7 days.';
    }

    const eventSummaries = upcomingEvents.map((event: any) => {
      const start = event.when?.startTime ? new Date(event.when.startTime * 1000) : null;
      const end = event.when?.endTime ? new Date(event.when.endTime * 1000) : null;
      const title = event.title || event.summary || 'Untitled Event';
      if (!start) return title;
      const dayName = start.toLocaleDateString('en-US', { weekday: 'long' });
      const startTimeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const endTimeStr = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
      const timeStr = endTimeStr ? `${startTimeStr} - ${endTimeStr}` : startTimeStr;
      const meetingInfo = event.conferencing?.details?.url ? ` (${event.conferencing.details.url})` : '';
      return `${dayName} ${start.toLocaleDateString()} at ${timeStr}: ${title}${meetingInfo}`;
    });

    return `Upcoming calendar events (next 7 days):\n${eventSummaries.slice(0, 10).join('\n')}`;
    
  } catch (error) {
    // console.warn('⚠️ Could not fetch calendar events via endpoint:', error);
    return '';
  }
}

// Function to generate draft reply
export async function generateDraftReply(emailData: any, userEmail: string): Promise<string> {
  // Get user's detailed name information from userinfo collection (primary source)
  let userGivenName = '';
  let userFamilyName = '';
  
  try {
    // First, try to get user name from userinfo collection
    const userFirstName = await getUserFirstName(userEmail);
    const userLastName = await getUserLastName(userEmail);
    
    if (userFirstName && userFirstName !== userEmail.split('@')[0]) {
      userGivenName = userFirstName;
      // console.log('✅ User first name from userinfo collection:', userGivenName);
    }
    
    if (userLastName) {
      userFamilyName = userLastName;
      // console.log('✅ User last name from userinfo collection:', userFamilyName);
    }
    
    // Fallback to Nylas tokens if no userinfo found
    if (!userGivenName || !userFamilyName) {
      if (isFirebaseAdminAvailable()) {
        const nylasDocRef = db.collection('nylas_tokens').doc(userEmail);
        const nylasDoc = await nylasDocRef.get();
        
        if (nylasDoc.exists) {
          const tokenData = nylasDoc.data();
          if (!userGivenName) {
            userGivenName = capitalizeNames(tokenData?.user_given_name || '');
          }
          if (!userFamilyName) {
            userFamilyName = capitalizeNames(tokenData?.user_family_name || '');
          }
          
          // console.log('📋 Retrieved and capitalized user name details from Nylas tokens:', {
//             given_name: userGivenName,
//             family_name: userFamilyName
//           });
        }
      }
    }
  } catch (nameError) {
    // console.warn('⚠️ Could not retrieve detailed name info:', nameError);
  }

  // Get user's calendar events for availability context via endpoint
  const calendarEvents = await getUserCalendarEvents(userEmail);

  // Get user's saved sent emails for writing style examples
  const userSentEmails = await getUserSentEmails(userEmail);

  const subject = emailData.subject || '';
  const from = emailData.from?.[0]?.email || '';
  const body = emailData.body || '';

  // Build enhanced prompt with calendar context
  // Create a proper full name for the prompt
  const fullName = userGivenName && userFamilyName ? `${userGivenName} ${userFamilyName}` : 
                   userGivenName || 'User';
  
  // console.log('✍️ Using name for email draft:', {
//     userGivenName,
//     userFamilyName,
//     fullName,
//     userEmail,
//     hasGivenName: !!userGivenName,
//     hasFamilyName: !!userFamilyName,
//     fallbackUsed: !userGivenName && !userFamilyName
//   });

  // Detailed logging of all variables for debugging
  // console.log('🔍 DETAILED VARIABLE DEBUGGING:');
  // console.log('  - userGivenName:', JSON.stringify(userGivenName));
  // console.log('  - userFamilyName:', JSON.stringify(userFamilyName));
  // console.log('  - fullName:', JSON.stringify(fullName));
  // console.log('  - userEmail:', JSON.stringify(userEmail));
  // console.log('  - userGivenName || "User":', JSON.stringify(userGivenName || 'User'));
  // console.log('  - userFamilyName || "":', JSON.stringify(userFamilyName || ''));
  // console.log('  - fullName (final):', JSON.stringify(fullName));
  // console.log('🔍 END VARIABLE DEBUGGING');

  let prompt = `
You are ${fullName} responding to this email. Generate a professional, helpful response that matches your writing style.

IMPORTANT: Use the exact name "${fullName}" in your signature. Do NOT use placeholder text like "[Your Name]" or "[Name]".

YOUR IDENTITY:
- First Name: ${userGivenName || 'User'}
- Last Name: ${userFamilyName || ''}
- Full Name: ${fullName}
- Email: ${userEmail}

YOUR WRITING STYLE EXAMPLES:
${userSentEmails ? userSentEmails : 'Professional, concise, and friendly tone. Clear and direct communication style.'}

INCOMING EMAIL:
From: ${from}
Subject: ${subject}
Body: ${body.substring(0, 1000)}`;

  // Add calendar context if available
  if (calendarEvents) {
    prompt += `

YOUR CALENDAR AVAILABILITY:
${calendarEvents}

If the email asks about your availability, meetings, or scheduling, use your calendar information to provide accurate responses about your schedule.`;
  }

  prompt += `

Generate a draft reply that:
1. Matches your writing style exactly
2. Addresses all main points and questions in the incoming email
3. If scheduling/availability questions are asked, reference your calendar information
4. Is helpful, professional, and contextually appropriate
5. Signs off with "Best regards," or a similar closing on a new line, followed by your name "${fullName}" on a new line
6. Is natural and authentic to your voice
7. Use appropriate formality based on the incoming email's tone
8. Ensure proper punctuation and line breaks in the signature
9. CRITICAL: Use the exact name "${fullName}" in your signature. Never use placeholder text like "[Your Name]", "[Name]", or any other placeholder
10. If you don't have a specific name, use "${fullName}" as provided

Return ONLY the email body content (no subject line, no headers).
`;

  // Log the complete prompt for debugging
  // console.log('📝 COMPLETE PROMPT BEING SENT TO AI:');
  // console.log('='.repeat(80));
  // console.log(prompt);
  // console.log('='.repeat(80));

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    });

    let response = completion.choices[0]?.message?.content || 
      `Thank you for your email. I'll review this and get back to you soon.`;
    
    // Log the AI response
    // console.log('🤖 AI RESPONSE RECEIVED:');
    // console.log('='.repeat(80));
    // console.log(response);
    // console.log('='.repeat(80));
    
    // Note: Removed personalized signature as requested
    
    // Add Wisp AI signature with clickable link
    const responseWithSignature = response + '\n\nDrafted by Wisp AI: https://wispai.app/';
    
    // console.log('📧 FINAL DRAFT CONTENT:');
    // console.log('='.repeat(80));
    // console.log(responseWithSignature);
    // console.log('='.repeat(80));
    
    return responseWithSignature;
  } catch (error) {
    // console.error('❌ Error generating draft reply:', error);
    return `Thank you for your email. I'll review this and get back to you soon.\n\nDrafted by Wisp AI: https://wispai.app/`;
  }
}

// Function to process emails for a specific Nylas user
export async function processEmailsForNylasUser(userEmail: string, shouldProcessWithLabels: boolean = true): Promise<{ processedCount: number, sessionId: string }> {
  // Initialize agent session
  const sessionId = initializeAgentSession(userEmail);
  
  try {
    logAgentStep(sessionId, 'initialize', 'Validating user and Nylas connection');
    
    // Get Nylas grant ID for the user from nylas_tokens collection
    const userDoc = await db.collection('nylas_tokens').doc(userEmail).get();
    if (!userDoc.exists) {
      const error = `No Nylas tokens found for ${userEmail}`;
      completeAgentStep(sessionId, 'initialize', null, error);
      // console.error(`❌ ${error}`);
      return { processedCount: 0, sessionId };
    }

    const tokenData = userDoc.data();
    const grantId = tokenData?.grantId;
    
    if (!grantId) {
      const error = `No Nylas grant ID found for ${userEmail}`;
      completeAgentStep(sessionId, 'initialize', null, error);
      // console.error(`❌ ${error}`);
      
      // Automatically disable auto-processing for users without grant IDs
      try {
        await db.collection('nylas_settings').doc(userEmail).update({
          autoProcessingEnabled: false,
          pollingEnabled: false,
          lastAutoDisabled: new Date().toISOString(),
          autoDisableReason: 'No Nylas grant ID found'
        });
        // console.log(`🔧 Auto-disabled processing for ${userEmail} (no grant ID)`);
      } catch (disableError) {
        // console.error(`❌ Failed to disable auto-processing for ${userEmail}:`, disableError);
      }
      
      return { processedCount: 0, sessionId };
    }

    // Get last processed timestamp from nylas_settings collection
    const settingsDoc = await db.collection('nylas_settings').doc(userEmail).get();
    const lastProcessed = settingsDoc.exists ? settingsDoc.data()?.lastProcessed || '2020-01-01T00:00:00.000Z' : '2020-01-01T00:00:00.000Z';
    completeAgentStep(sessionId, 'initialize', { grantId, lastProcessed });
    // console.log(`🔄 Processing ${userEmail} (last processed: ${new Date(lastProcessed).toLocaleTimeString()})`);

    try {
      logAgentStep(sessionId, 'fetch_emails', 'Fetching recent emails from Nylas');
      
      // Search for recent emails
      // console.log(`🔍 Searching for recent emails (last processed: ${new Date(lastProcessed).toLocaleString()})`);
      const queryParams = { limit: 25 };
      // console.log('🔍 Nylas query params:', queryParams);

      const response = await nylas.messages.list({
        identifier: grantId,
        queryParams
      });

      if (!response?.data) {
        const error = `No messages data returned for ${userEmail}`;
        completeAgentStep(sessionId, 'fetch_emails', null, error);
        // console.error(`❌ ${error}`);
        return { processedCount: 0, sessionId };
      }

      const messages = response.data;
      // console.log(`📧 Found ${messages.length} messages for ${userEmail}`);
      
      // Debug: Show some email details
      if (messages.length > 0) {
        // console.log(`📧 Sample emails found:`);
        messages.slice(0, 3).forEach((msg, index) => {
          // console.log(`  ${index + 1}. "${msg.subject}" from ${msg.from?.[0]?.email || 'unknown'} - ${new Date(msg.date * 1000).toLocaleString()}`);
        });
      }

      // Filter to new messages only
      // console.log(`🔍 DEBUG: Last processed timestamp: ${lastProcessed}`);
      // console.log(`🔍 DEBUG: Total messages found: ${messages.length}`);
      
      if (messages.length > 0) {
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        // console.log(`🔍 DEBUG: First message date: ${new Date(firstMessage.date * 1000).toLocaleString()}`);
        // console.log(`🔍 DEBUG: Last message date: ${new Date(lastMessage.date * 1000).toLocaleString()}`);
        // console.log(`🔍 DEBUG: Last processed date: ${new Date(lastProcessed).toLocaleString()}`);
      }
      
      const newMessages = messages.filter(msg => {
        const messageDate = new Date(msg.date * 1000); // Convert Unix timestamp to Date
        const lastProcessedDate = new Date(lastProcessed);
        const isNew = messageDate > lastProcessedDate;
        
        if (!isNew) {
          // console.log(`⏭️ Skipping email "${msg.subject}" - date: ${messageDate.toLocaleString()}, last processed: ${lastProcessedDate.toLocaleString()}`);
        }
        
        return isNew;
      });

      // console.log(`📧 Filtered to ${newMessages.length} new messages (since last processed)`);

      if (newMessages.length === 0) {
        completeAgentStep(sessionId, 'fetch_emails', { totalMessages: messages.length, newMessages: 0 });
        // console.log(`📧 No new messages to process for ${userEmail}`);
        return { processedCount: 0, sessionId };
      }

      completeAgentStep(sessionId, 'fetch_emails', { totalMessages: messages.length, newMessages: newMessages.length });

      // Process the new messages
      const messageIds = newMessages.map(m => m.id);
    
    // Filter to only process the latest email in each thread that needs a response
    const latestMessageIds = await getLatestEmailsInThreads(grantId, messageIds, userEmail);
    
    // console.log(`📧 Processing ${latestMessageIds.length} latest messages from ${messageIds.length} total messages`);
    
    const processedCount = await processSpecificNylasEmails(grantId, userEmail, latestMessageIds, sessionId, shouldProcessWithLabels);

      logAgentStep(sessionId, 'finalize', 'Updating last processed timestamp');
      
      // Update last processed timestamp
      await db.collection('nylas_settings').doc(userEmail).update({
        lastProcessed: new Date().toISOString()
      });

      completeAgentStep(sessionId, 'finalize', { processedCount, lastProcessed: new Date().toISOString() });

      return { processedCount, sessionId };

    } catch (error) {
      // console.error(`❌ Error processing emails for ${userEmail}:`, error);
      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response: { status: number; data: any; headers: any } };
        // console.error('Error Response:', {
//           status: apiError.response.status,
//           data: apiError.response.data,
//           headers: apiError.response.headers
//         });
      }
      throw error;
    }

  } catch (error) {
    // console.error(`❌ Fatal error processing ${userEmail}:`, error);
    return { processedCount: 0, sessionId };
  }
}

// Add timeout wrapper for OpenAI calls
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    // console.warn('⚠️ Operation timed out, using fallback value');
    return fallback;
  }
}

// Function to classify individual Nylas email using AI with better timeout handling
export async function classifyIndividualNylasEmail(email: any) {
  if (!process.env.OPENAI_API_KEY) {
    // console.log('⚠️ OpenAI API key not configured, using default category');
    return { category: 'FYI', needsResponse: false };
  }

  try {
    const { subject, from, body } = email;
    
    // Clean and truncate body for analysis
    const cleanBody = body
      .replace(/On .* wrote:/g, '')
      .replace(/-----Original Message-----/g, '')
      .replace(/From:.*To:.*Subject:.*/g, '')
      .replace(/\n\s*\n/g, '\n')
      .slice(0, 200); // Use same length as process-optimized

    const classificationPrompt = `
Classify this email into ONE category. Reply with ONLY the category name.

Categories:
To respond - Questions, requests, important conversations
FYI - Info only, no response needed
Comment - Team chats (Google Docs, Office)
Notification - Automated updates
Meeting update - Calendar/meeting related
Awaiting reply - You're waiting for their response
Actioned - You sent this, no reply expected
Advertisement - Promotional/cold emails

Email:
From: ${from}
Subject: ${subject}
Body: ${cleanBody}

Category:`;

    // Use withTimeout to handle OpenAI API timeouts
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: classificationPrompt }],
        max_tokens: 15,
        temperature: 0,
      }),
      5000, // 5 second timeout
      { 
        id: 'fallback',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o-mini',
        choices: [{ 
          message: { 
            role: 'assistant',
            content: 'FYI' 
          },
          finish_reason: 'stop',
          index: 0,
          logprobs: null
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }
    );

    const rawResponse = completion.choices?.[0]?.message?.content?.trim() || 'FYI';
    // Since we asked for just the category name, use the response directly
    const rawCategory = rawResponse.replace(/^Category:\s*/i, '').trim();
    
    // Clean up the category to ensure exact match (same as process-optimized)
    const validCategories = ['Needs reply', 'FYI', 'Comment', 'Notification', 'Meeting', 'Waiting', 'Actioned', 'Advertisement'];
    const category = validCategories.find(cat => rawCategory.toLowerCase().includes(cat.toLowerCase())) || 'FYI';
    
    // Determine needsResponse based on category (same as process-optimized)
    const needsResponse = category === 'To respond';
    
    // console.log(`🎯 Email "${subject}" classified as: ${category} (needs response: ${needsResponse})`);
    // console.log(`🔍 Classification details:`, {
//       subject,
//       from,
//       category,
//       needsResponse,
//       rawResponse,
//       rawCategory
//     });
    
    return {
      ...email,
      category,
      needsResponse
    };

  } catch (error: any) {
    // console.error(`❌ Error classifying email "${email.subject}":`, error.message);
    return {
      ...email,
      category: 'FYI',
      needsResponse: false
    };
  }
}

// Process specific Nylas email messages with proper categorization and draft generation
async function processSpecificNylasEmails(
  grantId: string,
  userEmail: string,
  messageIds: string[],
  sessionId: string,
  shouldProcessWithLabels: boolean = true
): Promise<number> {
  const startTime = Date.now();
  
  try {
    // console.log(`🔄 Processing ${messageIds.length} Nylas emails individually for ${userEmail}`);
    
    logAgentStep(sessionId, 'analyze_style', 'Saving user sent emails for future reference');
    
    // Save user's representative sent emails to Firestore (only once)
    // console.log('📝 Saving user sent emails for future reference...');
    await saveUserSentEmails(grantId, userEmail);
    
    // Get user name from userinfo collection (primary source)
    const userFullName = await getUserFullName(userEmail);
    const userFirstName = await getUserFirstName(userEmail);
    const userName = userFullName || userFirstName || userEmail.split('@')[0];
    
    completeAgentStep(sessionId, 'analyze_style', { userName });
    
    // Get user's label settings to check which labels are disabled
    let userLabelSettings: Record<string, boolean> = {};
    try {
      const writingSettingsDoc = await db.collection('writingSettings').doc(userEmail).get();
      if (writingSettingsDoc.exists) {
        const writingSettings = writingSettingsDoc.data();
        userLabelSettings = writingSettings?.emailLabels || {};
        // console.log(`📋 User label settings:`, userLabelSettings);
      }
    } catch (settingsError) {
      // console.warn('⚠️ Could not check user label settings:', settingsError);
    }

    // Only create folders if labels are enabled and filter out disabled labels
    let folderMap = new Map();
    if (shouldProcessWithLabels) {
      logAgentStep(sessionId, 'create_folders', 'Creating or finding category folders');
      
      // Get categories but filter out disabled ones
      const allCategories = Object.keys(categoryConfig);
      const enabledCategories = allCategories.filter(category => {
        const labelName = categoryConfig[category]?.name || category;
        const isEnabled = userLabelSettings[labelName] !== false; // Default to true if not set
        if (!isEnabled) {
          // console.log(`⏭️ Skipping disabled label: "${labelName}"`);
        }
        return isEnabled;
      });
      
      // console.log(`📋 Creating folders for ${enabledCategories.length}/${allCategories.length} enabled categories`);
      folderMap = await getOrCreateNylasFolders(grantId, enabledCategories, categoryConfig);
      
      completeAgentStep(sessionId, 'create_folders', { 
        categories: enabledCategories.length, 
        foldersCreated: folderMap.size,
        disabledCategories: allCategories.length - enabledCategories.length
      });
    } else {
      logAgentStep(sessionId, 'create_folders', 'Skipping folder creation - labels disabled by user');
      completeAgentStep(sessionId, 'create_folders', { categories: 0, foldersCreated: 0, skipped: true });
    }

    let processedCount = 0;
    let draftsGenerated = 0;

    logAgentStep(sessionId, 'classify_emails', `Classifying ${messageIds.length} emails using AI`);
    logAgentStep(sessionId, 'apply_folders', 'Applying category folders to emails');
    logAgentStep(sessionId, 'generate_drafts', 'Generating draft replies using agent orchestrator');

    // Process emails in smaller batches to prevent timeouts
    const batchSize = 5;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batchIds = messageIds.slice(i, i + batchSize);
      // console.log(`📧 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messageIds.length/batchSize)}`);

      // Check if we're approaching the timeout limit
      if (Date.now() - startTime > 20000) { // 20 seconds
        // console.log('⚠️ Approaching timeout limit, saving progress and exiting');
        break;
      }

      // Process each email in the batch
      for (const messageId of batchIds) {
        try {
          // Fetch individual email details
          const emailData = await nylas.messages.find({
            identifier: grantId,
            messageId: messageId
          });
          
          if (!emailData.data) {
            // console.log(`⚠️ No email data for message ${messageId}`);
            continue;
          }

          // Store original unread state
          const originalUnread = emailData.data.unread;

          // Extract email details for classification
          const subject = emailData.data.subject || '';
          const from = emailData.data.from?.[0]?.email || '';
          const body = emailData.data.body || '';

          // Classify individual email using AI with timeout
          // console.log(`🤖 Classifying email: "${subject}"`);
          const classification = await classifyIndividualNylasEmail({
            messageId,
            emailData: emailData.data,
            subject,
            from,
            body
          });
          
          if (!shouldProcessWithLabels) {
            // console.log(`⏭️ Skipping label application for "${subject}" - labels disabled by user`);
          }
          
          // Apply folder to individual email (only if labels are enabled and category is not disabled)
          if (classification.category && shouldProcessWithLabels) {
            try {
              const categoryName = categoryConfig[classification.category]?.name || classification.category;
              
              // Check if this specific label is disabled
              const isLabelDisabled = userLabelSettings[categoryName] === false;
              if (isLabelDisabled) {
                // console.log(`⏭️ Skipping label application for "${subject}" - label "${categoryName}" is disabled`);
              } else {
                const folderId = folderMap.get(categoryName);
                
                if (folderId) {
                // Get INBOX folder ID to keep email in inbox
                const inboxFolderId = folderMap.get('INBOX');
                const foldersToApply = inboxFolderId 
                  ? [inboxFolderId, folderId]  // Keep in inbox + add category
                  : [folderId];                // Just add category if inbox not found

                await nylas.messages.update({
                  identifier: grantId,
                  messageId: messageId,
                  requestBody: {
                    folders: foldersToApply
                  }
                });
                // console.log(`🏷️ Applied "${classification.category}" folder to: "${subject}" (kept in inbox)`);

                // Restore original unread state after labeling
                try {
                  await nylas.messages.update({
                    identifier: grantId,
                    messageId: messageId,
                    requestBody: {
                      unread: originalUnread
                    }
                  });
                  // console.log(`🔄 Restored unread state (${originalUnread}) for message ${messageId}`);
                } catch (unreadError) {
                  console.error(`❌ Error restoring unread state for message ${messageId}:`, unreadError);
                }

                // Generate draft reply for emails that need responses
                if (classification.needsResponse) {
                  // console.log(`📝 Generating draft reply for: "${subject}" (category: ${classification.category})`);
                  
                  // Check if there are already replies or drafts for this thread
                  const hasExistingReplies = await checkForExistingReplies(grantId, emailData.data.threadId, userEmail);
                  
                  if (hasExistingReplies) {
                    // console.log(`⏭️ Skipping "${subject}" (replies or drafts already exist in thread)`);
                  } else {
                    // console.log(`✍️ Creating new draft for: "${subject}" (using agent orchestrator)`);
                    
                    // Initialize agent orchestrator
                    const { EmailAgentOrchestrator } = await import('@/app/api/email/nylas/agent/orchestrator/agent-orchestrator');
                    const agent = new EmailAgentOrchestrator(grantId);
                    
                    // Get user's writing style examples
                    const writingStyleExamples = await getUserSentEmails(userEmail);
                    
                    // Get calendar events for context
                    const calendarEvents = await getUserCalendarEvents(userEmail);
                    
                    // Use agent orchestrator for draft generation
                    const agentResult = await agent.processDraft({
                      content: body,
                      sender: from,
                      subject,
                      userEmail,
                      calendarEvents: calendarEvents,
                      writingStyleExamples: writingStyleExamples
                    });
                    
                    const draftContent = agentResult?.draft?.body || 'Draft generation failed.';
                    await createNylasDraft(grantId, emailData.data.id, draftContent, subject, from, userEmail);
                    draftsGenerated++;
                    // console.log(`✅ Generated draft reply for: "${subject}" using agent orchestrator`);
                  }
                } else {
                  // console.log(`⏭️ Skipping draft generation for: "${subject}" (category: ${classification.category}, needsResponse: ${classification.needsResponse})`);
                }
              }
            }
            } catch (folderError) {
              // console.error(`❌ Error applying folder to ${messageId}:`, folderError);
            }
          }

          processedCount++;
          // console.log(`✅ Processed email ${processedCount}/${messageIds.length}: "${subject}"`);

        } catch (emailError) {
          // console.error(`❌ Error processing email ${messageId}:`, emailError);
        }
      }
    }

    // console.log(`✅ Individually processed ${processedCount} Nylas emails and generated ${draftsGenerated} drafts using agent orchestrator for ${userEmail}`);
    // console.log(`📊 Processing Summary for ${userEmail}:`, {
    //   totalEmails: messageIds.length,
    //   processedCount,
    //   draftsGenerated,
    //   processingTimeMs: Date.now() - startTime
    // });

    // Complete the processing steps
    completeAgentStep(sessionId, 'classify_emails', { emailsClassified: processedCount });
    if (shouldProcessWithLabels) {
      completeAgentStep(sessionId, 'apply_folders', { foldersApplied: processedCount });
    } else {
      completeAgentStep(sessionId, 'apply_folders', { foldersApplied: 0, skipped: true });
    }
    completeAgentStep(sessionId, 'generate_drafts', { draftsGenerated });

    return draftsGenerated;

  } catch (error) {
    // console.error(`❌ Error in processSpecificNylasEmails for ${userEmail}:`, error);
    return 0;
  }
}

// Create Nylas draft (similar to Gmail version)
export async function createNylasDraft(
  grantId: string,
  latestMessageId: string, // Changed from threadId to latestMessageId
  draftContent: string,
  originalSubject: string,
  originalFrom: string,
  userEmail: string
) {
  try {
    // console.log('✍️ Creating new draft for:', originalSubject);
    
    // Prepare subject (add Re: if not already present)
    const replySubject = originalSubject.toLowerCase().startsWith('re:') 
      ? originalSubject 
      : `Re: ${originalSubject}`;

    // Create draft using Nylas v3 SDK
    const draftRequest: any = {
      identifier: grantId,
      requestBody: {
        subject: replySubject,
        to: [{ email: originalFrom }],
        body: draftContent
      }
    };

    // Only add reply_to_message_id if latestMessageId exists and is valid
    if (latestMessageId && latestMessageId.length > 0) {
      try {
        // Verify the message exists first
        await nylas.messages.find({
          identifier: grantId,
          messageId: latestMessageId
        });
        draftRequest.requestBody.reply_to_message_id = latestMessageId;
      } catch (error) {
        // console.log('⚠️ Latest message not found, creating standalone draft');
      }
    }

    const draft = await nylas.drafts.create(draftRequest);
    // console.log('✅ Successfully created Nylas draft for', replySubject);
    return draft;

  } catch (error) {
    // console.error('❌ Error creating Nylas draft:', error);
    throw error;
  }
}

// Get or create folders for categories
export async function getOrCreateNylasFolders(grantId: string, categories: string[], categoryConfig: any) {
  try {
    // Get existing folders
    const foldersResponse = await nylas.folders.list({ identifier: grantId });
    const existingFolders = foldersResponse.data || [];
    
    const folderMap = new Map();
    
    // Add existing folders to map
    existingFolders.forEach(folder => {
      folderMap.set(folder.name, folder.id);
    });
    
    // Ensure INBOX folder is available
    const inboxFolder = existingFolders.find(folder => 
      folder.name === 'INBOX' || folder.name === 'Inbox' || folder.name === 'inbox'
    );
    if (inboxFolder) {
      folderMap.set('INBOX', inboxFolder.id);
      // console.log(`🏷️ Found INBOX folder: ${inboxFolder.name} (${inboxFolder.id})`);
    } else {
      // console.warn('⚠️ INBOX folder not found, emails may be moved out of inbox');
    }
    
    for (const category of categories) {
      const config = categoryConfig[category];
      const folderName = config.name;
      
      // Check if folder already exists
      if (folderMap.has(folderName)) {
        // console.log(`🏷️ Using existing folder: ${folderName} (${folderMap.get(folderName)})`);
      } else {
        // console.log(`🏷️ Creating new folder: ${folderName} with color ${config.backgroundColor}`);
        
        // Create new folder with proper colors
        try {
          const createResponse = await nylas.folders.create({
            identifier: grantId,
            requestBody: {
              name: folderName,
              backgroundColor: config.backgroundColor,
              textColor: config.textColor
            }
          });
          
          folderMap.set(folderName, createResponse.data.id);
          // console.log(`✅ Created folder: ${folderName} with ID ${createResponse.data.id} and color ${config.backgroundColor}`);
          
        } catch (createError: any) {
          // console.error(`❌ Error creating folder ${folderName}:`, createError);
          // console.error('Folder creation error details:', createError.response?.data || createError.message);
        }
      }
    }
    
    return folderMap;
    
  } catch (error) {
    // console.error('❌ Error managing folders:', error);
    return new Map();
  }
} 

// Check if there are already replies written for an email thread
export async function checkForExistingReplies(grantId: string, threadId: string, userEmail: string): Promise<boolean> {
  try {
    // console.log(`🔍 Checking for existing replies in thread ${threadId}...`);
    
    // Get all messages in the thread
    const threadMessages = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        threadId: threadId
      }
    });
    
    if (!threadMessages.data || threadMessages.data.length === 0) {
      // console.log(`⚠️ No messages found in thread ${threadId}`);
      return false;
    }
    
    // console.log(`📧 Found ${threadMessages.data.length} messages in thread ${threadId}`);
    
    // Sort messages by date (newest first) to identify the latest message
    const sortedMessages = threadMessages.data.sort((a, b) => b.date - a.date);
    const latestMessage = sortedMessages[0];
    
    // Check if the latest message is from the user (indicating they've already replied)
    const latestFrom = latestMessage.from?.[0]?.email || '';
    if (latestFrom.toLowerCase() === userEmail.toLowerCase()) {
      // console.log(`⏭️ Latest message in thread is from user - skipping thread ${threadId}`);
      return true;
    }
    
    // Check if any messages in the thread are from the user (indicating they've already replied)
    const userReplies = threadMessages.data.filter(message => {
      const from = message.from?.[0]?.email || '';
      return from.toLowerCase() === userEmail.toLowerCase();
    });
    
    if (userReplies.length > 0) {
      // console.log(`⏭️ Found ${userReplies.length} existing replies from user in thread ${threadId}`);
      userReplies.forEach((reply, index) => {
        const subject = reply.subject || 'No subject';
        const date = new Date(reply.date * 1000).toISOString();
        // console.log(`  Reply ${index + 1}: "${subject}" on ${date}`);
      });
      return true;
    }
    
    // Also check for existing drafts in this thread
    const existingDrafts = await nylas.drafts.list({
      identifier: grantId,
      queryParams: {
        threadId: threadId
      }
    });
    
    if (existingDrafts.data && existingDrafts.data.length > 0) {
      // console.log(`⏭️ Found ${existingDrafts.data.length} existing drafts in thread ${threadId}`);
      existingDrafts.data.forEach((draft, index) => {
        const subject = draft.subject || 'No subject';
        // console.log(`  Draft ${index + 1}: "${subject}"`);
      });
      return true;
    }
    
    // console.log(`✅ No existing replies or drafts found in thread ${threadId}`);
    return false;
    
  } catch (error) {
    // console.error(`❌ Error checking for existing replies in thread ${threadId}:`, error);
    // If we can't check, assume there might be replies to be safe
    return true;
  }
}

// New function to get the latest email in each thread that needs a response
export async function getLatestEmailsInThreads(grantId: string, messageIds: string[], userEmail: string): Promise<string[]> {
  try {
    // console.log(`🔍 Analyzing ${messageIds.length} messages to find latest emails in threads...`);
    
    // Group messages by thread ID
    const threadGroups = new Map<string, any[]>();
    
    // Get all messages to group them by thread
    const allMessages = await Promise.all(
      messageIds.map(async (messageId) => {
        try {
          const message = await nylas.messages.find({
            identifier: grantId,
            messageId: messageId
          });
          return message.data;
        } catch (error) {
          // console.warn(`⚠️ Could not fetch message ${messageId}:`, error);
          return null;
        }
      })
    );
    
    // Group messages by thread ID
    allMessages.forEach(message => {
      if (message && message.threadId) {
        if (!threadGroups.has(message.threadId)) {
          threadGroups.set(message.threadId, []);
        }
        threadGroups.get(message.threadId)!.push(message);
      }
    });
    
    // console.log(`📧 Found ${threadGroups.size} unique threads`);
    
    const latestMessageIds: string[] = [];
    
    // For each thread, find the latest message that needs a response
    for (const [threadId, messages] of threadGroups) {
      // Sort messages by date (newest first)
      const sortedMessages = messages.sort((a, b) => b.date - a.date);
      
      // Find the latest message that's not from the user
      const latestNonUserMessage = sortedMessages.find(message => {
        const from = message.from?.[0]?.email || '';
        return from.toLowerCase() !== userEmail.toLowerCase();
      });
      
      if (latestNonUserMessage) {
        // Check if this message needs a response (not already replied to)
        const hasExistingReplies = await checkForExistingReplies(grantId, threadId, userEmail);
        
        if (!hasExistingReplies) {
          latestMessageIds.push(latestNonUserMessage.id);
          // console.log(`✅ Added latest message in thread ${threadId}: "${latestNonUserMessage.subject}"`);
        } else {
          // console.log(`⏭️ Skipping thread ${threadId} - already has replies`);
        }
      }
    }
    
    // console.log(`📧 Returning ${latestMessageIds.length} latest messages that need responses`);
    return latestMessageIds;
    
  } catch (error) {
    // console.error(`❌ Error getting latest emails in threads:`, error);
    // Fallback to original message IDs if there's an error
    return messageIds;
  }
} 

// Get user's writing style from their email history
export async function getUserWritingStyle(grantId: string, userEmail: string): Promise<any> {
  try {
    // console.log(`🎨 Fetching writing style for ${userEmail}...`);
    
    // Get recent emails sent by the user (last 30 days)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const sentEmails = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        in: ['SENT'], // Get emails from the SENT folder
        limit: 20 // Get more examples for better style detection
      }
    });
    
    // Filter emails by date (last 30 days)
    const recentEmails = sentEmails.data?.filter(email => email.date >= thirtyDaysAgo) || [];
    
    if (!recentEmails || recentEmails.length === 0) {
      // console.log(`⚠️ No sent emails found for writing style analysis`);
      return {
        examples: [],
        examplesCount: 0,
        styleNotes: 'No recent email examples found for style analysis'
      };
    }
    
    // console.log(`📧 Found ${recentEmails.length} sent emails for style analysis`);
    
    const styleExamples = recentEmails
      .filter(email => email.body && email.body.length > 50) // Filter out very short emails
      .slice(0, 10) // Take up to 10 examples
      .map(email => ({
        subject: email.subject || 'No subject',
        to: email.to?.[0]?.email || 'Unknown recipient',
        body: email.body,
        date: new Date(email.date * 1000).toISOString()
      }));
    
    // Analyze writing style patterns
    const styleNotes = analyzeWritingStyle(styleExamples);
    
    // console.log(`✅ Writing style analysis completed with ${styleExamples.length} examples`);
    
    return {
      examples: styleExamples,
      examplesCount: styleExamples.length,
      styleNotes
    };
    
  } catch (error) {
    // console.error(`❌ Error fetching writing style:`, error);
    return {
      examples: [],
      examplesCount: 0,
      styleNotes: 'Error fetching writing style examples'
    };
  }
}

// Analyze writing style patterns from email examples
function analyzeWritingStyle(examples: any[]): string {
  if (examples.length === 0) {
    return 'No writing style examples available';
  }
  
  const styleNotes: string[] = [];
  
  // Analyze greeting patterns
  const greetings = examples.map(ex => {
    const firstLine = ex.body.split('\n')[0].toLowerCase();
    if (firstLine.includes('hi') || firstLine.includes('hello')) {
      return 'casual';
    } else if (firstLine.includes('dear') || firstLine.includes('good morning') || firstLine.includes('good afternoon')) {
      return 'formal';
    } else {
      return 'neutral';
    }
  });
  
  const casualGreetings = greetings.filter(g => g === 'casual').length;
  const formalGreetings = greetings.filter(g => g === 'formal').length;
  
  if (casualGreetings > formalGreetings) {
    styleNotes.push('Prefers casual greetings (Hi, Hello)');
  } else if (formalGreetings > casualGreetings) {
    styleNotes.push('Prefers formal greetings (Dear, Good morning/afternoon)');
  } else {
    styleNotes.push('Uses mixed greeting styles');
  }
  
  // Analyze closing patterns
  const closings = examples.map(ex => {
    const lastLines = ex.body.split('\n').slice(-3).join(' ').toLowerCase();
    if (lastLines.includes('thanks') || lastLines.includes('thank you')) {
      return 'thanks';
    } else if (lastLines.includes('best') || lastLines.includes('regards') || lastLines.includes('sincerely')) {
      return 'formal';
    } else if (lastLines.includes('cheers') || lastLines.includes('take care')) {
      return 'casual';
    } else {
      return 'neutral';
    }
  });
  
  const thanksClosings = closings.filter(c => c === 'thanks').length;
  const formalClosings = closings.filter(c => c === 'formal').length;
  const casualClosings = closings.filter(c => c === 'casual').length;
  
  if (thanksClosings > formalClosings && thanksClosings > casualClosings) {
    styleNotes.push('Prefers "Thanks" as closing');
  } else if (formalClosings > casualClosings) {
    styleNotes.push('Prefers formal closings (Best regards, Sincerely)');
  } else if (casualClosings > 0) {
    styleNotes.push('Uses casual closings (Cheers, Take care)');
  }
  
  // Analyze sentence length and complexity
  const avgSentenceLength = examples.reduce((total, ex) => {
    const sentences = ex.body.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    return total + avgLength;
  }, 0) / examples.length;
  
  if (avgSentenceLength < 15) {
    styleNotes.push('Uses short, concise sentences');
  } else if (avgSentenceLength > 25) {
    styleNotes.push('Uses longer, detailed sentences');
  } else {
    styleNotes.push('Uses moderate sentence length');
  }
  
  // Analyze tone indicators
  const hasEmojis = examples.some(ex => /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u.test(ex.body));
  const hasExclamationMarks = examples.some(ex => ex.body.includes('!'));
  const hasQuestions = examples.some(ex => ex.body.includes('?'));
  
  if (hasEmojis) {
    styleNotes.push('Occasionally uses emojis');
  }
  if (hasExclamationMarks) {
    styleNotes.push('Uses exclamation marks for emphasis');
  }
  if (hasQuestions) {
    styleNotes.push('Asks questions to engage recipients');
  }
  
  return styleNotes.join('. ');
} 