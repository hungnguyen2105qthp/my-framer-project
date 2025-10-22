import { db } from './firebase-admin';

/**
 * Integration layer between conversation analytics and existing analytics collection
 */

// Your existing analytics structure
interface ExistingAnalytics {
  analysisTimestamp: string;
  audioURL: string;
  createdAt: any; // Firebase timestamp
  createdAtLocation: string;
  deviceId: string;
  documentId: string;
  durationSeconds: number;
  emoji: string;
  encryptedUserData: any;
  fullPath: string;
  isActive: boolean;
  lastUpdated: any; // Firebase timestamp
  notes: string;
  originalTimestampId: string;
  originalTranscriptId: string;
  phrasesByCategory: any;
  speakerTranscript: Array<{
    confidence: number;
    speaker: string;
    text: string;
    timestamp: string;
  }>;
  words: Array<{
    confidence: number;
    end: number;
    speaker: string;
    start: number;
    text: string;
  }>;
  status: string;
  timestamp: any; // Firebase timestamp
  totalPhrases: number;
  totalRecordings: number;
  transcript: string;
  transcriptName: string;
  userEmail: string;
}

// Enhanced analytics structure (combines existing + conversation analysis)
interface EnhancedAnalytics extends ExistingAnalytics {
  conversationAnalysis?: {
    stageClassification: Array<{
      stage: string;
      confidence: string;
      turnIndex: number;
    }>;
    sentenceSegmentation: Array<{
      sentence: string;
      stage: string;
      speaker: string;
      cluster_label?: number;
    }>;
    clusterMetrics: Array<{
      stage: string;
      cluster_label: number;
      count: number;
      percentage: number;
    }>;
    summary: {
      totalSentences: number;
      stagesFound: string[];
      clustersGenerated: number;
      analysisVersion: string;
      processedAt: string;
    };
  };
}

/**
 * Enhanced storage function that integrates with existing analytics collection
 */
export async function saveEnhancedAnalytics(
  documentId: string,
  existingData: ExistingAnalytics,
  conversationAnalysisResults: {
    processedSentences: any[];
    summary: any;
    dashboardMetrics: any[];
  }
): Promise<void> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  //console.log(`\n🔗 [INTEGRATION] Enhancing existing analytics for document: ${documentId}`);
  
  try {
    // Your existing path: /analytics/{documentId}
    const analyticsRef = db.collection('analytics').doc(documentId);
    
    // Prepare conversation analysis data to integrate
    const stageClassification = conversationAnalysisResults.processedSentences.map((sentence, index) => ({
      stage: sentence.stage,
      confidence: 'high', // From OpenAI classification
      turnIndex: index,
      sentence: sentence.sentence
    }));

    const clusterMetrics = conversationAnalysisResults.dashboardMetrics.map(metric => ({
      stage: metric.stage,
      cluster_label: metric.cluster_label,
      count: metric.count,
      percentage: metric.percentage
    }));

    // Enhanced analytics object
    const enhancedAnalytics: EnhancedAnalytics = {
      ...existingData,
      conversationAnalysis: {
        stageClassification,
        sentenceSegmentation: conversationAnalysisResults.processedSentences.map(sentence => ({
          sentence: sentence.sentence,
          stage: sentence.stage,
          speaker: sentence.speaker,
          cluster_label: sentence.cluster_label
        })),
        clusterMetrics,
        summary: {
          totalSentences: conversationAnalysisResults.processedSentences.length,
          stagesFound: [...new Set(conversationAnalysisResults.processedSentences.map(s => s.stage))],
          clustersGenerated: new Set(conversationAnalysisResults.processedSentences.map(s => s.cluster_label)).size,
          analysisVersion: '1.0',
          processedAt: new Date().toISOString()
        }
      }
    };

    // Update the existing analytics document with enhanced data
    await analyticsRef.update({
      conversationAnalysis: enhancedAnalytics.conversationAnalysis,
      lastUpdated: new Date()
    });

    //console.log(`✅ [INTEGRATION] Enhanced analytics saved to /analytics/${documentId}`);
    
    // Also keep separate detailed storage in conversationAnalysis collection
    await saveDetailedAnalysis(documentId, conversationAnalysisResults);
    
  } catch (error) {
    console.error(`❌ [INTEGRATION] Failed to save enhanced analytics:`, error);
    throw error;
  }
}

/**
 * Save detailed analysis in separate collection for complex queries
 */
async function saveDetailedAnalysis(
  documentId: string,
  results: {
    processedSentences: any[];
    summary: any;
    dashboardMetrics: any[];
  }
): Promise<void> {
  
  //console.log(`📊 [DETAILED] Saving detailed analysis for ${documentId}`);
  
  const detailedRef = db.collection('conversationAnalysisDetailed').doc(documentId);
  
  await detailedRef.set({
    processedSentences: results.processedSentences,
    summary: results.summary,
    dashboardMetrics: results.dashboardMetrics,
    processedAt: new Date(),
    version: '1.0'
  });
  
  //console.log(`✅ [DETAILED] Detailed analysis saved to /conversationAnalysisDetailed/${documentId}`);
}

/**
 * Process and enhance existing analytics documents
 */
export async function processExistingAnalytics(documentId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  ////console.log(`\n🔄 [ENHANCE] Processing existing analytics document: ${documentId}`);
  
  try {
    // Load existing analytics data
    const analyticsDoc = await db.collection('analytics').doc(documentId).get();
    
    if (!analyticsDoc.exists) {
      ////console.log(`⚠️ [ENHANCE] Document ${documentId} not found in analytics collection`);
      return;
    }

    const existingData = analyticsDoc.data() as ExistingAnalytics;
    
    ////console.log(`📋 [ENHANCE] Found existing document with transcript: "${existingData.transcript?.substring(0, 50)}..."`);
    


    // Check if we have valid speaker transcript data
    if (!existingData.speakerTranscript || existingData.speakerTranscript.length === 0) {
      //////console.log(`⚠️ [ENHANCE] Document ${documentId} has no speaker transcript data`);
      return;
    }

    ////console.log(`🔍 [ENHANCE] Processing ${existingData.speakerTranscript.length} speaker turns`);

    // Use the existing conversation analyzer but adapt the data format
    const { processConversations } = await import('./conversation-analyzer');
    
    // We need to adapt this since processConversations expects location-based data
    // For now, we'll process individual documents differently
    
    ////console.log(`✅ [ENHANCE] Enhanced analytics processing complete for ${documentId}`);
    
  } catch (error) {
    console.error(`❌ [ENHANCE] Error processing existing analytics:`, error);
    throw error;
  }
}

/**
 * Query enhanced analytics with conversation insights
 */
export async function queryEnhancedAnalytics(filters: {
  stage?: string;
  cluster?: number;
  dateRange?: { start: Date; end: Date };
  location?: string;
}): Promise<EnhancedAnalytics[]> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  ////console.log(`🔍 [QUERY] Querying enhanced analytics with filters:`, filters);
  
  try {
    let query = db.collection('analytics');
    
    // Add filters as needed
    if (filters.dateRange) {
      query = query.where('createdAt', '>=', filters.dateRange.start)
                  .where('createdAt', '<=', filters.dateRange.end);
    }
    
    const snapshot = await query.get();
    const results: EnhancedAnalytics[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as EnhancedAnalytics;
      
      // Apply additional filters
      if (filters.stage && data.conversationAnalysis) {
        const hasStage = data.conversationAnalysis.stageClassification.some(
          classification => classification.stage === filters.stage
        );
        if (!hasStage) return;
      }
      
      if (filters.cluster !== undefined && data.conversationAnalysis) {
        const hasCluster = data.conversationAnalysis.clusterMetrics.some(
          metric => metric.cluster_label === filters.cluster
        );
        if (!hasCluster) return;
      }
      
      results.push(data);
    });
    
    //console.log(`✅ [QUERY] Found ${results.length} matching enhanced analytics documents`);
    return results;
    
  } catch (error) {
    console.error(`❌ [QUERY] Error querying enhanced analytics:`, error);
    throw error;
  }
}

export { type EnhancedAnalytics, type ExistingAnalytics };