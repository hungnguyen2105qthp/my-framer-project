import { adminDb } from './firebase-admin'
import { logger } from './logger'

// Med spa consultation protocol categories for AI analysis
const medSpaCategories = [
  "Patient Interview & History",
  "Aesthetic Goals Discovery", 
  "Treatment Education & Knowledge",
  "Previous Experience Review",
  "Facial Assessment & Analysis",
  "Treatment Planning & Options",
  "Objection Handling & Concerns",
  "Closing & Treatment Commitment"
]

// Interface for phrase analysis result
interface PhraseAnalysis {
  phrase: string
  category: string
  timestamp: string
  originalTimestampId: string
  originalTranscriptId: string
  userEmail: string
  keywords: string[]
  confidence: number
}

// Interface for categorized phrases
interface PhrasesByCategory {
  [category: string]: {
    phrase: string
    timestamp: string
    originalTimestampId: string
    originalTranscriptId: string
    userEmail: string
    keywords: string[]
    confidence: number
  }[]
}

// Function to analyze transcript using OpenAI API
const analyzeTranscriptWithAI = async (transcriptText: string, speakerData: any[]): Promise<PhraseAnalysis[]> => {
  try {
    // Prepare the prompt for OpenAI
    const prompt = `
You are analyzing a med spa consultation transcript. Please identify and categorize phrases that fall into these 8 categories:

1. Consultation Opening - Greetings, introductions, welcoming patients
2. Treatment Discovery - Understanding patient concerns, goals, desired treatments
3. Objection Handling - Addressing concerns about cost, safety, pain, time
4. Upsell Opportunities - Suggesting additional treatments, packages, maintenance
5. Treatment Education - Explaining procedures, safety, expectations
6. Closing & Booking - Scheduling appointments, payment, commitment
7. Follow-up & Retention - Maintaining relationships, future visits
8. Script Adherence - Following protocols, procedures, compliance

Transcript: "${transcriptText}"

For each relevant phrase you find, provide:
- The exact phrase from the transcript
- The category it belongs to
- Keywords that indicate this category
- Confidence level (0-1)

Return as JSON array:
[
  {
    "phrase": "exact phrase from transcript",
    "category": "category name",
    "keywords": ["keyword1", "keyword2"],
    "confidence": 0.95
  }
]

Only include phrases that clearly belong to one of the 8 categories. If no phrases match, return empty array.
`

    // Call OpenAI API (you'll need to add your API key to environment variables)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert med spa consultation analyst. Analyze transcripts and categorize phrases accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiAnalysis = JSON.parse(data.choices[0].message.content)

    // Map AI analysis to our phrase structure with timestamps
    const phrases: PhraseAnalysis[] = []
    
         aiAnalysis.forEach((analysis: any) => {
       // Find the timestamp for this phrase by searching through speaker data
       const matchingSpeaker = speakerData.find(speaker => 
         speaker.text && speaker.text.toLowerCase().includes(analysis.phrase.toLowerCase())
       )
       
       if (matchingSpeaker) {
         phrases.push({
           phrase: analysis.phrase,
           category: analysis.category,
           timestamp: matchingSpeaker.timestamp || "N/A",
           originalTimestampId: "", // Will be filled by caller
           originalTranscriptId: "", // Will be filled by caller
           userEmail: "", // Will be filled by caller
           keywords: analysis.keywords || [],
           confidence: analysis.confidence || 0.8
         })
       }
     })

    return phrases

  } catch (error) {
    logger.error('Error analyzing transcript with AI:', error)
    return []
  }
}

// Function to create AI-powered analytics collection
export const createAIAnalyticsFromTranscripts = async () => {
  try {
    logger.create('Creating AI-powered analytics collection from ALL transcripts...')
    logger.info('Starting AI analysis process at:', new Date().toISOString())
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY not found in environment variables')
      return { success: false, message: 'OpenAI API key not configured' }
    }
    
    // Get all transcript documents
    const transcriptsRef = adminDb.collection('transcript')
    const transcriptsSnap = await transcriptsRef.get()
    logger.analytics(`Found ${transcriptsSnap.size} transcript document IDs`)
    
    if (transcriptsSnap.size === 0) {
      logger.error('No transcript documents found')
      return { success: false, message: 'No transcript documents found' }
    }
    
    // Process each transcript
    let processedCount = 0
    const allAnalytics: { [key: string]: any } = {}
    
    for (const transcriptDoc of transcriptsSnap.docs) {
      const transcriptId = transcriptDoc.id
      const transcriptData = transcriptDoc.data()
      
      logger.process(`Processing transcript ${processedCount + 1}/${transcriptsSnap.size}: ${transcriptId}`)
      
      try {
        // Get timestamps for this transcript
        const timestampsRef = adminDb.collection('transcript').doc(transcriptId).collection('timestamps')
        const timestampsSnap = await timestampsRef.get()
        
        // Process each timestamp document
        for (const timestampDoc of timestampsSnap.docs) {
          const timestampId = timestampDoc.id
          const timestampData = timestampDoc.data()
          
          // Extract speaker transcript data
          const speakerTranscript = timestampData.speakerTranscript || []
          const fullTranscript = speakerTranscript.map((s: any) => s.text).join(' ')
          
          if (fullTranscript.trim()) {
            // Analyze with AI
            const aiPhrases = await analyzeTranscriptWithAI(fullTranscript, speakerTranscript)
            
                         // Add metadata to phrases
             aiPhrases.forEach(phrase => {
               phrase.originalTimestampId = timestampId
               phrase.originalTranscriptId = transcriptId
               phrase.userEmail = transcriptId // Use transcriptId as userEmail
             })
            
            // Group phrases by category
            const phrasesByCategory: PhrasesByCategory = {}
            
            aiPhrases.forEach(phrase => {
              if (!phrasesByCategory[phrase.category]) {
                phrasesByCategory[phrase.category] = []
              }
              phrasesByCategory[phrase.category].push({
                phrase: phrase.phrase,
                timestamp: phrase.timestamp,
                originalTimestampId: phrase.originalTimestampId,
                originalTranscriptId: phrase.originalTranscriptId,
                userEmail: phrase.userEmail,
                keywords: phrase.keywords,
                confidence: phrase.confidence
              })
            })
            
                         // Get user data from transcript document
             let userData = null
             try {
               const userDocRef = adminDb.collection('transcript').doc(transcriptId)
               const userDoc = await userDocRef.get()
               if (userDoc.exists) {
                 userData = userDoc.data()
               }
             } catch (error) {
               logger.warn(`Could not fetch user data for ${transcriptId}:`, error)
             }

             // Store in analytics collection
             const analyticsDocId = `${transcriptId}_${timestampId}`
             await adminDb.collection('analytics').doc(analyticsDocId).set({
               transcriptId,
               timestampId,
               userEmail: transcriptId, // Use transcriptId as userEmail
               speakerTranscript: speakerTranscript, // Add speaker transcript field
               phrasesByCategory,
               totalPhrases: aiPhrases.length,
               analyzedAt: new Date(),
               aiGenerated: true,
               // User data fields
               createdAt: userData?.createdAt || new Date(),
               createdAtLocation: userData?.createdAtLocation || 'Unknown',
               deviceId: userData?.deviceId || transcriptId,
               encryptedUserData: userData?.encryptedUserData || {},
               isActive: userData?.isActive || true,
               lastUpdated: userData?.lastUpdated || new Date(),
               totalRecordings: userData?.totalRecordings || 0
             })
            
            logger.debug(`Stored analytics for ${analyticsDocId} with ${aiPhrases.length} phrases`)
          }
        }
        
        processedCount++
        
      } catch (error) {
        logger.error(`Error processing transcript ${transcriptId}:`, error)
      }
    }
    
    // Create index document
    await adminDb.collection('analytics').doc('ai_analytics_index').set({
      totalTranscripts: processedCount,
      totalAnalytics: processedCount,
      lastUpdated: new Date(),
      aiGenerated: true,
      categories: medSpaCategories
    })
    
    logger.success(`AI analytics creation completed. Processed ${processedCount} transcripts.`)
    return { success: true, message: `AI analytics created for ${processedCount} transcripts` }
    
  } catch (error) {
    logger.error('Error in AI analytics creation:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Function to get AI analytics for dashboard
export const getAIAnalytics = async () => {
  try {
    const analyticsRef = adminDb.collection('analytics')
    const analyticsSnap = await analyticsRef.get()
    
    const analytics: any[] = []
    analyticsSnap.docs.forEach(doc => {
      if (doc.id !== 'ai_analytics_index') {
        analytics.push({
          id: doc.id,
          ...doc.data()
        })
      }
    })
    
    return analytics
    
  } catch (error) {
    logger.error('Error getting AI analytics:', error)
    return []
  }
} 