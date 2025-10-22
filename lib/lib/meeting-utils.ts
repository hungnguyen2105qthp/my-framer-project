import { db, FieldValue } from '@/lib/firebase-admin';

const ATTENDEE_API_KEY = process.env.ATTENDEE_API_KEY;
const ATTENDEE_API_BASE_URL = 'https://app.attendee.dev/api/v1';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  conferenceData?: any;
  recurringEventId?: string;
  originalStartTime?: any;
  status?: string;
  visibility?: string;
}

export const extractMeetingLinkFromEvent = (event: any): string | null => {
  // Check for direct hangoutLink (Google Meet)
  if (event.hangoutLink) {
    return event.hangoutLink;
  }
  
  // Check for conferenceData (other video systems)
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video');
    if (videoEntry?.uri) {
      return videoEntry.uri;
    }
  }
  
  // Check location and description for meeting links
  const fieldsToCheck = [event.location, event.description];
  for (const field of fieldsToCheck) {
    if (!field) continue;
    
    // Check for common meeting platform URLs
    const urlMatch = field.match(/(https:\/\/[^\s<>"'\n\r]+(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|webex\.com)[^\s<>"'\n\r]*)/i);
    if (urlMatch) {
      return urlMatch[1];
    }
  }
  
  return null;
};

export const createAttendeeBot = async (meetingUrl: string, joinAt: string, metadata: any = {}) => {
  if (!ATTENDEE_API_KEY || ATTENDEE_API_KEY.trim() === '') {
    throw new Error('ATTENDEE_API_KEY environment variable is not set');
  }

  // Format the joinAt date to ISO string if it's not already
  let formattedJoinAt = joinAt;
  try {
    const date = new Date(joinAt);
    if (!isNaN(date.getTime())) {
      formattedJoinAt = date.toISOString();
    }
  } catch (error) {
    // console.warn('Failed to format date, using original:', joinAt);
  }

  // Format metadata fields as strings
  const formattedMetadata = {
    ...metadata,
    event_id: metadata.event_id || '',
    event_summary: metadata.event_summary || 'Meeting Bot',
    user_email: metadata.user_email || '',
    auto_scheduled: metadata.auto_scheduled || 'true',
    scheduled_at: new Date().toISOString(),
    timezone: metadata.timezone || 'UTC',
    description: metadata.description || '',
    attendees: Array.isArray(metadata.attendees) ? JSON.stringify(metadata.attendees) : '[]',
    location: metadata.location || '',
    htmlLink: metadata.htmlLink || '',
    hangoutLink: metadata.hangoutLink || '',
    conferenceData: metadata.conferenceData ? JSON.stringify(metadata.conferenceData) : 'null',
    recurringEventId: metadata.recurringEventId || '',
    originalStartTime: metadata.originalStartTime ? JSON.stringify(metadata.originalStartTime) : '',
    visibility: metadata.visibility || 'default'
  };

  const botConfig = {
    meeting_url: meetingUrl,
    bot_name: formattedMetadata.event_summary,
    join_at: formattedJoinAt,
    metadata: formattedMetadata,
    recording_settings: {
      format: 'mp4',
      view: 'speaker_view',
      resolution: '1080p'
    },
    transcription_settings: {
      deepgram: {
        language: 'en'
      }
    },
    bot_chat_message: {
      to: 'everyone',
      message: 'Hello everyone, I\'m here to record and summarize this meeting.'
    },
    debug_settings: {
      create_debug_recording: false
    }
  };

  try {
    const response = await fetch(`${ATTENDEE_API_BASE_URL}/bots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${ATTENDEE_API_KEY}`
      },
      body: JSON.stringify(botConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create bot: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    // console.error('Error creating bot:', error);
    throw new Error(`Failed to create bot: ${error.message}`);
  }
};

export const saveMeetingToFirestore = async (userEmail: string, event: any, meetingLink: string, botId: string) => {
  try {
    const meetingData = {
      // Meeting Info
      title: event.summary || 'Untitled Meeting',
      description: event.description || '',
      startTime: event.start?.dateTime || event.start?.date || '',
      endTime: event.end?.dateTime || event.end?.date || '',
      location: event.location || '',
      meetingLink: meetingLink,
      attendees: event.attendees || [],
      htmlLink: event.htmlLink || '',
      // Bot Info
      botId: botId,
      botEnabled: true,
      status: 'scheduled',
      // Metadata
      googleEventId: event.id,
      hangoutLink: event.hangoutLink || '',
      conferenceData: event.conferenceData || null,
      recurringEventId: event.recurringEventId || null,
      originalStartTime: event.originalStartTime || null,
      visibility: event.visibility || 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString()
    };

    // Save to meetings collection (for live tracking)
    await db
      .collection('meetings')
      .doc(userEmail)
      .collection('savedbots')
      .doc(event.id)
      .set(meetingData);

    // Initialize in transcripts collection (will be updated after meeting)
    await db
      .collection('transcript')
      .doc(userEmail)
      .collection('timestamps')
      .doc(event.id)
      .set({
        ...meetingData,
        status: 'scheduled',
        timestamp: FieldValue.serverTimestamp(),
        name: event.summary || 'Untitled Meeting',
        emoji: '📝',
        tags: [],
        notes: '',
        actionItems: {},
        'speaker transcript': {},
        transcript: '',
        audioURL: '',
        videoURL: ''
      });

    // console.log(`✅ Saved meeting ${event.id} to both collections for user ${userEmail}`);
  } catch (error) {
    // console.error('Error saving meeting to Firestore:', error);
    throw error;
  }
};

export async function cancelBot(botId: string) {
  if (!ATTENDEE_API_KEY || ATTENDEE_API_KEY.trim() === '') {
    throw new Error('ATTENDEE_API_KEY environment variable is not set');
  }

  const response = await fetch(`${ATTENDEE_API_BASE_URL}/bots/${botId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${ATTENDEE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel bot: ${response.status} - ${await response.text()}`);
  }

  return await response.json();
} 