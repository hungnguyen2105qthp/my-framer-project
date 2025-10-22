'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, Users, MessageSquare, TrendingUp, Filter, Search, Send } from 'lucide-react';
import { getUserDisplayName } from '@/lib/decryption-utils';
import { useAuth } from '@/context/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Stage colors matching your screenshot
const STAGE_COLORS = {
  "Patient Interview & History": { bg: "bg-purple-100", border: "border-purple-500", text: "text-purple-700", dot: "bg-purple-500" },
  "Aesthetic Goals Discovery": { bg: "bg-blue-100", border: "border-blue-500", text: "text-blue-700", dot: "bg-blue-500" },
  "Treatment Education & Knowledge": { bg: "bg-green-100", border: "border-green-500", text: "text-green-700", dot: "bg-green-500" },
  "Previous Experience Review": { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-700", dot: "bg-yellow-500" },
  "Facial Assessment & Analysis": { bg: "bg-red-100", border: "border-red-500", text: "text-red-700", dot: "bg-red-500" },
  "Treatment Planning & Options": { bg: "bg-orange-100", border: "border-orange-500", text: "text-orange-700", dot: "bg-orange-500" },
  "Objection Handling & Concerns": { bg: "bg-teal-100", border: "border-teal-500", text: "text-teal-700", dot: "bg-teal-500" },
  "Closing & Treatment Commitment": { bg: "bg-gray-100", border: "border-gray-500", text: "text-gray-700", dot: "bg-gray-500" }
};

interface ProcessedSentence {
  rep_id: string;
  speaker: string;
  stage: string;
  sentence: string;
  cluster_label: string | number;
}

interface StageData {
  stage: string;
  clusters: ClusterData[];
  totalSentences: number;
  totalTranscripts: number;
  percentage: number;
}

interface ClusterData {
  clusterName: string;
  sentences: ProcessedSentence[];
  transcriptCount: number;
  percentage: number;
  stage: string;
  commonPhrase: string;
  stageColor: string;
}

interface FilterState {
  selectedStage: string;
  selectedCluster: string;
  searchQuery: string;
}

interface TrackersData {
  summary: any;
  sentences: ProcessedSentence[];
  stages: StageData[];
  lastUpdated: string;
}

export function ConversationTrackersView() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [trackersData, setTrackersData] = useState<TrackersData | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [selectedPhrases, setSelectedPhrases] = useState<ProcessedSentence[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<ProcessedSentence[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ClusterData | null>(null);
  const [clusterPeople, setClusterPeople] = useState<{repId: string, name: string, phraseCount: number}[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    selectedStage: 'all',
    selectedCluster: 'all',
    searchQuery: ''
  });
  const [processedClusters, setProcessedClusters] = useState<ClusterData[]>([]);
  const [selectedPhrase, setSelectedPhrase] = useState<ProcessedSentence | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [comment, setComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [existingComments, setExistingComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showFullStatsModal, setShowFullStatsModal] = useState(false);
  const [fullStatsData, setFullStatsData] = useState<{clusterLabels: any[], stages: any[], phrases: ProcessedSentence[]}>({clusterLabels: [], stages: [], phrases: []});
  
  const { user } = useAuth();
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTrackersData();
  }, []);
  
  // Load comments when notes modal is opened
  useEffect(() => {
    if (showNotesModal && selectedPhrase) {
      loadExistingComments();
    }
  }, [showNotesModal, selectedPhrase]);
  
  // Process clusters when tracker data changes
  useEffect(() => {
    if (trackersData?.sentences) {
      const clusters = generateClusterLabels(trackersData.sentences);
      setProcessedClusters(clusters);
    }
  }, [trackersData]);

  const loadTrackersData = async () => {
    try {
      setIsLoading(true);
      
      // Load the processed conversation data
      const response = await fetch('/api/batch-process-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'load',
          chainId: 'All-Chains',
          locationId: 'All-Locations'
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const sentences = data.data.processedSentences || [];
        const summary = data.data.summary || {};
        
        // Process sentences into hierarchical stage data
        const stages = processIntoStageHierarchy(sentences);
        
        setTrackersData({
          summary,
          sentences,
          stages,
          lastUpdated: data.data.loadedAt || new Date().toISOString()
        });
        
        // Load customer names after setting tracker data
        await loadCustomerNames(sentences);
      }
    } catch (error) {
      console.error('Error loading trackers data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reprocessAllData = async () => {
    try {
      setIsReprocessing(true);
      
      // Trigger reprocessing of all conversation data
      const response = await fetch('/api/batch-process-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // After reprocessing, reload the data
        await loadTrackersData();
        console.log('Reprocessing completed:', result.summary);
      } else {
        console.error('Reprocessing failed:', result.error);
      }
    } catch (error) {
      console.error('Error reprocessing data:', error);
    } finally {
      setIsReprocessing(false);
    }
  };

  // Generate cluster labels from common phrases
  const generateClusterLabels = (sentences: ProcessedSentence[]): ClusterData[] => {
    const clusterGroups: Record<string, ProcessedSentence[]> = {};
    
    // Group sentences by cluster_label and stage
    sentences.forEach(sentence => {
      if (sentence.cluster_label === "Uncategorized" || sentence.cluster_label === -1) return;
      
      const clusterKey = `${sentence.stage}:${sentence.cluster_label}`;
      if (!clusterGroups[clusterKey]) {
        clusterGroups[clusterKey] = [];
      }
      clusterGroups[clusterKey].push(sentence);
    });
    
    // Process each cluster to create labels
    const clusters: ClusterData[] = [];
    
    Object.entries(clusterGroups).forEach(([clusterKey, clusterSentences]) => {
      const [stage, clusterLabel] = clusterKey.split(':');
      const colors = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
      
      // Find most common/representative phrase for this cluster
      const phraseCounts: Record<string, number> = {};
      clusterSentences.forEach(sentence => {
        const cleanPhrase = sentence.sentence.trim();
        phraseCounts[cleanPhrase] = (phraseCounts[cleanPhrase] || 0) + 1;
      });
      
      // Get the most common phrase or create a representative label
      const sortedPhrases = Object.entries(phraseCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      let commonPhrase = "General Discussion";
      if (sortedPhrases.length > 0) {
        const topPhrase = sortedPhrases[0][0];
        // Create a shortened, descriptive label
        if (topPhrase.length > 50) {
          commonPhrase = topPhrase.substring(0, 47) + "...";
        } else {
          commonPhrase = topPhrase;
        }
        
        // If it's too generic, try to make it more specific
        if (commonPhrase.length < 20 && sortedPhrases.length > 1) {
          commonPhrase = `${commonPhrase} & related`;
        }
      }
      
      const uniqueTranscripts = new Set(clusterSentences.map(s => s.rep_id));
      const totalTranscripts = new Set(sentences.map(s => s.rep_id)).size;
      
      clusters.push({
        clusterName: clusterLabel,
        sentences: clusterSentences,
        transcriptCount: uniqueTranscripts.size,
        percentage: (uniqueTranscripts.size / totalTranscripts) * 100,
        stage: stage,
        commonPhrase: commonPhrase,
        stageColor: colors?.dot || 'bg-gray-500'
      });
    });
    
    return clusters.sort((a, b) => b.percentage - a.percentage);
  };

  const processIntoStageHierarchy = (sentences: ProcessedSentence[]): StageData[] => {
    const stageGroups: Record<string, ProcessedSentence[]> = {};
    const totalTranscripts = new Set(sentences.map(s => s.rep_id)).size;
    
    // Group sentences by stage
    sentences.forEach(sentence => {
      if (sentence.cluster_label === "Uncategorized" || sentence.cluster_label === -1) return;
      
      if (!stageGroups[sentence.stage]) {
        stageGroups[sentence.stage] = [];
      }
      stageGroups[sentence.stage].push(sentence);
    });
    
    // Process each stage
    return Object.entries(stageGroups).map(([stage, stageSentences]) => {
      // Group by cluster within stage
      const clusterGroups: Record<string, ProcessedSentence[]> = {};
      
      stageSentences.forEach(sentence => {
        const clusterName = sentence.cluster_label.toString();
        if (!clusterGroups[clusterName]) {
          clusterGroups[clusterName] = [];
        }
        clusterGroups[clusterName].push(sentence);
      });
      
      // Create cluster data
      const clusters: ClusterData[] = Object.entries(clusterGroups).map(([clusterName, clusterSentences]) => {
        const transcriptIds = new Set(clusterSentences.map(s => s.rep_id));
        return {
          clusterName,
          sentences: clusterSentences,
          transcriptCount: transcriptIds.size,
          percentage: (transcriptIds.size / totalTranscripts) * 100
        };
      }).sort((a, b) => b.percentage - a.percentage);
      
      const stageTranscriptIds = new Set(stageSentences.map(s => s.rep_id));
      
      return {
        stage,
        clusters,
        totalSentences: stageSentences.length,
        totalTranscripts: stageTranscriptIds.size,
        percentage: (stageTranscriptIds.size / totalTranscripts) * 100
      };
    }).sort((a, b) => b.percentage - a.percentage);
  };

  const toggleStage = (stage: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedStages(newExpanded);
  };

  const toggleCluster = (clusterKey: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterKey)) {
      newExpanded.delete(clusterKey);
    } else {
      newExpanded.add(clusterKey);
    }
    setExpandedClusters(newExpanded);
  };

  const getUniqueTranscriptIds = (sentences: ProcessedSentence[]): string[] => {
    return [...new Set(sentences.map(s => s.rep_id))];
  };

  // Extract base document ID from rep_id (remove timestamp part)
  const extractBaseDocumentId = (repId: string): string => {
    // rep_id format: "userId_timestampId" 
    // We need just the first part before the underscore (the base document ID)
    const parts = repId.split('_');
    return parts[0]; // Return just the base document ID
  };

  // Fetch encrypted user data from transcript collection
  const fetchEncryptedUserData = async (baseDocumentId: string) => {
    try {
      // Call an API endpoint to fetch transcript data
      const response = await fetch('/api/fetch-transcript-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: baseDocumentId })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.encryptedUserData || null;
      }
    } catch (error) {
      console.error('Error fetching encrypted user data:', error);
    }
    return null;
  };

  // Load customer names for all unique transcript IDs
  const loadCustomerNames = async (sentences: ProcessedSentence[]) => {
    const uniqueRepIds = [...new Set(sentences.map(s => s.rep_id))];
    const newCustomerNames: Record<string, string> = {};
    
    // console.log('🔍 Loading customer names for', uniqueRepIds.length, 'transcript IDs...');
    
    for (const repId of uniqueRepIds) {
      try {
        const baseDocumentId = extractBaseDocumentId(repId);
        
        // Skip if we already have this customer name
        if (customerNames[repId]) {
          newCustomerNames[repId] = customerNames[repId];
          continue;
        }
        
        // console.log('📋 Fetching encrypted data for:', baseDocumentId);
        const encryptedUserData = await fetchEncryptedUserData(baseDocumentId);
        
        if (encryptedUserData) {
          // console.log('🔐 Attempting to decrypt user data for:', baseDocumentId);
          // Use baseDocumentId as the userEmail parameter for getUserDisplayName
          const decryptedName = await getUserDisplayName(baseDocumentId, encryptedUserData);
          
          if (decryptedName && decryptedName !== baseDocumentId && decryptedName !== 'Unknown User') {
            newCustomerNames[repId] = decryptedName;
            // console.log('✅ Successfully decrypted name for', repId, ':', decryptedName);
          } else {
            newCustomerNames[repId] = `Customer ${repId.slice(0, 8)}...`;
            // console.log('⚠️ Using fallback name for', repId);
          }
        } else {
          newCustomerNames[repId] = `Customer ${repId.slice(0, 8)}...`;
          // console.log('⚠️ No encrypted data found for', baseDocumentId);
        }
      } catch (error) {
        // console.error('❌ Error loading customer name for', repId, ':', error);
        newCustomerNames[repId] = `Customer ${repId.slice(0, 8)}...`;
      }
    }
    
    setCustomerNames(prev => ({ ...prev, ...newCustomerNames }));
    // console.log('🎉 Loaded customer names:', newCustomerNames);
  };

  // Get display name for a rep_id
  const getCustomerDisplayName = (repId: string): string => {
    return customerNames[repId] || `Customer ${repId.slice(0, 8)}...`;
  };
  
  // Load existing comments for a phrase
  const loadExistingComments = async (repId: string) => {
    const effectiveRepId = repId || selectedPhrase?.rep_id;
    if (!effectiveRepId) return;
    
    try {
      setLoadingComments(true);
      
      if (!user) return;
      const deviceId = user.uid; // Use the user's device ID
      const alertsRef = doc(db, 'alerts', deviceId);
      const alertsSnap = await getDoc(alertsRef);
      
      if (alertsSnap.exists()) {
        const data = alertsSnap.data();
        const alerts = Array.isArray(data.alerts) ? data.alerts : [data];
        
        const allAlerts = alerts
          .filter((alert: any) => alert && (alert.message || alert.title))
          .sort((a: any, b: any) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || Date.now());
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || Date.now());
            return timeB.getTime() - timeA.getTime();
          });
        
        setExistingComments(allAlerts);
      } else {
        setExistingComments([]);
      }
    } catch (error) {
      console.error('Error loading existing comments:', error);
      setExistingComments([]);
    } finally {
      setLoadingComments(false);
    }
  };
  
  // Save comment for a phrase
  const saveComment = async () => {
    if (!comment.trim() || !selectedPhrase || !user) {
      return;
    }
    
    try {
      setSavingComment(true);
      
      const alertId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const alertDoc = {
        id: alertId,
        isRead: false,
        message: comment.trim(),
        recordingId: selectedPhrase.rep_id,
        timestamp: new Date(),
        title: `TRACKERS Comment on ${getCustomerDisplayName(selectedPhrase.rep_id)}`,
        transcriptReferences: [{
          context: "TRACKERS Analysis",
          entryId: selectedPhrase.rep_id,
          entryIndex: 0,
          quote: selectedPhrase.sentence,
          speaker: selectedPhrase.speaker,
          category: selectedPhrase.stage,
          highlightedPhrase: selectedPhrase.sentence,
          transcriptName: getCustomerDisplayName(selectedPhrase.rep_id),
          audioURL: ''
        }],
        type: "warning",
        source: "TRACKERS_TAB",
        userEmail: user.email || 'unknown',
        userName: user.displayName || 'Unknown User',
        lastUpdated: new Date()
      };
      
      const deviceId = user.uid; // Use the user's device ID
      console.log(`🎯 Using user device ID for alerts: ${deviceId}`);
      const alertsRef = doc(db, 'alerts', deviceId);
      const alertsSnap = await getDoc(alertsRef);
      
      let existingAlerts = [];
      if (alertsSnap.exists()) {
        const data = alertsSnap.data();
        existingAlerts = data.alerts || [];
        console.log(`🔍 Found ${existingAlerts.length} existing alerts for rep_id: ${selectedPhrase.rep_id}`);
      } else {
        console.log(`📄 No alerts document found for rep_id: ${selectedPhrase.rep_id}`);
      }
      
      existingAlerts.push(alertDoc);
      
      await setDoc(alertsRef, { alerts: existingAlerts }, { merge: true });
      console.log(`✅ Comment saved to /alerts/${user.uid}`);
      
      setComment('');
      loadExistingComments(user.uid);
      
    } catch (error) {
      console.error('Error saving comment:', error);
    } finally {
      setSavingComment(false);
    }
  };

  // Load full stats data for selected customer
  const loadFullStatsData = async () => {
    if (!selectedCustomer || !trackersData) return;
    
    try {
      // Get all sentences for the selected customer from all stages and clusters
      const customerSentences = trackersData.sentences.filter(s => s.rep_id === selectedCustomer);
      
      // Group by cluster_label and stage
      const clusterGroups: Record<string, ProcessedSentence[]> = {};
      const stageGroups: Record<string, ProcessedSentence[]> = {};
      
      customerSentences.forEach(sentence => {
        // Skip uncategorized
        if (sentence.cluster_label === "Uncategorized" || sentence.cluster_label === -1) return;
        
        const clusterKey = `${sentence.stage}:${sentence.cluster_label}`;
        if (!clusterGroups[clusterKey]) {
          clusterGroups[clusterKey] = [];
        }
        clusterGroups[clusterKey].push(sentence);
        
        if (!stageGroups[sentence.stage]) {
          stageGroups[sentence.stage] = [];
        }
        stageGroups[sentence.stage].push(sentence);
      });
      
      // Create cluster labels data
      const clusterLabels = Object.entries(clusterGroups).map(([clusterKey, sentences]) => {
        const [stage, clusterLabel] = clusterKey.split(':');
        const colors = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
        
        // Find most common phrase for this cluster
        const phraseCounts: Record<string, number> = {};
        sentences.forEach(sentence => {
          const cleanPhrase = sentence.sentence.trim();
          phraseCounts[cleanPhrase] = (phraseCounts[cleanPhrase] || 0) + 1;
        });
        
        const sortedPhrases = Object.entries(phraseCounts)
          .sort(([,a], [,b]) => b - a);
        
        let commonPhrase = "General Discussion";
        if (sortedPhrases.length > 0) {
          const topPhrase = sortedPhrases[0][0];
          if (topPhrase.length > 50) {
            commonPhrase = topPhrase.substring(0, 47) + "...";
          } else {
            commonPhrase = topPhrase;
          }
        }
        
        return {
          clusterKey,
          stage,
          clusterLabel,
          commonPhrase,
          sentences,
          colors,
          count: sentences.length
        };
      });
      
      // Create stages data
      const stages = Object.entries(stageGroups).map(([stage, sentences]) => {
        const colors = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
        return {
          stage,
          sentences,
          colors,
          count: sentences.length
        };
      });
      
      setFullStatsData({
        clusterLabels,
        stages,
        phrases: customerSentences
      });
      
    } catch (error) {
      console.error('Error loading full stats data:', error);
    }
  };

  // Handle phrase click in full stats modal
  const handleFullStatsPhraseClick = (phrase: ProcessedSentence) => {
    // Open document with highlighted phrase (similar to activity page)
    // For now, we'll open the notes modal - in real implementation this would navigate to the document
    setSelectedPhrase(phrase);
    setShowNotesModal(true);
    setShowFullStatsModal(false);
            loadExistingComments(phrase.rep_id);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Word Trackers</h2>
          <p className="text-muted-foreground">Organized by stages, clusters, and conversation transcripts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTrackersData} disabled={isLoading || isReprocessing} variant="outline">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Data
          </Button>
          <Button onClick={reprocessAllData} disabled={isLoading || isReprocessing}>
            {isReprocessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-2" />
            )}
            Reprocess All Data
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trackersData?.stages.length || 0}</div>
            <p className="text-xs text-muted-foreground">With conversation data</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trackersData?.stages.reduce((sum, stage) => sum + stage.clusters.length, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Named conversation themes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trackersData ? new Set(trackersData.sentences.map(s => s.rep_id)).size : 0}
            </div>
            <p className="text-xs text-muted-foreground">Processed conversations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clustered Phrases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trackersData?.sentences.filter(s => s.cluster_label !== "Uncategorized" && s.cluster_label !== -1).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Grouped by similarity</p>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Stage</label>
              <Select value={filters.selectedStage} onValueChange={(value) => setFilters(prev => ({...prev, selectedStage: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.keys(STAGE_COLORS).map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Search</label>
              <Input
                placeholder="Search phrases..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({...prev, searchQuery: e.target.value}))}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Cluster Labels */}
        <Card>
          <CardHeader>
            <CardTitle>Word Trackers</CardTitle>
            <CardDescription>
              Cluster labels showing common phrases and discussion topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : processedClusters.length > 0 ? (
                (() => {
                  let filteredClusters = processedClusters;
                
                // Apply stage filter
                if (filters.selectedStage !== 'all') {
                  filteredClusters = filteredClusters.filter(cluster => cluster.stage === filters.selectedStage);
                }
                
                // Apply cluster filter
                if (filters.selectedCluster !== 'all') {
                  const [filterStage, filterCluster] = filters.selectedCluster.split(':');
                  filteredClusters = filteredClusters.filter(cluster => 
                    cluster.stage === filterStage && cluster.clusterName === filterCluster
                  );
                }
                
                // Apply search filter
                if (filters.searchQuery) {
                  filteredClusters = filteredClusters.filter(cluster => 
                    cluster.commonPhrase.toLowerCase().includes(filters.searchQuery.toLowerCase())
                  );
                }
                
                return filteredClusters.map((cluster) => {
                  const colors = STAGE_COLORS[cluster.stage as keyof typeof STAGE_COLORS];
                  const isSelected = selectedCluster?.clusterName === cluster.clusterName && selectedCluster?.stage === cluster.stage;
                  
                  return (
                    <div 
                      key={`${cluster.stage}:${cluster.clusterName}`} 
                      className={`p-4 border ${colors.border} rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        isSelected ? colors.bg : 'bg-white'
                      }`}
                      onClick={() => {
                        setSelectedCluster(cluster);
                        setSelectedCustomer(null);
                        setSelectedCustomerData([]);
                        
                        // Get people for this cluster
                        const people: Record<string, {name: string, count: number}> = {};
                        cluster.sentences.forEach(sentence => {
                          if (!people[sentence.rep_id]) {
                            people[sentence.rep_id] = {
                              name: getCustomerDisplayName(sentence.rep_id),
                              count: 0
                            };
                          }
                          people[sentence.rep_id].count++;
                        });
                        
                        const peopleList = Object.entries(people)
                          .map(([repId, data]) => ({
                            repId,
                            name: data.name,
                            phraseCount: data.count
                          }))
                          .sort((a, b) => b.phraseCount - a.phraseCount);
                        // Filter out blocked names
                        const BLOCKED_NAMES = new Set(['aditya mahna', 'ayush mahna']);
                        const filteredPeopleList = peopleList.filter(p => !BLOCKED_NAMES.has(p.name.toLowerCase()));
                        setClusterPeople(filteredPeopleList);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                          <Badge variant="outline" className={`text-xs ${colors.text}`}>
                            {cluster.stage}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">{cluster.percentage.toFixed(0)}%</div>
                      </div>
                      <div className="text-sm font-medium mb-2">{cluster.commonPhrase}</div>
                      <Progress value={cluster.percentage} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">
                        {cluster.transcriptCount} people • {cluster.sentences.length} phrases
                      </div>
                    </div>
                  );
                  });
                })()
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No conversation data found. Try processing conversations first.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side - People or Individual View */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCustomer ? 
                getCustomerDisplayName(selectedCustomer) + "'s Stats" : 
                selectedCluster ? 
                `People using "${selectedCluster.commonPhrase}"` :
                "Select a cluster to view people"
              }
            </CardTitle>
            <CardDescription>
              {selectedCustomer ? 
                "Individual conversation analytics with timing data" :
                selectedCluster ? 
                "Click on person names to view individual analytics" :
                "Choose a conversation tracker from the left to see who uses those phrases"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              // Individual Person View
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setSelectedCustomerData([]);
                      }}
                    >
                      ← Back
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">
                      {selectedCustomerData.length} phrases
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        loadFullStatsData();
                        setShowFullStatsModal(true);
                      }}
                    >
                      View Full Stats
                    </Button>
                  </div>
                </div>
                
                {/* Individual's phrases grouped by category */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(() => {
                    const customerStages: Record<string, ProcessedSentence[]> = {};
                    selectedCustomerData.forEach(sentence => {
                      if (!customerStages[sentence.stage]) {
                        customerStages[sentence.stage] = [];
                      }
                      customerStages[sentence.stage].push(sentence);
                    });
                    
                    return Object.entries(customerStages).map(([stage, sentences]) => {
                      const colors = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
                      const percentage = (sentences.length / selectedCustomerData.length) * 100;
                      
                      return (
                        <div key={stage} className="space-y-2">
                          <div className={`p-3 border ${colors.border} rounded-lg ${colors.bg}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                                <div className="text-sm font-medium">{stage}</div>
                              </div>
                              <div className="text-sm">{sentences.length} phrases ({percentage.toFixed(0)}%)</div>
                            </div>
                          </div>
                          
                          {/* Individual phrases */}
                          <div className="ml-6 space-y-2">
                            {sentences.map((phrase, index) => (
                              <div 
                                key={index} 
                                className="p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => {
                                  setSelectedPhrase(phrase);
                                  setShowNotesModal(true);
                                  loadExistingComments();
                                }}
                              >
                                <div className="text-sm text-gray-800">
                                  "{phrase.sentence}"
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Speaker: {phrase.speaker} • Cluster: {phrase.cluster_label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()
                  }
                </div>
              </div>
            ) : selectedCluster ? (
              // People List for Selected Cluster
              <div className="space-y-3">
                {clusterPeople.map(person => (
                  <div 
                    key={person.repId} 
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedCustomer(person.repId);
                      const customerSentences = selectedCluster.sentences.filter(s => s.rep_id === person.repId);
                      setSelectedCustomerData(customerSentences);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium">
                        {person.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {person.phraseCount} phrases
                      </Badge>
                      <div className={`w-3 h-3 rounded-full ${selectedCluster.stageColor}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No cluster selected</p>
                <p className="text-sm">Choose a conversation tracker from the left to see who uses those phrases</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Modal for Phrase Commenting */}
      {/* {showNotesModal && selectedPhrase && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold">Add Comment</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {getCustomerDisplayName(selectedPhrase.rep_id)} - {selectedPhrase.stage}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedPhrase(null);
                  setComment('');
                }}
              >
                ×
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedPhrase.speaker}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {selectedPhrase.stage}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">
                    "{selectedPhrase.sentence}"
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Cluster: {selectedPhrase.cluster_label}
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-600 mb-2 block">Your Comment</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add your thoughts about this phrase..."
                  className="w-full h-32 resize-none"
                />
              </div>
              
              {loadingComments ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : existingComments.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Previous Comments ({existingComments.length})</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {existingComments.map((comment, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            {comment.userName || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {comment.timestamp?.toDate ? 
                              comment.timestamp.toDate().toLocaleDateString() : 
                              'Recent'
                            }
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No comments yet</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedPhrase(null);
                  setComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveComment}
                disabled={!comment.trim() || savingComment}
              >
                {savingComment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Save Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )} */}

      {/* Full Stats Modal */}
      {showFullStatsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold">{getCustomerDisplayName(selectedCustomer)} - Full Stats</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Complete conversation analytics with all cluster labels and stages
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFullStatsModal(false);
                  setFullStatsData({clusterLabels: [], stages: [], phrases: []});
                }}
              >
                ×
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 p-6 h-full">
                {/* Left Side - Cluster Labels and Stages */}
                <div className="space-y-4 overflow-y-auto">
                  <h4 className="text-md font-semibold">Cluster Labels & Stages</h4>
                  
                  {/* Group by stage */}
                  {fullStatsData.stages.map(stageData => {
                    const stageClusterLabels = fullStatsData.clusterLabels.filter(cl => cl.stage === stageData.stage);
                    
                    return (
                      <div key={stageData.stage} className="space-y-2">
                        <div className={`p-3 border ${stageData.colors.border} rounded-lg ${stageData.colors.bg}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${stageData.colors.dot}`} />
                              <div className="text-sm font-medium">{stageData.stage}</div>
                            </div>
                            <div className="text-sm">{stageData.count} phrases</div>
                          </div>
                        </div>
                        
                        {/* Cluster labels for this stage */}
                        <div className="ml-6 space-y-2">
                          {stageClusterLabels.map(clusterData => (
                            <div 
                              key={clusterData.clusterKey}
                              className="p-2 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => {
                                // Show phrases for this cluster
                                const phrasesContainer = document.getElementById('full-stats-phrases');
                                if (phrasesContainer) {
                                  phrasesContainer.innerHTML = '';
                                  clusterData.sentences.forEach((phrase: ProcessedSentence, index: number) => {
                                    const phraseDiv = document.createElement('div');
                                    phraseDiv.className = 'p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 transition-colors mb-2';
                                    phraseDiv.innerHTML = `
                                      <div class="text-sm text-gray-800">"${phrase.sentence}"</div>
                                      <div class="text-xs text-gray-500 mt-1">Speaker: ${phrase.speaker} • Cluster: ${phrase.cluster_label}</div>
                                    `;
                                    phraseDiv.onclick = () => handleFullStatsPhraseClick(phrase);
                                    phrasesContainer.appendChild(phraseDiv);
                                  });
                                }
                              }}
                            >
                              <div className="text-sm font-medium">{clusterData.commonPhrase}</div>
                              <div className="text-xs text-gray-500">Cluster {clusterData.clusterLabel} • {clusterData.count} phrases</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Right Side - Specific Phrases */}
                <div className="space-y-4 overflow-y-auto">
                  <h4 className="text-md font-semibold">Specific Phrases</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Click on a cluster label on the left to see specific phrases. Click any phrase to view/add comments.
                  </p>
                  
                  <div id="full-stats-phrases" className="space-y-2">
                    {/* Default view - show recent phrases */}
                    {fullStatsData.phrases.slice(0, 10).map((phrase, index) => (
                      <div 
                        key={index}
                        className="p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => handleFullStatsPhraseClick(phrase)}
                      >
                        <div className="text-sm text-gray-800">
                          "{phrase.sentence}"
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Speaker: {phrase.speaker} • Stage: {phrase.stage} • Cluster: {phrase.cluster_label}
                        </div>
                      </div>
                    ))}
                    
                    {fullStatsData.phrases.length > 10 && (
                      <div className="text-xs text-gray-400 text-center py-2">
                        Showing 10 of {fullStatsData.phrases.length} phrases. Click cluster labels to filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t">
              <div className="text-sm text-gray-500">
                Total: {fullStatsData.clusterLabels.length} cluster labels across {fullStatsData.stages.length} stages
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowFullStatsModal(false);
                  setFullStatsData({clusterLabels: [], stages: [], phrases: []});
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}