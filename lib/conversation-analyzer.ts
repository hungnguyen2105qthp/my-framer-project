import { db } from './firebase-admin';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Target stages for classification
const TARGET_STAGES = [
  "Patient Interview & History",
  "Aesthetic Goals Discovery", 
  "Treatment Education & Knowledge",
  "Previous Experience Review",
  "Facial Assessment & Analysis",
  "Treatment Planning & Options",
  "Objection Handling & Concerns",
  "Closing & Treatment Commitment"
];

// Types for our data structures
interface TranscriptTurn {
  speaker: string;
  text: string;
}

interface ProcessedTurn {
  rep_id: string;
  speaker: string;
  stage: string;
  text: string;
  confidence?: string;
}

interface ProcessedSentence {
  rep_id: string;
  speaker: string;
  stage: string;
  sentence: string;
  embedding?: number[];
  cluster_label?: string | number;
}

interface LocationData {
  documentId: string;
  transcript: string;
  speakerTranscript: TranscriptTurn[];
  timestamp: string;
}

/**
 * Stage classification using OpenAI
 */
async function classifyStage(turnText: string): Promise<{ stage: string; confidence: string }> {
  ////console.log(`🔍 [STAGE-CLASSIFY] Classifying turn: "${turnText.substring(0, 50)}..."`);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // Use gpt-4o which supports json_object
      messages: [
        {
          role: "system",  
          content: `You are a system that classifies conversation turns into exactly one of these stages: ${TARGET_STAGES.join(", ")}. 
          
          Respond with a JSON object containing:
          - "stage": the exact stage name from the list
          - "confidence": "high", "medium", or "low"
          
          If the turn doesn't clearly fit any stage, use the closest match with "low" confidence.`
        },
        {
          role: "user",
          content: `Turn: "${turnText}"\n\nClassify this turn:`
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"stage": "Unknown", "confidence": "low"}');
    ////console.log(`✅ [STAGE-CLASSIFY] Result: ${result.stage} (${result.confidence})`);
    
    return {
      stage: result.stage,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('❌ [STAGE-CLASSIFY] Error classifying stage:', error);
    return { stage: "Unknown", confidence: "low" };
  }
}

/**
 * Batch classify multiple turns for efficiency
 */
async function batchClassifyStages(turns: Array<{text: string, index: number}>): Promise<Array<{stage: string, confidence: string}>> {
  const BATCH_SIZE = 10;
  const results: Array<{stage: string, confidence: string}> = [];
  
  ////console.log(`🔄 [BATCH-CLASSIFY] Processing ${turns.length} turns in batches of ${BATCH_SIZE}`);
  
  for (let i = 0; i < turns.length; i += BATCH_SIZE) {
    const batch = turns.slice(i, i + BATCH_SIZE);
    
    ////console.log(`📦 [BATCH-CLASSIFY] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(turns.length/BATCH_SIZE)} (${batch.length} turns)`);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",  // Use gpt-4o which supports json_object
        messages: [
          {
            role: "system",
            content: `You are a system that classifies conversation turns into exactly one of these stages: ${TARGET_STAGES.join(", ")}. 
            
            Respond with a JSON object containing a "results" array where each object contains:
            - "stage": the exact stage name from the list
            - "confidence": "high", "medium", or "low"
            
            Process the turns in order and return results in the same order.`
          },
          {
            role: "user", 
            content: `Classify these turns:\n${batch.map((turn, idx) => `${idx + 1}. "${turn.text}"`).join('\n')}`
          }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      });

      const batchResults = JSON.parse(response.choices[0].message.content || '{"results": []}');
      if (batchResults.results && Array.isArray(batchResults.results)) {
        ////console.log(`✅ [BATCH-CLASSIFY] Batch ${Math.floor(i/BATCH_SIZE) + 1} completed successfully`);
        results.push(...batchResults.results);
      } else {
        ////console.log(`⚠️ [BATCH-CLASSIFY] Batch format issue, falling back to individual processing`);
        // Fallback: classify individually if batch fails
        for (const turn of batch) {
          const result = await classifyStage(turn.text);
          results.push(result);
        }
      }
    } catch (error) {
      console.error(`❌ [BATCH-CLASSIFY] Batch ${Math.floor(i/BATCH_SIZE) + 1} failed, falling back to individual:`, error);
      // Fallback: classify each turn individually
      for (const turn of batch) {
        const result = await classifyStage(turn.text);
        results.push(result);
      }
    }
  }
  
  return results;
}

/**
 * Simple sentence segmentation using basic punctuation rules
 * (Alternative to SpaCy for JavaScript environment)
 */
function segmentSentences(text: string): string[] {
  // Clean and normalize text
  const cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Split on sentence-ending punctuation followed by space and capital letter or quote
  const sentences = cleaned.split(/[.!?]+\s+(?=[A-Z"'])/);
  
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 5) // Filter out very short fragments
    .map(s => {
      // Add back the punctuation if it's missing
      if (!/[.!?]$/.test(s)) {
        s += '.';
      }
      return s;
    });
}

/**
 * Get embeddings from OpenAI
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 500;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch
      });
      
      embeddings.push(...response.data.map(item => item.embedding));
    } catch (error) {
      console.error('Error getting embeddings:', error);
      // Return zero embeddings as fallback
      embeddings.push(...batch.map(() => new Array(1536).fill(0)));
    }
  }
  
  return embeddings;
}

/**
 * Simple clustering using cosine similarity
 * (Alternative to HDBSCAN for JavaScript environment)
 */
function simpleClustering(embeddings: number[][], minClusterSize: number = 5): number[] {
  if (embeddings.length < minClusterSize) {
    return new Array(embeddings.length).fill(-1); // All noise
  }
  
  const labels = new Array(embeddings.length).fill(-1);
  let currentCluster = 0;
  const visited = new Set<number>();
  
  // Cosine similarity function
  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  };
  
  // Simple clustering based on similarity threshold
  const threshold = 0.8;
  
  for (let i = 0; i < embeddings.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster: number[] = [i];
    visited.add(i);
    
    for (let j = i + 1; j < embeddings.length; j++) {
      if (visited.has(j)) continue;
      
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      if (similarity > threshold) {
        cluster.push(j);
        visited.add(j);
      }
    }
    
    if (cluster.length >= minClusterSize) {
      cluster.forEach(idx => labels[idx] = currentCluster);
      currentCluster++;
    }
  }
  
  return labels;
}

/**
 * Generate meaningful cluster names based on sentence content
 */
function generateClusterNames(sentences: ProcessedSentence[], clusterLabels: number[]): Record<number, string> {
  const clusterGroups: Record<number, ProcessedSentence[]> = {};
  
  // Group sentences by cluster
  sentences.forEach((sentence, index) => {
    const label = clusterLabels[index];
    if (label !== -1) {
      if (!clusterGroups[label]) clusterGroups[label] = [];
      clusterGroups[label].push(sentence);
    }
  });
  
  const clusterNames: Record<number, string> = {};
  
  Object.entries(clusterGroups).forEach(([labelStr, sentenceGroup]) => {
    const label = parseInt(labelStr);
    const name = generateClusterName(sentenceGroup);
    clusterNames[label] = name;
  });
  
  return clusterNames;
}

/**
 * Generate a descriptive name for a cluster based on common patterns
 */
function generateClusterName(sentences: ProcessedSentence[]): string {
  if (sentences.length === 0) return "Empty Cluster";
  
  // Combine all sentences for analysis
  const allText = sentences.map(s => s.sentence.toLowerCase()).join(' ');
  const stage = sentences[0].stage;
  
  // Stage-specific naming patterns
  if (stage === "Patient Interview & History") {
    if (allText.includes('bring') || allText.includes('today')) return "Initial Consultation";
    if (allText.includes('name') || allText.includes('call')) return "Patient Information";
    if (allText.includes('first') || allText.includes('time')) return "First-time Visitors";
    return "General Interview";
  }
  
  if (stage === "Previous Experience Review") {
    if (allText.includes('botox') && allText.includes('appointment')) return "Botox Follow-up";
    if (allText.includes('last') || allText.includes('before')) return "Past Treatment Review";
    if (allText.includes('how') && allText.includes('was')) return "Experience Check-in";
    if (allText.includes('good') || allText.includes('okay')) return "Treatment Feedback";
    return "Experience Discussion";
  }
  
  if (stage === "Treatment Planning & Options") {
    if (allText.includes('price') || allText.includes('cost') || allText.includes('$')) return "Pricing Discussion";
    if (allText.includes('options') || allText.includes('choose')) return "Treatment Options";
    if (allText.includes('recommend') || allText.includes('suggest')) return "Recommendations";
    if (allText.includes('syringe') || allText.includes('units')) return "Dosage Planning";
    return "Treatment Planning";
  }
  
  if (stage === "Objection Handling & Concerns") {
    if (allText.includes('bruise') || allText.includes('bruising')) return "Bruising Concerns";
    if (allText.includes('hurt') || allText.includes('pain')) return "Pain Concerns";
    if (allText.includes('side') && allText.includes('effect')) return "Side Effects";
    if (allText.includes('safe') || allText.includes('risk')) return "Safety Questions";
    return "General Concerns";
  }
  
  if (stage === "Aesthetic Goals Discovery") {
    if (allText.includes('look') || allText.includes('appearance')) return "Appearance Goals";
    if (allText.includes('younger') || allText.includes('age')) return "Anti-aging Goals";
    if (allText.includes('confident') || allText.includes('feel')) return "Confidence Goals";
    return "Aesthetic Goals";
  }
  
  if (stage === "Treatment Education & Knowledge") {
    if (allText.includes('how') && allText.includes('work')) return "Treatment Mechanism";
    if (allText.includes('last') || allText.includes('long')) return "Duration Education";
    if (allText.includes('after') || allText.includes('care')) return "Aftercare Instructions";
    return "Patient Education";
  }
  
  if (stage === "Facial Assessment & Analysis") {
    if (allText.includes('area') || allText.includes('zone')) return "Treatment Areas";
    if (allText.includes('muscle') || allText.includes('movement')) return "Muscle Assessment";
    if (allText.includes('symmetry') || allText.includes('balance')) return "Facial Balance";
    return "Facial Analysis";
  }
  
  if (stage === "Closing & Treatment Commitment") {
    if (allText.includes('schedule') || allText.includes('book')) return "Appointment Booking";
    if (allText.includes('ready') || allText.includes('proceed')) return "Treatment Commitment";
    if (allText.includes('questions') || allText.includes('concerns')) return "Final Questions";
    return "Closing Discussion";
  }
  
  // Fallback: Extract key words
  const commonWords = extractCommonWords(sentences.map(s => s.sentence));
  if (commonWords.length > 0) {
    return `${commonWords[0]} Discussion`;
  }
  
  return "General Conversation";
}

/**
 * Extract common words from sentences for naming
 */
function extractCommonWords(sentences: string[]): string[] {
  const words: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'how', 'what', 'when', 'where', 'why', 'who', 'your', 'you', 'i', 'me', 'my', 'we', 'us', 'our', 'it', 'its']);
  
  sentences.forEach(sentence => {
    const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    sentenceWords.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        words[word] = (words[word] || 0) + 1;
      }
    });
  });
  
  return Object.entries(words)
    .filter(([word, count]) => count >= Math.max(1, Math.floor(sentences.length * 0.3)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

/**
 * Load transcript data following correct Firebase structure:
 * 1. Get user's userChain from users collection
 * 2. Get all location document IDs from /locations/{userChain}/
 * 3. Load transcripts from /transcript/{documentId}/timestamps/
 */
async function loadUserTranscriptData(userEmail?: string): Promise<LocationData[]> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  ////console.log(`📂 [DATA-LOAD] Loading transcript data for user: ${userEmail || 'all users'}`);
  
  try {
    let userChains: string[] = [];
    
    if (userEmail) {
      // Get specific user's chain
      //console.log(`👤 [DATA-LOAD] Looking up userChain for ${userEmail}`);
      const userQuery = await db.collection('users').where('email', '==', userEmail).get();
      
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data();
        userChains = [userData.userChain];
        //console.log(`✅ [DATA-LOAD] Found userChain: ${userData.userChain}`);
      } else {
        //console.log(`⚠️ [DATA-LOAD] User ${userEmail} not found, processing all chains`);
      }
    }
    
    // If no specific user or user not found, get all chains from locations
    if (userChains.length === 0) {
      //console.log(`🌐 [DATA-LOAD] Getting all chains from locations collection`);
      const locationsSnapshot = await db.collection('locations').get();
      userChains = locationsSnapshot.docs.map(doc => doc.id);
      //console.log(`📍 [DATA-LOAD] Found chains: ${userChains.join(', ')}`);
    }
    
    const allLocationData: LocationData[] = [];
    
    // Process each chain
    for (const chain of userChains) {
      //console.log(`\n🔗 [DATA-LOAD] Processing chain: ${chain}`);
      
      // Get all location subcollections for this chain
      const chainRef = db.collection('locations').doc(chain);
      const chainDoc = await chainRef.get();
      
      if (!chainDoc.exists) {
        //console.log(`⚠️ [DATA-LOAD] Chain ${chain} not found in locations`);
        continue;
      }
      
      // Get all subcollections (locations) for this chain
      const subcollections = await chainRef.listCollections();
      //console.log(`📂 [DATA-LOAD] Found ${subcollections.length} locations in chain ${chain}`);
      
      for (const locationCollection of subcollections) {
        const locationName = locationCollection.id;
        //console.log(`\n📍 [DATA-LOAD] Processing location: ${chain}/${locationName}`);
        
        // Get all document IDs from this location
        const locationSnapshot = await locationCollection.get();
        const documentIds = locationSnapshot.docs.map(doc => doc.id);
        //console.log(`📄 [DATA-LOAD] Found ${documentIds.length} document IDs: ${documentIds.slice(0, 3).join(', ')}...`);
        
        // For each document ID, load transcripts from /transcript/{docId}/timestamps/
        for (const docId of documentIds) {
          //console.log(`\n🔍 [DATA-LOAD] Loading transcripts for document: ${docId}`);
          
          try {
            const transcriptRef = db.collection('transcript').doc(docId).collection('timestamps');
            const timestampSnapshot = await transcriptRef.get();
            
            //console.log(`⏰ [DATA-LOAD] Found ${timestampSnapshot.docs.length} timestamp documents for ${docId}`);
            
            for (const timestampDoc of timestampSnapshot.docs) {
              const data = timestampDoc.data();
              const timestampId = timestampDoc.id;
              
              //console.log(`📋 [DATA-LOAD] Checking timestamp: ${timestampId}`);
              //console.log(`📋 [DATA-LOAD] Has transcript: ${!!data.transcript}, speakerTranscript: ${!!data['speaker transcript']}`);
              
              // Check for transcript data (note: it's "speaker transcript" with a space)
              const speakerTranscript = data['speaker transcript'] || data.speakerTranscript;
              
              if (data.transcript && speakerTranscript && Array.isArray(speakerTranscript)) {
                // Check if transcript has meaningful content
                if (data.transcript.length > 10 && speakerTranscript.length > 0) {
                  allLocationData.push({
                    documentId: `${docId}_${timestampId}`,
                    transcript: data.transcript,
                    speakerTranscript: speakerTranscript,
                    timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
                  });
                  
                  //console.log(`✅ [DATA-LOAD] Loaded transcript: ${docId}_${timestampId} (${speakerTranscript.length} turns)`);
                  //console.log(`📝 [DATA-LOAD] Sample text: "${data.transcript.substring(0, 50)}..."`);
                } else {
                  //console.log(`⚠️ [DATA-LOAD] Skipping ${timestampId} - transcript too short or no speaker turns`);
                }
              } else {
                //console.log(`⚠️ [DATA-LOAD] Skipping ${timestampId} - missing transcript or speaker transcript`);
              }
            }
          } catch (error) {
            console.error(`❌ [DATA-LOAD] Error loading transcripts for ${docId}:`, error);
          }
        }
      }
    }
    
    //console.log(`\n📈 [DATA-LOAD] Successfully loaded ${allLocationData.length} total transcripts from all chains`);
    return allLocationData;
    
  } catch (error) {
    console.error('❌ [DATA-LOAD] Error loading transcript data:', error);
    return [];
  }
}

/**
 * Legacy function - now calls the correct data loader
 */
async function loadLocationData(chainId: string, locationId: string): Promise<LocationData[]> {
  //console.log(`🔄 [DATA-LOAD] Redirecting to new data loader (ignoring chainId/locationId parameters)`);
  return await loadUserTranscriptData();
}

/**
 * Process conversations for chosen locations
 */
export async function processConversations(chainId: string, locationId: string): Promise<{
  processedSentences: ProcessedSentence[];
  summary: any;
}> {
  //console.log(`\n🚀 [PROCESS] Starting conversation analysis (processing ALL chains and locations)`);
  //console.log(`⭐ [PROCESS] Target stages: ${TARGET_STAGES.length} stages`);
  ////console.log(`📍 [PROCESS] NOTE: chainId/locationId parameters ignored - processing all available data`);
  
  // Step 1: Load data
  ////console.log(`\n📂 [STEP-1] Loading location data...`);
  const locationData = await loadUserTranscriptData(); // Load all data, not just specific location
  ////console.log(`✅ [STEP-1] Loaded ${locationData.length} conversations`);
  
  if (locationData.length === 0) {
    return { processedSentences: [], summary: null };
  }
  
  // Step 2: Filter and classify stages
  const allTurns: Array<{text: string, documentId: string, speaker: string}> = [];
  
  locationData.forEach(data => {
    data.speakerTranscript.forEach(turn => {
      if (turn.text && turn.text.length > 10) {
        allTurns.push({
          text: turn.text,
          documentId: data.documentId,
          speaker: turn.speaker
        });
      }
    });
  });
  
  ////console.log(`Processing ${allTurns.length} turns`);
  
  // Batch classify stages
  const classifications = await batchClassifyStages(
    allTurns.map((turn, index) => ({ text: turn.text, index }))
  );
  
  // Filter to target stages only
  const filteredTurns: ProcessedTurn[] = [];
  allTurns.forEach((turn, index) => {
    const classification = classifications[index];
    if (TARGET_STAGES.includes(classification.stage)) {
      filteredTurns.push({
        rep_id: turn.documentId,
        speaker: turn.speaker,
        stage: classification.stage,
        text: turn.text,
        confidence: classification.confidence
      });
    }
  });
  
  ////console.log(`Filtered to ${filteredTurns.length} turns in target stages`);
  
  // Step 3: Sentence segmentation
  const sentences: ProcessedSentence[] = [];
  
  filteredTurns.forEach(turn => {
    const sentenceTexts = segmentSentences(turn.text);
    sentenceTexts.forEach(sentenceText => {
      sentences.push({
        rep_id: turn.rep_id,
        speaker: turn.speaker,
        stage: turn.stage,
        sentence: sentenceText
      });
    });
  });
  
  ////console.log(`Generated ${sentences.length} sentences`);
  
  // Step 4: Get embeddings and cluster by stage
  const stageGroups = TARGET_STAGES.reduce((acc, stage) => {
    acc[stage] = sentences.filter(s => s.stage === stage);
    return acc;
  }, {} as Record<string, ProcessedSentence[]>);
  
  for (const stage of TARGET_STAGES) {
    const stageSentences = stageGroups[stage];
    if (stageSentences.length < 5) {
      // Too few sentences - mark all as noise
      stageSentences.forEach(s => s.cluster_label = -1);
      continue;
    }
    
    ////console.log(`Processing ${stageSentences.length} sentences for stage: ${stage}`);
    
    // Get embeddings for this stage
    const embeddings = await getEmbeddings(stageSentences.map(s => s.sentence));
    
    // Cluster within this stage
    const clusterLabels = simpleClustering(embeddings, 5);
    
    // Generate meaningful cluster names for this stage
    const clusterNames = generateClusterNames(stageSentences, clusterLabels);
    
    // Assign embeddings and meaningful cluster labels
    stageSentences.forEach((sentence, index) => {
      sentence.embedding = embeddings[index];
      const numericLabel = clusterLabels[index];
      sentence.cluster_label = numericLabel === -1 ? "Uncategorized" : clusterNames[numericLabel] || `Cluster ${numericLabel}`;
    });
  }
  
  // Step 5: Generate summary statistics
  const summary = {
    totalConversations: locationData.length,
    totalSentences: sentences.length,
    stagesProcessed: TARGET_STAGES.length,
    stageBreakdown: TARGET_STAGES.reduce((acc, stage) => {
      const stageSentences = sentences.filter(s => s.stage === stage);
      const clusters = [...new Set(stageSentences.map(s => s.cluster_label).filter(l => l !== -1))];
      
      acc[stage] = {
        sentenceCount: stageSentences.length,
        clusterCount: clusters.length,
        conversationCoverage: new Set(stageSentences.map(s => s.rep_id)).size
      };
      return acc;
    }, {} as Record<string, any>)
  };
  
  ////console.log('Processing complete:', summary);
  
  return { processedSentences: sentences, summary };
}

/**
 * Generate dashboard metrics from processed sentences
 */
export function generateDashboardMetrics(processedSentences: ProcessedSentence[]) {
  // Group by rep_id and cluster
  const repClusterCounts = processedSentences.reduce((acc, sentence) => {
    if (sentence.cluster_label === "Uncategorized" || sentence.cluster_label === -1) return acc; // Skip uncategorized
    
    const key = `${sentence.rep_id}_${sentence.stage}_${sentence.cluster_label}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate total sentences per rep
  const repTotals = processedSentences.reduce((acc, sentence) => {
    acc[sentence.rep_id] = (acc[sentence.rep_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate percentages
  const metrics = Object.entries(repClusterCounts).map(([key, count]) => {
    const parts = key.split('_');
    const clusterLabel = parts.slice(2).join('_'); // Handle cluster names with underscores
    const repId = parts[0];
    const stage = parts[1];
    const total = repTotals[repId] || 1;
    
    return {
      rep_id: repId,
      stage,
      cluster_label: clusterLabel,
      count,
      percentage: (count / total) * 100
    };
  });
  
  return metrics;
}