import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { logger } from './logger'

// Import admin SDK for server-side operations only
import { adminDb } from './firebase-admin'

// Category definitions for med spa consultation protocol analysis
const categories = [
  { name: "Patient Interview & History", color: "bg-purple-500", keywords: ["medical history", "allergies", "medications", "demographics", "age", "gender", "contraindications", "GFE", "intake form", "medical conditions", "precautions", "chart review", "patient chart", "review patient", "medical record"] },
  { name: "Aesthetic Goals Discovery", color: "bg-blue-500", keywords: ["what brings you", "aesthetic goals", "changes hoping", "specific concerns", "fine lines", "volume loss", "nasolabial folds", "desired outcome", "subtle enhancement", "dramatic changes", "ideal outcome", "expectations", "looking for", "want to achieve", "hoping to see"] },
  { name: "Treatment Education & Knowledge", color: "bg-green-500", keywords: ["neuromodulators", "dermal fillers", "how they work", "botox", "dysport", "juvederm", "restylane", "injectable treatments", "permanent", "temporary", "misconceptions", "clarifications", "explain", "educate", "understanding", "knowledge level", "product education"] },
  { name: "Previous Experience Review", color: "bg-yellow-500", keywords: ["previous treatments", "past experiences", "previous injectable", "type of products", "treatment areas", "outcomes", "past satisfaction", "complications", "side effects", "provider history", "another provider", "why seeking new", "previous results"] },
  { name: "Facial Assessment & Analysis", color: "bg-red-500", keywords: ["facial symmetry", "proportions", "volume distribution", "rule of thirds", "golden ratio", "skin quality", "elasticity", "texture", "sun damage", "muscle movement", "expression patterns", "dynamic wrinkles", "static wrinkles", "facial anatomy", "assessment"] },
  { name: "Treatment Planning & Options", color: "bg-orange-500", keywords: ["treatment options", "neuromodulators", "dermal fillers", "combination treatments", "wrinkle reduction", "volume restoration", "skin texture", "sculptra", "radiesse", "skinvive", "duration of results", "downtime", "recovery", "cost considerations"] },
  { name: "Objection Handling & Concerns", color: "bg-teal-500", keywords: ["expensive", "cost", "price", "afford", "budget", "scared", "nervous", "pain", "hurt", "side effects", "risks", "safe", "natural", "fears", "concerns", "anxiety", "needles", "unnatural", "pain management", "topical anesthetic"] },
  { name: "Closing & Treatment Commitment", color: "bg-gray-600", keywords: ["book", "schedule", "appointment", "proceed", "start treatment", "ready", "decision", "move forward", "commit", "deposit", "payment", "financing", "care credit", "today", "confirm", "sign up", "register", "treatment plan", "maintenance sessions"] },
]

// Function to analyze transcript text and extract phrases by category
const analyzeTranscriptText = (text: string, speakerTranscript: any[] = []) => {
  const documentPhrases: { phrase: string; category: string; color: string; keywords: string[]; timestamp: string }[] = []
  
  categories.forEach(category => {
    const matchingKeywords = category.keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
    
    if (matchingKeywords.length > 0) {
      const sentences = text.split(/[.!?]+/)
      sentences.forEach(sentence => {
        if (matchingKeywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))) {
          const cleanPhrase = sentence.trim()
          if (cleanPhrase.length > 0) {
            // Find the matching speaker entry to get the timestamp
            // Look for speakers who contain any of the matching keywords from this phrase
            const matchingSpeaker = speakerTranscript.find(speaker => 
              speaker.text && matchingKeywords.some(keyword => 
                speaker.text.toLowerCase().includes(keyword.toLowerCase())
              )
            )
            
            documentPhrases.push({
              phrase: cleanPhrase.length > 100 ? cleanPhrase.substring(0, 100) + '...' : cleanPhrase,
              category: category.name,
              color: category.color,
              keywords: matchingKeywords.filter(keyword => cleanPhrase.toLowerCase().includes(keyword.toLowerCase())),
              timestamp: matchingSpeaker?.timestamp || "N/A"
            })
          }
        }
      })
    }
  })
  
  return documentPhrases
}

// Function to create analytics collection from ALL transcripts
export const createAnalyticsFromTranscripts = async () => {
  try {
    logger.create('Creating analytics collection from ALL transcripts...')
    logger.info('Starting process at:', new Date().toISOString())
    
    // Get ALL transcript documents from the correct nested path structure
    logger.debug('Querying transcript collection for ALL documents...')
    logger.info('Looking for documents in /transcript/{docId}/timestamps/ collection...')
    
    // First, get all transcript document IDs using admin SDK
    const transcriptsRef = adminDb.collection('transcript')
    const transcriptsSnap = await transcriptsRef.get()
    logger.analytics(`Found ${transcriptsSnap.size} transcript document IDs in /transcript/ collection`)
    
    if (transcriptsSnap.size === 0) {
      logger.error('No transcript document IDs found in /transcript/ collection')
      logger.warn('Make sure you have transcript documents in the "transcript" collection')
      return { success: false, message: 'No transcript document IDs found in /transcript/ collection' }
    }
    
    // Now get all timestamp documents from all transcript IDs
    const allTimestampDocs: any[] = []
    
    for (const transcriptDoc of transcriptsSnap.docs) {
      const transcriptId = transcriptDoc.id
      logger.debug(`Fetching timestamps for transcript: ${transcriptId}`)
      
      try {
        const timestampsRef = adminDb.collection('transcript').doc(transcriptId).collection('timestamps')
        const timestampsSnap = await timestampsRef.get()
        logger.debug(`Found ${timestampsSnap.size} timestamp documents for transcript ${transcriptId}`)
        
        // Add transcript ID to each timestamp document for reference
        timestampsSnap.docs.forEach(timestampDoc => {
          const data = timestampDoc.data()
          allTimestampDocs.push({
            ...data,
            transcriptId: transcriptId,
            timestampId: timestampDoc.id,
            fullPath: `transcript/${transcriptId}/timestamps/${timestampDoc.id}`
          })
        })
      } catch (error) {
        logger.error(`Error fetching timestamps for transcript ${transcriptId}:`, error)
      }
    }
    
    logger.analytics(`Found ${allTimestampDocs.length} total timestamp documents across all transcripts`)
    
    if (allTimestampDocs.length === 0) {
      logger.error('No timestamp documents found in any transcript/timestamps collections')
      logger.warn('Make sure you have timestamp documents in the transcript/timestamps subcollections')
      return { success: false, message: 'No timestamp documents found in transcript/timestamps collections' }
    }
    
    // Process ALL documents (no limit)
    logger.process('Processing ALL timestamp documents...')
    const allTranscripts = allTimestampDocs
    logger.analytics(`Processing ALL ${allTranscripts.length} timestamp documents`)
    
    // Log first few document IDs and timestamps for debugging
    const firstFewDocs = allTranscripts.slice(0, 3).map(doc => {
      const timestamp = doc.timestamp?.toDate?.() || doc.timestamp || 'No timestamp'
      return `${doc.transcriptId}/timestamps/${doc.timestampId} (${timestamp})`
    })
    logger.debug(`First few document paths: ${firstFewDocs.join(', ')}`)
    logger.analytics(`Total timestamp documents available: ${allTimestampDocs.length}, Processing: ${allTranscripts.length}`)
    
    // Process each timestamp document and create analytics
    let processedCount = 0
    const analyticsData: { [key: string]: any } = {}
    const indexData: { [key: string]: any } = {}
    
    logger.process('Starting to process individual timestamp documents...')
    
    for (const timestampDoc of allTranscripts) {
      try {
        const transcriptData = timestampDoc
        const transcriptId = timestampDoc.transcriptId
        const timestampId = timestampDoc.timestampId
        const fullPath = timestampDoc.fullPath
        
        logger.debug(`Raw document data for ${fullPath}:`, transcriptData)
        
        logger.process(`Processing timestamp document ${processedCount + 1}/${allTranscripts.length}: ${fullPath}`)
        logger.info(`Transcript name: ${transcriptData.name || 'Untitled'}`)
        logger.user(`User email: ${transcriptData.userEmail || 'No email'}`)
        logger.info(`Audio URL: ${transcriptData.audioURL ? 'Present' : 'Missing'}`)
        logger.debug(`Document structure:`, Object.keys(transcriptData))
        logger.info(`Transcript text length: ${(transcriptData.transcript || '').length} characters`)
        
        // Analyze the transcript text (using the correct field name)
        const transcriptText = transcriptData.transcript || ''
        // Try different field names for speaker transcript - the field in Firestore is "speaker transcript" with space
        const speakerTranscript = transcriptData['speaker transcript'] || transcriptData.speakerTranscript || []
        logger.debug(`Analyzing transcript text: "${transcriptText.substring(0, 100)}${transcriptText.length > 100 ? '...' : ''}"`)
        logger.debug(`Speaker transcript field found: ${speakerTranscript.length} entries`)
        const documentPhrases = analyzeTranscriptText(transcriptText, speakerTranscript)
        logger.analytics(`Found ${documentPhrases.length} phrases in transcript`)
        
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

        // Create analytics document
        const analyticsDocument = {
          documentId: `${transcriptId}_${timestampId}`, // Use combined ID for analytics
          originalTranscriptId: transcriptId,
          originalTimestampId: timestampId,
          fullPath: fullPath,
          transcriptName: transcriptData.name || 'Untitled',
          transcript: transcriptText, // Add the full transcript text
          userEmail: transcriptId, // Use transcriptId as userEmail
          timestamp: transcriptData.timestamp,
          audioURL: transcriptData.audioURL || '',
          durationSeconds: transcriptData.durationSeconds || 0,
          emoji: transcriptData.emoji || '📝',
          notes: transcriptData.notes || '',
          status: transcriptData.status || 'complete',
          speakerTranscript: speakerTranscript, // Add speaker transcript field (mapped from 'speaker transcript')
          totalPhrases: documentPhrases.length,
          phrasesByCategory: documentPhrases.reduce((acc, phrase) => {
            if (!acc[phrase.category]) {
              acc[phrase.category] = []
            }
            acc[phrase.category].push({
              phrase: phrase.phrase,
              keywords: phrase.keywords,
              timestamp: phrase.timestamp
            })
            return acc
          }, {} as { [key: string]: { phrase: string; keywords: string[]; timestamp: string }[] }),
          analysisTimestamp: new Date().toISOString(),
          // User data fields
          createdAt: userData?.createdAt || new Date(),
          createdAtLocation: userData?.createdAtLocation || 'Unknown',
          deviceId: userData?.deviceId || transcriptId,
          encryptedUserData: userData?.encryptedUserData || {},
          isActive: userData?.isActive || true,
          lastUpdated: userData?.lastUpdated || new Date(),
          totalRecordings: userData?.totalRecordings || 0
        }
        
        // Save analytics document using admin SDK
        const analyticsDocId = `${transcriptId}_${timestampId}`
        logger.save(`Saving analytics document to Firestore: analytics/${analyticsDocId}`)
        try {
          const analyticsRef = adminDb.collection('analytics').doc(analyticsDocId)
          await analyticsRef.set(analyticsDocument)
          logger.success(`Successfully saved analytics document: analytics/${analyticsDocId}`)
        } catch (saveError) {
          logger.error(`FAILED to save analytics document analytics/${analyticsDocId}:`, saveError)
          throw saveError
        }
        
        // Add to index
        indexData[analyticsDocId] = true
        analyticsData[analyticsDocId] = analyticsDocument
        
        processedCount++
        logger.success(`Processed timestamp document ${timestampDoc.fullPath} with ${documentPhrases.length} phrases`)
        
      } catch (error) {
        logger.error(`Error processing timestamp document ${timestampDoc.fullPath}:`, error)
        logger.error(`Error details:`, error)
      }
    }
    
    // Create analytics index document using admin SDK
    logger.info('Creating analytics index document...')
    logger.debug('Index data to save:', indexData)
    logger.analytics(`Index contains ${Object.keys(indexData).length} document references`)
    
    const analyticsIndexRef = adminDb.collection('analytics').doc('document_analyses')
    logger.save('Saving analytics index to Firestore: analytics/document_analyses')
    try {
      await analyticsIndexRef.set(indexData)
      logger.success('Successfully saved analytics index document')
    } catch (indexError) {
      logger.error('FAILED to save analytics index document:', indexError)
      throw indexError
    }
    
    logger.success(`Successfully created analytics for ${processedCount} most recent transcripts`)
    logger.analytics(`Analytics index created with ${Object.keys(indexData).length} document references`)
    logger.info(`Process completed at: ${new Date().toISOString()}`)
    
    return { 
      success: true, 
      processedCount, 
      analyticsData,
      message: `Created analytics for ${processedCount} most recent transcripts`
    }
    
  } catch (error) {
    logger.error('Error creating analytics from transcripts:', error)
    return { success: false, message: 'Failed to create analytics', error }
  }
}

// Function to update analytics documents with audioURL and speakerTranscript from transcript collection
export const updateAnalyticsWithAudioURL = async () => {
  try {
    logger.process('Starting analytics audioURL and speakerTranscript update process...')
    
    // Get all transcript documents from the nested structure using admin SDK
    const transcriptsRef = adminDb.collection('transcript')
    const transcriptsSnap = await transcriptsRef.get()
    
    logger.analytics(`Found ${transcriptsSnap.size} transcript document IDs`)
    
    // Create a map of document path to audioURL and speakerTranscript
    const dataMap: { [key: string]: { audioURL?: string; speakerTranscript?: any[] } } = {}
    
    for (const transcriptDoc of transcriptsSnap.docs) {
      const transcriptId = transcriptDoc.id
      try {
        const timestampsRef = adminDb.collection('transcript').doc(transcriptId).collection('timestamps')
        const timestampsSnap = await timestampsRef.get()
        
        timestampsSnap.docs.forEach(timestampDoc => {
          const data = timestampDoc.data()
          const fullPath = `transcript/${transcriptId}/timestamps/${timestampDoc.id}`
          dataMap[fullPath] = {
            audioURL: data.audioURL || undefined,
            speakerTranscript: data['speaker transcript'] || data.speakerTranscript || []
          }
        })
      } catch (error) {
        logger.error(`Error fetching timestamps for transcript ${transcriptId}:`, error)
      }
    }
    
    logger.analytics(`Found ${Object.keys(dataMap).length} timestamp documents to update analytics from`)
    
    // Get the analytics index using admin SDK
    const analyticsIndexRef = adminDb.collection('analytics').doc('document_analyses')
    const analyticsIndexSnap = await analyticsIndexRef.get()
    
    if (!analyticsIndexSnap.exists) {
      logger.error('No analytics index found')
      return
    }
    
    const analyticsIndex = analyticsIndexSnap.data() || {}
    const documentIds = Object.keys(analyticsIndex)
    
    logger.analytics(`Found ${documentIds.length} analytics documents to update`)
    
    // Update each analytics document with audioURL and speakerTranscript if available
    let updatedCount = 0
    for (const documentId of documentIds) {
      try {
        const analyticsRef = adminDb.collection('analytics').doc(documentId)
        const analyticsSnap = await analyticsRef.get()
        
        if (analyticsSnap.exists) {
          const analyticsData = analyticsSnap.data()
          
          if (analyticsData) {
            const fullPath = analyticsData.fullPath
            const updateData: any = {}
            let needsUpdate = false
            
            // Check if we have data for this path
            if (fullPath && dataMap[fullPath]) {
              const transcriptData = dataMap[fullPath]
              
              // Update audioURL if missing
              if (!analyticsData.audioURL && transcriptData.audioURL) {
                updateData.audioURL = transcriptData.audioURL
                needsUpdate = true
              }
              
              // Update speakerTranscript if missing or empty
              if (!analyticsData.speakerTranscript || analyticsData.speakerTranscript.length === 0) {
                if (transcriptData.speakerTranscript && transcriptData.speakerTranscript.length > 0) {
                  updateData.speakerTranscript = transcriptData.speakerTranscript
                  needsUpdate = true
                }
              }
              
              // Perform update if needed
              if (needsUpdate) {
                logger.process(`Updating analytics document ${documentId} with missing fields`)
                await analyticsRef.update(updateData)
                updatedCount++
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Error updating analytics document ${documentId}:`, error)
      }
    }
    
    logger.success(`Successfully updated ${updatedCount} analytics documents with missing fields`)
    
  } catch (error) {
    logger.error('Error in updateAnalyticsWithAudioURL:', error)
  }
}

// Function to process a single transcript and create analytics entry
export const processNewTranscriptForAnalytics = async (transcriptId: string, timestampId: string) => {
  try {
    logger.process(`Processing new transcript ${transcriptId}/${timestampId} for analytics...`)
    
    // Get the timestamp document from the nested structure
    const timestampRef = adminDb.collection('transcript').doc(transcriptId).collection('timestamps').doc(timestampId)
    const timestampSnap = await timestampRef.get()
    
    if (!timestampSnap.exists) {
      logger.error(`Timestamp document ${transcriptId}/${timestampId} not found`)
      return { success: false, message: 'Timestamp document not found' }
    }
    
    const timestampData = timestampSnap.data()
    logger.debug(`Processing timestamp data:`, timestampData)
    
    // Analyze the transcript text
    const transcriptText = timestampData.transcript || ''
    // Try different field names for speaker transcript - the field in Firestore is "speaker transcript" with space
    const speakerTranscript = timestampData['speaker transcript'] || timestampData.speakerTranscript || []
    logger.debug(`Speaker transcript field found: ${speakerTranscript.length} entries`)
    const documentPhrases = analyzeTranscriptText(transcriptText, speakerTranscript)
    logger.analytics(`Found ${documentPhrases.length} phrases in new transcript`)
    
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

    // Create analytics document
    const analyticsDocument = {
      documentId: `${transcriptId}_${timestampId}`,
      originalTranscriptId: transcriptId,
      originalTimestampId: timestampId,
      fullPath: `transcript/${transcriptId}/timestamps/${timestampId}`,
      transcriptName: timestampData.name || 'Untitled',
      transcript: transcriptText, // Add the full transcript text
      userEmail: transcriptId,
      timestamp: timestampData.timestamp,
      audioURL: timestampData.audioURL || '',
      durationSeconds: timestampData.durationSeconds || 0,
      emoji: timestampData.emoji || '📝',
      notes: timestampData.notes || '',
      status: timestampData.status || 'complete',
      speakerTranscript: speakerTranscript,
      totalPhrases: documentPhrases.length,
      phrasesByCategory: documentPhrases.reduce((acc, phrase) => {
        if (!acc[phrase.category]) {
          acc[phrase.category] = []
        }
        acc[phrase.category].push({
          phrase: phrase.phrase,
          keywords: phrase.keywords,
          timestamp: phrase.timestamp
        })
        return acc
      }, {} as { [key: string]: { phrase: string; keywords: string[]; timestamp: string }[] }),
      analysisTimestamp: new Date().toISOString(),
      // User data fields
      createdAt: userData?.createdAt || new Date(),
      createdAtLocation: userData?.createdAtLocation || 'Unknown',
      deviceId: userData?.deviceId || transcriptId,
      encryptedUserData: userData?.encryptedUserData || {},
      isActive: userData?.isActive || true,
      lastUpdated: userData?.lastUpdated || new Date(),
      totalRecordings: userData?.totalRecordings || 0
    }
    
    // Save analytics document
    const analyticsDocId = `${transcriptId}_${timestampId}`
    logger.save(`Saving new analytics document: analytics/${analyticsDocId}`)
    
    try {
      const analyticsRef = adminDb.collection('analytics').doc(analyticsDocId)
      await analyticsRef.set(analyticsDocument)
      logger.success(`Successfully created analytics for new transcript: ${analyticsDocId}`)
      
      // Update analytics index
      const analyticsIndexRef = adminDb.collection('analytics').doc('document_analyses')
      const analyticsIndexSnap = await analyticsIndexRef.get()
      
      let indexData = {}
      if (analyticsIndexSnap.exists) {
        indexData = analyticsIndexSnap.data() || {}
      }
      
      indexData[analyticsDocId] = true
      await analyticsIndexRef.set(indexData, { merge: true })
      logger.success(`Updated analytics index with new document: ${analyticsDocId}`)
      
      return { 
        success: true, 
        analyticsDocument,
        message: `Successfully created analytics for new transcript ${transcriptId}/${timestampId}`
      }
      
    } catch (saveError) {
      logger.error(`Failed to save analytics document ${analyticsDocId}:`, saveError)
      return { success: false, message: 'Failed to save analytics document', error: saveError }
    }
    
  } catch (error) {
    logger.error(`Error processing new transcript ${transcriptId}/${timestampId}:`, error)
    return { success: false, message: 'Error processing new transcript', error }
  }
}

// Function to check for new transcripts and sync them to analytics with retry logic
export const syncNewTranscriptsToAnalytics = async (maxRetries: number = 3) => {
  try {
    logger.process('Checking for new transcripts to sync to analytics...')
    
    // Get existing analytics documents
    const analyticsRef = adminDb.collection('analytics')
    const analyticsSnap = await analyticsRef.get()
    
    const existingAnalytics = new Set<string>()
    analyticsSnap.docs.forEach(doc => {
      if (doc.id !== 'document_analyses') {
        existingAnalytics.add(doc.id)
      }
    })
    
    logger.analytics(`Found ${existingAnalytics.size} existing analytics documents`)
    
    // Get all transcript documents
    const transcriptsRef = adminDb.collection('transcript')
    const transcriptsSnap = await transcriptsRef.get()
    
    const newTranscripts: { transcriptId: string; timestampId: string }[] = []
    
    // Check each transcript for new timestamp documents
    for (const transcriptDoc of transcriptsSnap.docs) {
      const transcriptId = transcriptDoc.id
      
      try {
        const timestampsRef = adminDb.collection('transcript').doc(transcriptId).collection('timestamps')
        const timestampsSnap = await timestampsRef.get()
        
        timestampsSnap.docs.forEach(timestampDoc => {
          const expectedAnalyticsId = `${transcriptId}_${timestampDoc.id}`
          if (!existingAnalytics.has(expectedAnalyticsId)) {
            newTranscripts.push({
              transcriptId: transcriptId,
              timestampId: timestampDoc.id
            })
          }
        })
      } catch (error) {
        logger.error(`Error checking timestamps for transcript ${transcriptId}:`, error)
      }
    }
    
    logger.analytics(`Found ${newTranscripts.length} new transcripts to process`)
    
    if (newTranscripts.length === 0) {
      return { success: true, processedCount: 0, message: 'No new transcripts to sync' }
    }
    
    // Process new transcripts with retry logic
    let successCount = 0
    let errorCount = 0
    const failedTranscripts: { transcriptId: string; timestampId: string; error: string }[] = []
    
    for (const { transcriptId, timestampId } of newTranscripts) {
      let lastError = null
      let success = false
      
      // Retry logic for individual transcript processing
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            logger.info(`Retry attempt ${attempt}/${maxRetries} for ${transcriptId}/${timestampId}`)
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
          }
          
          const result = await processNewTranscriptForAnalytics(transcriptId, timestampId)
          if (result.success) {
            successCount++
            success = true
            break
          } else {
            lastError = result.message
            logger.warn(`Attempt ${attempt} failed for ${transcriptId}/${timestampId}: ${result.message}`)
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          logger.warn(`Attempt ${attempt} failed for ${transcriptId}/${timestampId}: ${lastError}`)
        }
      }
      
      if (!success) {
        errorCount++
        failedTranscripts.push({
          transcriptId,
          timestampId,
          error: lastError || 'Unknown error'
        })
        logger.error(`All ${maxRetries} attempts failed for ${transcriptId}/${timestampId}: ${lastError}`)
      }
    }
    
    logger.success(`Sync completed: ${successCount} successful, ${errorCount} failed`)
    
    // Log failed transcripts for debugging
    if (failedTranscripts.length > 0) {
      logger.error(`Failed transcripts summary:`)
      failedTranscripts.forEach(({ transcriptId, timestampId, error }) => {
        logger.error(`  - ${transcriptId}/${timestampId}: ${error}`)
      })
    }
    
    return {
      success: errorCount === 0, // Only success if no errors
      processedCount: successCount,
      errorCount: errorCount,
      totalFound: newTranscripts.length,
      failedTranscripts: failedTranscripts,
      message: errorCount === 0 
        ? `Successfully synced ${successCount} new transcripts to analytics`
        : `Synced ${successCount} transcripts, ${errorCount} failed`
    }
    
  } catch (error) {
    logger.error('Error syncing new transcripts to analytics:', error)
    return { 
      success: false, 
      processedCount: 0,
      errorCount: 0,
      totalFound: 0,
      message: 'Error syncing new transcripts', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 