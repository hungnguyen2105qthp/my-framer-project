// Sales Performance Analysis Utilities

export interface SalesPerformance {
  confidence: 'low' | 'medium' | 'high'
  improvementAreas: string[]
  keyStrengths: string[]
  overallGrade: 'poor' | 'fair' | 'good' | 'excellent'
  protocolAdherence: string[]
  protocolScore: number
  recommendations: string
}

export interface Transcript {
  id: string
  salesPerformance: SalesPerformance
  [key: string]: any
}

export interface SalesPerformanceAverages {
  averageProtocolScore: number
  totalTranscripts: number
  gradeDistribution: {
    poor: number
    fair: number
    good: number
    excellent: number
  }
  confidenceDistribution: {
    low: number
    medium: number
    high: number
  }
  commonImprovementAreas: Array<{
    area: string
    count: number
    percentage: number
  }>
  commonKeyStrengths: Array<{
    strength: string
    count: number
    percentage: number
  }>
  topProtocolAdherence: Array<{
    protocol: string
    count: number
    percentage: number
  }>
}

/**
 * Calculate average protocol score and insights for filtered transcripts
 */
export const calculateSalesPerformanceAverages = (transcripts: Transcript[]): SalesPerformanceAverages => {
  if (!transcripts.length) {
    return {
      averageProtocolScore: 0,
      totalTranscripts: 0,
      gradeDistribution: { poor: 0, fair: 0, good: 0, excellent: 0 },
      confidenceDistribution: { low: 0, medium: 0, high: 0 },
      commonImprovementAreas: [],
      commonKeyStrengths: [],
      topProtocolAdherence: []
    }
  }

  const totalTranscripts = transcripts.length
  let totalProtocolScore = 0
  const gradeCount = { poor: 0, fair: 0, good: 0, excellent: 0 }
  const confidenceCount = { low: 0, medium: 0, high: 0 }
  const improvementAreaCount: { [key: string]: number } = {}
  const keyStrengthCount: { [key: string]: number } = {}
  const protocolAdherenceCount: { [key: string]: number } = {}

  transcripts.forEach(transcript => {
    const sp = transcript.salesPerformance
    if (!sp) return

    // Sum protocol scores
    totalProtocolScore += sp.protocolScore || 0

    // Count grades
    if (sp.overallGrade && gradeCount.hasOwnProperty(sp.overallGrade)) {
      gradeCount[sp.overallGrade]++
    }

    // Count confidence levels
    if (sp.confidence && confidenceCount.hasOwnProperty(sp.confidence)) {
      confidenceCount[sp.confidence]++
    }

    // Count improvement areas
    if (sp.improvementAreas && Array.isArray(sp.improvementAreas)) {
      sp.improvementAreas.forEach(area => {
        improvementAreaCount[area] = (improvementAreaCount[area] || 0) + 1
      })
    }

    // Count key strengths
    if (sp.keyStrengths && Array.isArray(sp.keyStrengths)) {
      sp.keyStrengths.forEach(strength => {
        keyStrengthCount[strength] = (keyStrengthCount[strength] || 0) + 1
      })
    }

    // Count protocol adherence items
    if (sp.protocolAdherence && Array.isArray(sp.protocolAdherence)) {
      sp.protocolAdherence.forEach(protocol => {
        protocolAdherenceCount[protocol] = (protocolAdherenceCount[protocol] || 0) + 1
      })
    }
  })

  // Calculate averages and sort by frequency
  const commonImprovementAreas = Object.entries(improvementAreaCount)
    .map(([area, count]) => ({
      area,
      count,
      percentage: Math.round((count / totalTranscripts) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  const commonKeyStrengths = Object.entries(keyStrengthCount)
    .map(([strength, count]) => ({
      strength,
      count,
      percentage: Math.round((count / totalTranscripts) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  const topProtocolAdherence = Object.entries(protocolAdherenceCount)
    .map(([protocol, count]) => ({
      protocol,
      count,
      percentage: Math.round((count / totalTranscripts) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  return {
    averageProtocolScore: Math.round((totalProtocolScore / totalTranscripts) * 100) / 100,
    totalTranscripts,
    gradeDistribution: gradeCount,
    confidenceDistribution: confidenceCount,
    commonImprovementAreas,
    commonKeyStrengths,
    topProtocolAdherence
  }
}

/**
 * Get sales performance insights as formatted text
 */
export const getSalesPerformanceInsights = (averages: SalesPerformanceAverages): string[] => {
  const insights: string[] = []

  // Protocol score insight
  if (averages.averageProtocolScore >= 8) {
    insights.push(`🎯 Excellent average protocol score of ${averages.averageProtocolScore}/10 across ${averages.totalTranscripts} transcripts`)
  } else if (averages.averageProtocolScore >= 6) {
    insights.push(`📊 Good average protocol score of ${averages.averageProtocolScore}/10 with room for improvement`)
  } else {
    insights.push(`⚠️ Below-average protocol score of ${averages.averageProtocolScore}/10 needs attention`)
  }

  // Grade distribution insights
  const excellentPercentage = Math.round((averages.gradeDistribution.excellent / averages.totalTranscripts) * 100)
  const poorPercentage = Math.round((averages.gradeDistribution.poor / averages.totalTranscripts) * 100)
  
  if (excellentPercentage > 50) {
    insights.push(`✅ ${excellentPercentage}% of consultations rated as excellent`)
  } else if (poorPercentage > 30) {
    insights.push(`🔴 ${poorPercentage}% of consultations rated as poor - immediate attention needed`)
  }

  // Top improvement areas
  if (averages.commonImprovementAreas.length > 0) {
    const topArea = averages.commonImprovementAreas[0]
    insights.push(`📈 Most common improvement area: ${topArea.area} (${topArea.percentage}% of cases)`)
  }

  // Top strengths
  if (averages.commonKeyStrengths.length > 0) {
    const topStrength = averages.commonKeyStrengths[0]
    insights.push(`💪 Key strength across team: ${topStrength.strength} (${topStrength.percentage}% of cases)`)
  }

  return insights
}

/**
 * Format sales performance data for individual transcript display
 */
export const formatIndividualSalesPerformance = (salesPerformance: SalesPerformance) => {
  return {
    summary: {
      protocolScore: `${salesPerformance.protocolScore}/10`,
      overallGrade: salesPerformance.overallGrade.toUpperCase(),
      confidence: salesPerformance.confidence.toUpperCase()
    },
    details: {
      improvementAreas: salesPerformance.improvementAreas,
      keyStrengths: salesPerformance.keyStrengths,
      protocolAdherence: salesPerformance.protocolAdherence,
      recommendations: salesPerformance.recommendations
    }
  }
}