import { collection, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, arrayUnion, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Client } from '@notionhq/client';

interface NotionConfig {
  pageId: string;
  pageTitle: string;
  workspaceIcon: string;
  workspaceId: string;
  workspaceName: string;
  exportNotes: boolean;
  exportActionItems: boolean;
}

interface AIInsightsConfig {
  name: string;
  description: string;
  count: string;
}

interface ActionItem {
  title: string;
  description: string;
  done: boolean;
  id: string;
}

interface TranscriptData {
  timestamp: number;
  name: string;
  meetingName: string;
  notes?: string;
  actionItems: ActionItem[];
  transcript: string;
  tags?: string[];
}

interface Step {
  id: string;
  type: string;
  title?: string;
  config?: any;
}

// Interface for Automation Document Data
interface AutomationDocData {
  name?: string;
  steps: Step[];
  createdAt?: Timestamp;
}

export async function exportToNotion(userEmail: string) {
  try {
    // console.log('=== Starting Export Process ===');
    // console.log('User:', userEmail);
    
    const db = getFirebaseDb();

    // Get the most recent transcript document
    const transcriptRef = collection(db, `transcript/${userEmail}/timestamps`);
    const transcriptQuery = query(transcriptRef, orderBy('timestamp', 'desc'), limit(1));
    const transcriptSnapshot = await getDocs(transcriptQuery);

    if (transcriptSnapshot.empty) {
      throw new Error('No transcript found');
    }

    const transcriptDoc = transcriptSnapshot.docs[0];
    const transcriptData = transcriptDoc.data() as TranscriptData;
    // console.log('Found transcript:', {
    //   id: transcriptDoc.id,
    //   name: transcriptData.name,
    //   timestamp: transcriptData.timestamp,
    //   hasNotes: !!transcriptData.notes,
    //   actionItemsCount: transcriptData.actionItems?.length
    // });

    // Get user document for integration data
    const userDoc = await getDoc(doc(db, 'users', userEmail));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    const userData = userDoc.data();

    // Get all automation documents for this user
    const automationsRef = collection(db, `integratedautomations/${userEmail}/automations`);
    const automationDocs = await getDocs(automationsRef);

    // console.log(`Found ${automationDocs.size} automation documents`);

    // Process each automation document
    for (const automationDoc of automationDocs.docs) {
      const automationData = automationDoc.data();
      // console.log(`Processing automation: ${automationDoc.id}`, { name: automationData.name });
      
      // Get steps directly from the 'steps' array field in the automation document
      const steps: Step[] = Array.isArray(automationData.steps) ? automationData.steps : [];

      // console.log(`Found ${steps.length} steps in the automation document array.`);

      // Check if the trigger condition is met (if necessary - requires tags on transcriptData)
      const triggerStep = steps.find(step => step.type === 'trigger');
      let triggerMet = true; // Default to true if no trigger step or no tags required

      if (triggerStep?.config?.tags && triggerStep.config.tags.length > 0) {
          const meetingTags = transcriptData.tags || []; // Assuming transcriptData has tags
          triggerMet = triggerStep.config.tags.some((tag: string) => meetingTags.includes(tag));
          // console.log(`Trigger check: Required tags [${triggerStep.config.tags.join(", ")}], Meeting tags [${meetingTags.join(", ")}], Met: ${triggerMet}`);
      } else {
          // console.log("Trigger check: No specific tags required or no trigger step.");
      }

      if (!triggerMet) {
          // console.log(`Skipping automation ${automationDoc.id} because trigger conditions not met.`);
          continue; // Skip to the next automation
      }

      // Process each step in the steps array
      for (const stepData of steps) {
        // Skip the trigger step itself
        if (stepData.type === 'trigger') continue;

        // console.log('Processing step:', {
        //   id: stepData.id, // Use id from step object
        //   type: stepData.type,
        //   title: stepData.title
        // });

        try {
          switch (stepData.type) {
            case 'notion':
              if (userData.notionIntegration) {
                 // Ensure stepData.config exists before accessing its properties
                 if (stepData.config) {
                     await processNotionStep(transcriptData, userEmail, stepData.config as NotionConfig);
                 } else {
                     // console.warn("Skipping Notion step: config is missing");
                 }
              }
              break;

            case 'slack':
              if (userData.slackIntegration) {
                  if (stepData.config) {
                     await processSlackStep(transcriptData, userEmail, {
                       channelId: stepData.config.channelId,
                       channelName: stepData.config.channelName,
                       sendNotes: stepData.config.sendNotes,
                       sendActionItems: stepData.config.sendActionItems,
                       type: stepData.type // Pass type if needed by processSlackStep
                     });
                  } else {
                      // console.warn("Skipping Slack step: config is missing");
                  }
              }
              break;

            case 'hubspot':
              if (userData.hubspotIntegration) {
                  if (stepData.config) {
                     await processHubSpotStep(transcriptData, userEmail, {
                       ...stepData.config, // Pass the whole config
                       id: stepData.id, // Pass step id if needed
                       type: stepData.type // Pass type if needed
                     } as any); // Cast needed based on processHubSpotStep signature
                  } else {
                     // console.warn("Skipping HubSpot step: config is missing");
                  }
              }
              break;

            case 'linear':
              if (userData.linearIntegration) {
                  if (stepData.config) {
                      await processLinearStep(transcriptData, userEmail, stepData.config as { teamId: string; teamName: string });
                  } else {
                     // console.warn("Skipping Linear step: config is missing");
                  }
              }
              break;

            // **** ADDED AI INSIGHTS CASE ****
            case 'ai-insights':
              // console.log("Found AI Insights step. Processing...");
              if (stepData.config) {
                // Pass the automationDoc.ref so the function can save results back to this document
                await processAIInsightsStep(userEmail, stepData, transcriptData, automationDoc.ref);
              } else {
                  // console.warn("Skipping AI Insights step: config is missing");
              }
              break;

            default:
              // console.log(`Unknown or unhandled step type: ${stepData.type}`);
          }
        } catch (error) {
          // console.error(`Error processing step ${stepData.type} (ID: ${stepData.id}):`, error);
          // Continue processing other steps even if one fails
        }
      }
    }

    // console.log('=== Export Process Complete ===');
    return true;
  } catch (error) {
    // console.error('Error in exportToNotion:', error);
    throw error;
  }
}

async function processNotionStep(transcriptData: TranscriptData, userEmail: string, stepData: NotionConfig) {
  // console.log('[Notion Export] Processing Notion step:', {
  //   hasTranscriptData: !!transcriptData,
  //   userEmail,
  //   pageTitle: stepData.pageTitle,
  //   exportNotes: stepData.exportNotes,
  //   exportActionItems: stepData.exportActionItems
  // });

  try {
    // Get user's Notion access token
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', userEmail));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    /*
    console.log('[Notion Export] User data:', {
      hasNotionIntegration: !!userData.notionIntegration,
      notionFields: userData.notionIntegration ? Object.keys(userData.notionIntegration) : [],
      hasAccessToken: !!userData.notionIntegration?.accessToken,
      tokenLength: userData.notionIntegration?.accessToken?.length
    });
    */

    const notionIntegration = userData.notionIntegration;

    if (!notionIntegration?.accessToken) {
      throw new Error('Notion access token not found');
    }

    // Verify token with a test API call first
    try {
      const testResponse = await fetch('/api/notion/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: notionIntegration.accessToken
        }),
      });

      if (!testResponse.ok) {
        const error = await testResponse.json();
        throw new Error(error.error || 'Failed to verify Notion token');
      }

      // console.log('[Notion Export] Token verification successful');
    } catch (error: any) {
      // console.error('[Notion Export] Token verification failed:', error);
      throw new Error('Invalid or expired Notion token - please reconnect your Notion account');
    }

    // Prepare blocks array
    const blocks: any[] = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Meeting Details' } }],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ 
            type: 'text', 
            text: { 
              content: `Meeting Time: ${new Date(transcriptData.timestamp).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })}` 
            } 
          }],
        },
      },
    ];

    // Add notes if enabled
    if (stepData.exportNotes && transcriptData.notes) {
      // console.log('[Notion Export] Adding notes to blocks...');
      blocks.push(
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Meeting Notes' } }],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: transcriptData.notes } }],
          },
        }
      );
    }

    // Add action items if enabled
    if (stepData.exportActionItems && transcriptData.actionItems?.length > 0) {
      // console.log('[Notion Export] Adding action items to blocks...', {
      //   actionItemCount: transcriptData.actionItems.length,
      //   actionItems: transcriptData.actionItems
      // });
      
      blocks.push(
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Action Items' } }],
          },
        }
      );

      // Add each action item as a to_do block
      transcriptData.actionItems.forEach((item) => {
        blocks.push({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ 
              type: 'text', 
              text: { 
                content: item.title
              } 
            }],
            checked: item.done,
          },
        });
        
        // Add description as a paragraph block if it exists
        if (item.description) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { 
                  content: item.description 
                } 
              }],
            },
          });
        }
      });
    }

    // console.log('[Notion Export] Creating Notion page...', {
    //   pageId: stepData.pageId,
    //   blockCount: blocks.length,
    //   hasNotes: stepData.exportNotes && !!transcriptData.notes,
    //   hasActionItems: stepData.exportActionItems && transcriptData.actionItems?.length > 0,
    //   blocks: blocks
    // });

    // Create a new page in Notion through our API
    const response = await fetch('/api/notion/create-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: notionIntegration.accessToken,
        pageId: stepData.pageId,
        title: transcriptData.name || 'Untitled Meeting',
        blocks: blocks,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create Notion page');
    }

    const data = await response.json();
    /*
    console.log('[Notion Export] Page created successfully:', {
      pageId: data.pageId
    });
    */

    return true;
  } catch (error: any) {
    // console.error('[Notion Export] Error creating Notion page:', {
    //   error: error.message,
    //   stack: error.stack
    // });
    throw error;
  }
}

export async function processSlackStep(
  transcript: TranscriptData,
  userEmail: string,
  stepData: {
    channelId: string;
    channelName: string;
    sendNotes: boolean;
    sendActionItems: boolean;
    type: string;
  }
): Promise<void> {
  // console.log('Processing Slack step:', {
//     meetingName: transcript.meetingName,
//     userEmail,
//     hasNotes: !!transcript.notes,
//     actionItemsCount: transcript.actionItems?.length,
//     channelName: stepData.channelName
//   });

  try {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', userEmail));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const slackIntegration = userDoc.data()?.slackIntegration;
    if (!slackIntegration?.teamId || !slackIntegration?.botUserId || !slackIntegration?.botEmail) {
      throw new Error('Slack integration not found or incomplete');
    }

    // console.log('Found Slack integration:', {
    //   teamId: slackIntegration.teamId,
    //   teamName: slackIntegration.teamName,
    //   botUserId: slackIntegration.botUserId
    // });

    // Get workspace data to use bot token
    const workspaceDoc = await getDoc(doc(db, 'slack_workspaces', slackIntegration.teamId));
    if (!workspaceDoc.exists()) {
      throw new Error('Workspace document not found');
    }

    const workspaceData = workspaceDoc.data();
    const botToken = workspaceData.botAccessToken;

    if (!botToken) {
      throw new Error('Bot token not found');
    }

    // Create message blocks
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📝 ${transcript.meetingName}`,
          emoji: true
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: `Meeting recorded on ${new Date(transcript.timestamp).toLocaleString()}`,
            emoji: true
          }
        ]
      },
      {
        type: 'divider'
      }
    ];

    // Add notes if configured and available
    if (stepData.sendNotes && transcript.notes) {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Meeting Notes:*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: transcript.notes
          }
        },
        {
          type: 'divider'
        }
      );
    }

    // Add action items if configured and available
    if (stepData.sendActionItems && transcript.actionItems?.length > 0) {
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Action Items:*'
          }
        }
      );

      transcript.actionItems.forEach((item, index) => {
        // Add title
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${index + 1}. ${item.title} ${item.done ? '✅' : ''}`
          }
        });

        // Add description if it exists
        if (item.description) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `   _${item.description}_`
            }
          });
        }
      });
    }

    try {
      // console.log(`Sending message to channel ${stepData.channelName} (${stepData.channelId})`);
      
      const response = await fetch('/api/slack/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: stepData.channelId,
          blocks,
          botToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      // console.log('Successfully sent message to Slack channel:', stepData.channelName);
    } catch (error) {
      // console.error('Error sending message to channel:', stepData.channelName, error);
      throw error;
    }
  } catch (error) {
    // console.error('Error in processSlackStep:', error);
    throw error;
  }
}

async function processHubSpotStep(transcriptData: TranscriptData, userEmail: string, stepData: {
  accountType: string;
  contacts: boolean;
  deals: boolean;
  id: string;
  includeActionItems: boolean;
  includeMeetingNotes: boolean;
  portalId: string;
  type: string;
}) {
  // console.log('[HubSpot Export] Processing HubSpot step:', {
  //   hasTranscriptData: !!transcriptData,
  //   userEmail,
  //   stepConfig: stepData
  // });

  try {
    // Get user's HubSpot integration data for authentication
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', userEmail));
    const hubspotData = userDoc.data()?.hubspotIntegration;

    if (!hubspotData?.accessToken || !hubspotData?.refreshToken) {
      throw new Error('HubSpot authentication tokens not found');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(hubspotData.expiresAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now >= expiresAt - fiveMinutes) {
      // console.log('[HubSpot Export] Token expired or expiring soon, refreshing...');
      
      // Refresh the token
      const response = await fetch('/api/hubspot/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: hubspotData.refreshToken,
          userEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh HubSpot token');
      }

      const { accessToken } = await response.json();
      hubspotData.accessToken = accessToken;
    }

    // Prepare meeting content based on configuration
    let meetingContent = '';
    if (stepData.includeMeetingNotes && transcriptData.notes) {
      meetingContent += `Meeting Notes:\n${transcriptData.notes}\n\n`;
    }

    if (stepData.includeActionItems && transcriptData.actionItems?.length > 0) {
      meetingContent += 'Action Items:\n';
      transcriptData.actionItems.forEach((item: ActionItem) => {
        meetingContent += `- ${item.title}\n`;
        if (item.description) {
          meetingContent += `  ${item.description}\n`;
        }
      });
    }

    // Get timestamp in ISO format
    let meetingDate: string;
    const timestamp = transcriptData.timestamp;
    
    interface FirestoreTimestamp {
      seconds: number;
      nanoseconds: number;
    }

    function isFirestoreTimestamp(value: any): value is FirestoreTimestamp {
      return typeof value === 'object' && value !== null && 
             'seconds' in value && typeof value.seconds === 'number' &&
             'nanoseconds' in value && typeof value.nanoseconds === 'number';
    }

    if (isFirestoreTimestamp(timestamp)) {
      // Firestore timestamp
      meetingDate = new Date(timestamp.seconds * 1000).toISOString();
    } else if (typeof timestamp === 'number') {
      // Unix timestamp in milliseconds
      meetingDate = new Date(timestamp).toISOString();
    } else {
      // Fallback to current time
      meetingDate = new Date().toISOString();
    }

    // Create engagement in HubSpot
    const engagementResponse = await fetch('/api/hubspot/create-engagement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: hubspotData.accessToken,
        portalId: stepData.portalId,
        accountType: stepData.accountType,
        contacts: stepData.contacts,
        deals: stepData.deals,
        meetingName: transcriptData.name || 'Meeting',
        meetingDate,
        content: meetingContent
      })
    });

    if (!engagementResponse.ok) {
      const error = await engagementResponse.json();
      throw new Error(error.message || 'Failed to create HubSpot engagement');
    }

    // console.log('[HubSpot Export] Successfully created engagement');
    return true;
  } catch (error) {
    // console.error('[HubSpot Export] Error:', error);
    throw error;
  }
}

async function processLinearStep(transcriptData: TranscriptData, userEmail: string, stepData: { teamId: string; teamName: string }) {
  // console.log('=== Starting Linear Step Processing ===');
  // console.log('Processing Linear step for:', {
//     userEmail,
//     meetingName: transcriptData.name,
//     timestamp: transcriptData.timestamp,
//     teamId: stepData.teamId,
//     teamName: stepData.teamName
//   });
  
  try {
    // Get user's Linear integration data from Firestore
    // console.log('Fetching Linear integration data from Firestore...');
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', userEmail));
    const linearIntegration = userDoc.data()?.linearIntegration;

    // console.log('Linear integration data:', {
    //   hasIntegration: !!linearIntegration,
    //   hasAccessToken: !!linearIntegration?.accessToken,
    //   tokenType: linearIntegration?.tokenType,
    //   scope: linearIntegration?.scope,
    //   userId: linearIntegration?.userId,
    //   userName: linearIntegration?.userName
    // });

    if (!linearIntegration?.accessToken) {
      // console.error('No Linear access token found in user document');
      return;
    }

    // Extract action items from transcript data
    // console.log('Extracting action items from transcript:', {
    //   hasActionItems: !!transcriptData.actionItems,
    //   actionItemCount: transcriptData.actionItems?.length || 0
    // });

    const actionItems = transcriptData.actionItems || [];
    if (actionItems.length === 0) {
      // console.log('No action items found in transcript data');
      return;
    }

    // console.log(`Found ${actionItems.length} action items to process:`, 
    //   actionItems.map(item => ({
    //     id: item.id,
    //     title: item.title,
    //     hasDescription: !!item.description,
    //     done: item.done
    //   }))
    // );

    // Create issues for each action item
    for (const actionItem of actionItems) {
      // console.log(`Processing action item: ${actionItem.title}`);
      
      try {
        // console.log('Creating Linear issue with data:', {
        //   teamId: stepData.teamId,
        //   title: actionItem.title,
        //   descriptionLength: actionItem.description?.length || 0
        // });

        const response = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${linearIntegration.accessToken}`
          },
          body: JSON.stringify({
            query: `
              mutation CreateIssue($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                  success
                  issue {
                    id
                    identifier
                    url
                    title
                    description
                  }
                }
              }
            `,
            variables: {
              input: {
                teamId: stepData.teamId,
                title: actionItem.title,
                description: `${actionItem.description}\n\nCreated from meeting: ${transcriptData.name || 'Untitled Meeting'}\nTimestamp: ${new Date(transcriptData.timestamp).toLocaleString()}`,
                priority: 2
              }
            }
          })
        });

        const data = await response.json();
        // console.log('Linear API response:', {
        //   status: response.status,
        //   ok: response.ok,
        //   hasErrors: !!data.errors,
        //   errors: data.errors,
        //   success: data.data?.issueCreate?.success,
        //   issueData: data.data?.issueCreate?.issue
        // });
        
        if (data.errors) {
          // console.error('Error creating Linear issue:', {
          //   errors: data.errors,
          //   actionItem: actionItem.title
          // });
          continue;
        }

        if (data.data?.issueCreate?.success) {
          // console.log('Successfully created Linear issue:', {
          //   identifier: data.data.issueCreate.issue.identifier,
          //   url: data.data.issueCreate.issue.url,
          //   title: data.data.issueCreate.issue.title
          // });
        }
      } catch (error) {
        // console.error('Error creating Linear issue for action item:', {
        //   actionItem: actionItem.title,
        //   error: error instanceof Error ? error.message : 'Unknown error',
        //   stack: error instanceof Error ? error.stack : undefined
        // });
      }
    }

    // console.log('=== Linear Step Processing Complete ===');
  } catch (error) {
    // console.error('Fatal error in processLinearStep:', {
    //   error: error instanceof Error ? error.message : 'Unknown error',
    //   stack: error instanceof Error ? error.stack : undefined,
    //   userEmail,
    //   meetingName: transcriptData.name
    // });
    throw error;
  }
}

async function processAIInsightsStep(userEmail: string, stepData: Step, transcriptData: TranscriptData, automationDocRef: any) {
  try {
    // Assuming stepData contains the config
    const insightConfig = stepData.config as AIInsightsConfig;
    if (!insightConfig) {
        // console.error('AI Insights step config is missing or invalid');
        return; // Exit if config is missing
    }

    // console.log('Processing AI Insights Step:', {
    //   name: insightConfig.name,
    //   description: insightConfig.description,
    //   count: insightConfig.count
    // });

    if (!transcriptData.transcript) {
      // console.log('No transcript text found for AI insights');
      return; // Exit if no transcript
    }

    // Generate insight using the API
    // console.log('Generating insight via /api/insights/generate...');
    const response = await fetch('/api/insights/generate', { // Ensure this endpoint is correct
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: transcriptData.transcript,
        description: insightConfig.description // Using description as the prompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const { content } = await response.json();

    if (content) {
      // console.log('Generated insight content available');

      const newResponse = {
        content,
        meeting: transcriptData.name || transcriptData.meetingName || 'Untitled Meeting',
        date: Timestamp.fromDate(new Date()) // Use Firestore Timestamp
      };

      // console.log(`Attempting to update Firestore document: ${automationDocRef.path} for step ID: ${stepData.id}`);

      // Fetch the automation document data
      const automationDocSnap = await getDoc(automationDocRef);
      if (!automationDocSnap.exists()) {
          // console.error("Automation document not found, cannot save insight response.");
          return;
      }
      
      // Cast data to the defined interface
      const automationData = automationDocSnap.data() as AutomationDocData | undefined;
      if (!automationData) {
          // console.error("Automation document data is undefined.");
          return;
      }
      
      // Make a mutable copy or ensure type compatibility
      let currentSteps: Step[] = Array.isArray(automationData.steps) 
          ? JSON.parse(JSON.stringify(automationData.steps)) // Deep copy to ensure mutability if needed
          : []; 
      
      // Find the index of the current AI Insights step being processed
      const stepIndex = currentSteps.findIndex(step => step.id === stepData.id); 

      if (stepIndex === -1) {
          // console.error(`Could not find step with ID ${stepData.id} in automation document ${automationDocRef.path}`);
          return;
      }

      // Ensure the config and responses array exist on the specific step object
      const targetStep = currentSteps[stepIndex];
      if (!targetStep.config) {
          // console.log(`Initializing config for step ID ${stepData.id}`);
          targetStep.config = {}; // Initialize config if missing
      }
      if (!Array.isArray(targetStep.config.responses)) {
           // console.log(`Initializing responses array for step ID ${stepData.id}`);
          targetStep.config.responses = []; // Initialize responses array if missing
      }

      // Add the new response to the specific step's responses array
      targetStep.config.responses.push(newResponse);
      // console.log(`Added new response to step ${stepData.id}. Total responses: ${targetStep.config.responses.length}`);

      // Update the entire 'steps' array in the automation document
      await updateDoc(automationDocRef, {
        steps: currentSteps as any // Cast to any to bypass strict type check
      });
      
      // console.log(`✅ Successfully updated steps in automation ${automationDocRef.id} with insight for "${insightConfig.name}" from meeting "${newResponse.meeting}"`);

    } else {
        // console.log("No content generated by the insight API.");
    }
  } catch (error) {
    // console.error('Error processing AI Insights step:', error);
    // Decide if error should halt further processing or just be logged
  }
}

async function processSalesforceStep(
  transcriptData: any,
  userEmail: string,
  config: any
) {
  // console.log('[Salesforce Export] Processing Salesforce step:', {
//     hasTranscriptData: !!transcriptData,
//     userEmail,
//     config
//   });

  // Get user's Salesforce access token
  const db = getFirebaseDb();
  const userDoc = doc(db, 'users', userEmail);
  const userSnapshot = await getDoc(userDoc);

  if (!userSnapshot.exists()) {
    throw new Error('User document not found');
  }

  const userData = userSnapshot.data();
  const salesforceData = userData.salesforce;

  if (!salesforceData?.accessToken || !salesforceData?.instanceUrl) {
    throw new Error('Salesforce access token or instance URL not found');
  }

  // Extract meeting details (ensure these exist on transcriptData or handle undefined)
  const title = transcriptData.name || transcriptData.meetingName || 'Untitled Meeting';
  const summary = transcriptData.notes || ''; // Use notes as summary
  const actionItems = transcriptData.actionItems || [];
  const attendees = transcriptData.attendees || []; // Assuming attendees exist
  const date = transcriptData.timestamp ? 
      (typeof transcriptData.timestamp === 'number' ? new Date(transcriptData.timestamp) : transcriptData.timestamp.toDate()) 
      : new Date(); // Convert Firestore timestamp or use number
  const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD for Salesforce

  // Create meeting notes in Salesforce
  if (config.includeMeetingNotes) {
    // console.log('[Salesforce Export] Creating meeting task...');
    const meetingNote = {
      Subject: title,
      Description: `Summary:\n${summary}\n\nAction Items:\n${actionItems.map((item: ActionItem) => `- ${item.title}`).join('\n')}`,
      ActivityDate: dateString, // Use formatted date string
      Type: 'Meeting', // Changed type to Meeting for clarity
      Status: 'Completed'
    };

    try {
      const taskResponse = await fetch(`${salesforceData.instanceUrl}/services/data/v59.0/sobjects/Task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesforceData.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingNote)
      });

      if (!taskResponse.ok) {
          const errorBody = await taskResponse.text();
          // console.error(`[Salesforce Export] Failed to create meeting task. Status: ${taskResponse.status}, Body: ${errorBody}`);
          throw new Error(`Failed to create meeting task in Salesforce. Status: ${taskResponse.status}`);
      }
      const taskResult = await taskResponse.json();
      // console.log('[Salesforce Export] Created meeting task', { id: taskResult.id });
    } catch(error) {
       // console.error('[Salesforce Export] Error creating meeting task:', error);
    }
  }

  // Create action items as tasks
  if (config.includeActionItems && actionItems.length > 0) {
    // console.log(`[Salesforce Export] Creating ${actionItems.length} action item tasks...`);
    for (const item of actionItems) {
      const task = {
        Subject: item.title, 
        Description: `${item.description || ''}\n\nFrom meeting: ${title}`,
        ActivityDate: dateString,
        Type: 'Task', // Changed type to Task
        Status: 'Not Started',
        Priority: 'Normal'
      };

      try {
        const taskResponse = await fetch(`${salesforceData.instanceUrl}/services/data/v59.0/sobjects/Task`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${salesforceData.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(task)
        });

        if (!taskResponse.ok) {
           const errorBody = await taskResponse.text();
           // console.error(`[Salesforce Export] Failed to create action item task '${item.title}'. Status: ${taskResponse.status}, Body: ${errorBody}`);
           // Continue to next item
        } else {
           const taskResult = await taskResponse.json();
           // console.log(`[Salesforce Export] Created action item task '${item.title}'`, { id: taskResult.id });
        }
      } catch (error) {
         // console.error(`[Salesforce Export] Error creating action item task '${item.title}':`, error);
      }
    }
  }

  // Update contacts if needed (Basic example: Search by email, create if not found)
  // Assumes transcriptData.attendees is an array of { email: string, name: string }
  if (config.contacts && attendees.length > 0) { 
      // console.log(`[Salesforce Export] Processing ${attendees.length} attendees for contact sync...`);
      for (const attendee of attendees) {
          if (!attendee.email) {
              // console.warn('[Salesforce Export] Skipping attendee without email:', attendee.name);
              continue;
          }
          
          try {
              // Search for existing contact by email
              const searchQuery = `FIND {${attendee.email}} IN EMAIL FIELDS RETURNING Contact(Id, Name, Email LIMIT 1)`;
              const searchResponse = await fetch(
                  `${salesforceData.instanceUrl}/services/data/v59.0/search/?q=${encodeURIComponent(searchQuery)}`,
                  {
                      headers: {
                          'Authorization': `Bearer ${salesforceData.accessToken}`
                      }
                  }
              );

              if (!searchResponse.ok) {
                  const errorBody = await searchResponse.text();
                  // console.error(`[Salesforce Export] Failed to search contact ${attendee.email}. Status: ${searchResponse.status}, Body: ${errorBody}`);
                  continue;
              }

              const searchData = await searchResponse.json();
              
              if (!searchData.searchRecords || searchData.searchRecords.length === 0) {
                  // Create new contact if not found
                  // console.log(`[Salesforce Export] Contact not found for ${attendee.email}. Creating...`);
                  const contact = {
                      FirstName: attendee.name?.split(' ')[0] || 'Attendee',
                      LastName: attendee.name?.split(' ').slice(1).join(' ') || '(from Wisp)', // Provide a default last name
                      Email: attendee.email
                  };

                  const createResponse = await fetch(`${salesforceData.instanceUrl}/services/data/v59.0/sobjects/Contact`, {
                      method: 'POST',
                      headers: {
                          'Authorization': `Bearer ${salesforceData.accessToken}`,
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(contact)
                  });

                  if (!createResponse.ok) {
                      const errorBody = await createResponse.text();
                      // console.error(`[Salesforce Export] Failed to create contact ${attendee.email}. Status: ${createResponse.status}, Body: ${errorBody}`);
                  } else {
                      const createResult = await createResponse.json();
                      // console.log(`[Salesforce Export] Created contact ${attendee.email}`, { id: createResult.id });
                  }
              } else {
                 // console.log(`[Salesforce Export] Found existing contact for ${attendee.email}:`, searchData.searchRecords[0].Id);
                 // Optionally update existing contact here if needed
              }
          } catch (error) {
             // console.error(`[Salesforce Export] Error processing attendee ${attendee.email}:`, error);
          }
      }
  }

  // console.log('[Salesforce Export] Finished processing Salesforce step.');
  return true;
}