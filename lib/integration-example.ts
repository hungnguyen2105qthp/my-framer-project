// Integration Example for Sales Performance Analytics
// This file shows how to integrate the sales performance components into your existing dashboard

import { calculateSalesPerformanceAverages, type Transcript } from './sales-performance-utils'

/**
 * Example of how to use the sales performance utilities in your dashboard
 */

// Example: Filter transcripts for ACTIVITY section and calculate averages
export const getActivitySalesPerformance = (allTranscripts: Transcript[], filterCriteria?: {
  dateRange?: { start: Date; end: Date }
  locationId?: string
  userId?: string
}) => {
  // Filter transcripts based on criteria
  let filteredTranscripts = allTranscripts

  if (filterCriteria?.dateRange) {
    filteredTranscripts = filteredTranscripts.filter(transcript => {
      const transcriptDate = new Date(transcript.createdAt || transcript.date)
      return transcriptDate >= filterCriteria.dateRange!.start && 
             transcriptDate <= filterCriteria.dateRange!.end
    })
  }

  if (filterCriteria?.locationId) {
    filteredTranscripts = filteredTranscripts.filter(transcript => 
      transcript.locationId === filterCriteria.locationId
    )
  }

  if (filterCriteria?.userId) {
    filteredTranscripts = filteredTranscripts.filter(transcript => 
      transcript.userId === filterCriteria.userId
    )
  }

  // Only include transcripts that have salesPerformance data
  const transcriptsWithSalesData = filteredTranscripts.filter(transcript => 
    transcript.salesPerformance && 
    typeof transcript.salesPerformance.protocolScore === 'number'
  )

  return calculateSalesPerformanceAverages(transcriptsWithSalesData)
}

// Example: Usage in a React component for the ACTIVITY section
/*
import { SalesPerformanceSummary } from '@/components/sales-performance-summary'
import { getActivitySalesPerformance } from '@/lib/integration-example'

// In your ACTIVITY section component:
const ActivitySection = ({ transcripts, selectedLocation, dateRange }) => {
  const salesPerformanceData = getActivitySalesPerformance(transcripts, {
    locationId: selectedLocation,
    dateRange: dateRange
  })

  return (
    <div className="activity-section">
      <h2>ACTIVITY Overview</h2>
      
      {// Other activity components}
      
      <SalesPerformanceSummary 
        averages={salesPerformanceData}
        showDetailedBreakdown={true}
      />
    </div>
  )
}
*/

// Example: Usage in individual transcript view
/*
import { IndividualSalesPerformance } from '@/components/sales-performance-summary'

// In your individual transcript/comment view:
const TranscriptDetailView = ({ transcript }) => {
  return (
    <div className="transcript-detail">
      <h2>Transcript Analysis</h2>
      
      {// Other transcript details}
      
      {transcript.salesPerformance && (
        <IndividualSalesPerformance 
          salesPerformance={transcript.salesPerformance}
        />
      )}
    </div>
  )
}
*/

// Mock data structure example for testing
export const mockTranscriptWithSalesPerformance: Transcript = {
  id: "transcript_123",
  salesPerformance: {
    confidence: "low",
    improvementAreas: [
      "Rapport Building",
      "In-depth Diagnosis", 
      "Education & Framing",
      "Solution Mapping",
      "Close/Next Step"
    ],
    keyStrengths: [
      "Open-ended question",
      "Shows follow-up interest",
      "Patient-focused tone"
    ],
    overallGrade: "poor",
    protocolAdherence: [
      "Diagnosis – asking about patient experience"
    ],
    protocolScore: 2,
    recommendations: "At 0:01 when you asked 'How was your Botox appointment today?', you asked an open-ended question but missed deeper engagement. Instead, say 'I remember you were excited about your Botox results—what improvements have you noticed in your lines and how do you feel about the overall experience so far?'"
  },
  // Other transcript fields...
  createdAt: new Date().toISOString(),
  locationId: "location_123",
  userId: "user_123"
}