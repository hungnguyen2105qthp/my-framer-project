import { processConversations, generateDashboardMetrics } from './conversation-analyzer';
import { db } from './firebase-admin';

// Configuration for batch processing
interface BatchProcessingConfig {
  chains: Array<{
    chainId: string;
    locations: string[];
  }>;
  options: {
    saveResults: boolean;
    includeEmbeddings: boolean;
    maxConcurrent: number;
    delayBetweenProcessing: number; // ms
  };
}

// Default configuration
const DEFAULT_CONFIG: BatchProcessingConfig = {
  chains: [
    {
      chainId: "Revive",
      locations: ["Carmel Valley"] // Add more locations as needed
    }
  ],
  options: {
    saveResults: true,
    includeEmbeddings: false, // Embeddings are large, usually don't need to store
    maxConcurrent: 3, // Process max 3 locations at once to avoid rate limits
    delayBetweenProcessing: 2000 // 2 second delay between batches
  }
};

interface ProcessingResult {
  chainId: string;
  locationId: string;
  success: boolean;
  summary?: any;
  metricsCount?: number;
  sentenceCount?: number;
  error?: string;
  processingTime?: number;
}

/**
 * Process multiple locations in batches
 */
export async function batchProcessConversations(
  config: BatchProcessingConfig = DEFAULT_CONFIG
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  
  //console.log('Starting batch processing with config:', config);
  
  for (const chain of config.chains) {
    //console.log(`Processing chain: ${chain.chainId}`);
    
    // Process locations in batches to respect rate limits
    const batches = chunkArray(chain.locations, config.options.maxConcurrent);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (locationId) => {
        const startTime = Date.now();
        
        try {
          //console.log(`Processing all conversations across all chains/locations...`);
          
          const { processedSentences, summary } = await processConversations(
            chain.chainId,
            locationId  // Parameters ignored in new implementation
          );
          
          const dashboardMetrics = generateDashboardMetrics(processedSentences);
          
          // Optionally save results - save to "All" since we're processing all locations
          if (config.options.saveResults) {
            await saveProcessingResults(
              "All-Chains",
              "All-Locations", 
              { processedSentences, summary, dashboardMetrics },
              config.options.includeEmbeddings
            );
          }
          
          const processingTime = Date.now() - startTime;
          
          const result: ProcessingResult = {
            chainId: "All-Chains",
            locationId: "All-Locations", 
            success: true,
            summary,
            metricsCount: dashboardMetrics.length,
            sentenceCount: processedSentences.length,
            processingTime
          };
          
          //console.log(`✅ Completed processing all conversations in ${processingTime}ms`);
          return result;
          
        } catch (error: any) {
          const processingTime = Date.now() - startTime;
          console.error(`❌ Failed ${chain.chainId}/${locationId}:`, error.message);
          
          return {
            chainId: "All-Chains",
            locationId: "All-Locations",
            success: false,
            error: error.message,
            processingTime
          };
        }
      });
      
      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay before next batch to respect rate limits
      if (config.options.delayBetweenProcessing > 0) {
        await sleep(config.options.delayBetweenProcessing);
      }
    }
  }
  
  // Generate summary report
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  //console.log('\n🔍 Batch Processing Summary:');
  //console.log(`✅ Successful: ${successful.length}`);
  //console.log(`❌ Failed: ${failed.length}`);
  //console.log(`📊 Total sentences processed: ${successful.reduce((sum, r) => sum + (r.sentenceCount || 0), 0)}`);
  //console.log(`📈 Total metrics generated: ${successful.reduce((sum, r) => sum + (r.metricsCount || 0), 0)}`);
  
  if (failed.length > 0) {
    //console.log('\n❌ Failed locations:');
    failed.forEach(r => {
      //console.log(`  - ${r.chainId}/${r.locationId}: ${r.error}`);
    });
  }
  
  return results;
}

/**
 * Save processing results to Firebase
 */
async function saveProcessingResults(
  chainId: string,
  locationId: string,
  data: {
    processedSentences: any[];
    summary: any;
    dashboardMetrics: any[];
  },
  includeEmbeddings: boolean = false
) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  //console.log(`\n💾 [SAVE] Starting to save results for ${chainId}/${locationId}`);
  //console.log(`📊 [SAVE] Data to save: ${data.processedSentences.length} sentences, ${data.dashboardMetrics.length} metrics`);
  
  try {
    const resultsRef = db.collection('conversationAnalysis')
      .doc(chainId)
      .collection(locationId);
    
    //console.log(`📁 [SAVE] Firebase path: conversationAnalysis/${chainId}/${locationId}`);
    
    // Save summary
    //console.log(`📋 [SAVE] Saving summary document...`);
    await resultsRef.doc('summary').set({
      ...data.summary,
      processedAt: new Date(),
      version: '1.0'
    });
    //console.log(`✅ [SAVE] Summary saved successfully`);
    
    // Save dashboard metrics
    //console.log(`📈 [SAVE] Saving dashboard metrics (${data.dashboardMetrics.length} items)...`);
    await resultsRef.doc('dashboardMetrics').set({
      metrics: data.dashboardMetrics,
      processedAt: new Date(),
      count: data.dashboardMetrics.length
    });
    //console.log(`✅ [SAVE] Dashboard metrics saved successfully`);
    
    // Save processed sentences (in batches due to size limits)
    const sentenceBatches = chunkArray(data.processedSentences, 500);
    ////console.log(`📦 [SAVE] Saving ${data.processedSentences.length} sentences in ${sentenceBatches.length} batches...`);
    
    for (let i = 0; i < sentenceBatches.length; i++) {
      const batchData = sentenceBatches[i].map(sentence => {
        const cleanSentence = { ...sentence };
        
        // Remove undefined embeddings to prevent Firestore errors
        if (!includeEmbeddings || !cleanSentence.embedding) {
          delete cleanSentence.embedding;
        }
        
        // Ensure all values are Firestore-compatible
        Object.keys(cleanSentence).forEach(key => {
          if (cleanSentence[key] === undefined) {
            delete cleanSentence[key];
          }
        });
        
        return cleanSentence;
      });
      
      ////console.log(`💼 [SAVE] Saving batch ${i + 1}/${sentenceBatches.length} (${batchData.length} sentences)...`);
      
      await resultsRef.doc(`sentences_batch_${i}`).set({
        sentences: batchData,
        batchIndex: i,
        processedAt: new Date()
      });
      
      ////console.log(`✅ [SAVE] Batch ${i + 1} saved successfully`);
    }
    
    ////console.log(`🎉 [SAVE] All results saved successfully for ${chainId}/${locationId}!`);
    
  } catch (error) {
    console.error(`Failed to save results for ${chainId}/${locationId}:`, error);
    throw error;
  }
}

/**
 * Load previously processed results
 */
export async function loadProcessingResults(chainId: string, locationId: string) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const resultsRef = db.collection('conversationAnalysis')
      .doc(chainId)
      .collection(locationId);
    
    // Load summary
    const summaryDoc = await resultsRef.doc('summary').get();
    const summary = summaryDoc.exists ? summaryDoc.data() : null;
    
    // Load dashboard metrics
    const metricsDoc = await resultsRef.doc('dashboardMetrics').get();
    const dashboardMetrics = metricsDoc.exists ? metricsDoc.data()?.metrics || [] : [];
    
    // Load sentence batches
    const sentenceQuery = await resultsRef.where('batchIndex', '>=', 0).get();
    const processedSentences: any[] = [];
    
    sentenceQuery.docs
      .sort((a, b) => (a.data().batchIndex || 0) - (b.data().batchIndex || 0))
      .forEach(doc => {
        const sentences = doc.data().sentences || [];
        processedSentences.push(...sentences);
      });
    
    return {
      summary,
      dashboardMetrics,
      processedSentences,
      loadedAt: new Date()
    };
    
  } catch (error) {
    console.error(`Failed to load results for ${chainId}/${locationId}:`, error);
    throw error;
  }
}

/**
 * Get processing status for multiple locations
 */
export async function getProcessingStatus(chains: Array<{chainId: string, locations: string[]}>) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  const statusResults = [];
  
  for (const chain of chains) {
    for (const locationId of chain.locations) {
      try {
        const resultsRef = db.collection('conversationAnalysis')
          .doc(chain.chainId)
          .collection(locationId);
        
        const summaryDoc = await resultsRef.doc('summary').get();
        
        statusResults.push({
          chainId: chain.chainId,
          locationId,
          processed: summaryDoc.exists,
          processedAt: summaryDoc.exists ? summaryDoc.data()?.processedAt?.toDate() : null,
          version: summaryDoc.exists ? summaryDoc.data()?.version : null
        });
        
      } catch (error) {
        statusResults.push({
          chainId: chain.chainId,
          locationId,
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
  
  return statusResults;
}

// Utility functions
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export configuration for easy modification
export { DEFAULT_CONFIG, type BatchProcessingConfig, type ProcessingResult };