'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  SalesPerformanceAverages, 
  getSalesPerformanceInsights,
  formatIndividualSalesPerformance,
  type SalesPerformance
} from '@/lib/sales-performance-utils'

interface SalesPerformanceSummaryProps {
  averages: SalesPerformanceAverages
  showDetailedBreakdown?: boolean
}

export const SalesPerformanceSummary: React.FC<SalesPerformanceSummaryProps> = ({ 
  averages, 
  showDetailedBreakdown = true 
}) => {
  const insights = getSalesPerformanceInsights(averages)

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!averages.totalTranscripts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No sales performance data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    // <div className="space-y-6">
    //   {/* Main Summary Card */}
    //   <Card>
    //     <CardHeader>
    //       <CardTitle className="flex items-center justify-between">
    //         Sales Performance Overview
    //         <Badge variant="outline">{averages.totalTranscripts} transcripts</Badge>
    //       </CardTitle>
    //     </CardHeader>
    //     <CardContent className="space-y-4">
    //       {/* Average Protocol Score */}
    //       <div className="flex items-center justify-between">
    //         <span className="font-medium">Average Protocol Score</span>
    //         <span className={`text-2xl font-bold ${getScoreColor(averages.averageProtocolScore)}`}>
    //           {averages.averageProtocolScore}/10
    //         </span>
    //       </div>
    //       <Progress 
    //         value={averages.averageProtocolScore * 10} 
    //         className="w-full"
    //       />

    //       <Separator />

    //       {/* Key Insights */}
    //       <div>
    //         <h4 className="font-medium mb-2">Key Insights</h4>
    //         <ul className="space-y-1">
    //           {insights.map((insight, index) => (
    //             <li key={index} className="text-sm text-gray-600">{insight}</li>
    //           ))}
    //         </ul>
    //       </div>
    //     </CardContent>
    //   </Card>

    //   {showDetailedBreakdown && (
    //     <>
    //       {/* Grade & Confidence Distribution */}
    //       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    //         <Card>
    //           <CardHeader>
    //             <CardTitle className="text-lg">Overall Grade Distribution</CardTitle>
    //           </CardHeader>
    //           <CardContent className="space-y-3">
    //             {Object.entries(averages.gradeDistribution).map(([grade, count]) => (
    //               <div key={grade} className="flex items-center justify-between">
    //                 <Badge className={getGradeColor(grade)}>{grade}</Badge>
    //                 <div className="flex items-center space-x-2">
    //                   <span className="text-sm font-medium">{count}</span>
    //                   <Progress 
    //                     value={(count / averages.totalTranscripts) * 100}
    //                     className="w-20"
    //                   />
    //                   <span className="text-xs text-gray-500">
    //                     {Math.round((count / averages.totalTranscripts) * 100)}%
    //                   </span>
    //                 </div>
    //               </div>
    //             ))}
    //           </CardContent>
    //         </Card>

    //         <Card>
    //           <CardHeader>
    //             <CardTitle className="text-lg">Confidence Distribution</CardTitle>
    //           </CardHeader>
    //           <CardContent className="space-y-3">
    //             {Object.entries(averages.confidenceDistribution).map(([confidence, count]) => (
    //               <div key={confidence} className="flex items-center justify-between">
    //                 <Badge className={getConfidenceColor(confidence)}>{confidence}</Badge>
    //                 <div className="flex items-center space-x-2">
    //                   <span className="text-sm font-medium">{count}</span>
    //                   <Progress 
    //                     value={(count / averages.totalTranscripts) * 100}
    //                     className="w-20"
    //                   />
    //                   <span className="text-xs text-gray-500">
    //                     {Math.round((count / averages.totalTranscripts) * 100)}%
    //                   </span>
    //                 </div>
    //               </div>
    //             ))}
    //           </CardContent>
    //         </Card>
    //       </div>

    //       {/* Top Areas for Improvement */}
    //       {averages.commonImprovementAreas.length > 0 && (
    //         <Card>
    //           <CardHeader>
    //             <CardTitle className="text-lg">Most Common Improvement Areas</CardTitle>
    //           </CardHeader>
    //           <CardContent>
    //             <div className="space-y-2">
    //               {averages.commonImprovementAreas.slice(0, 5).map((area, index) => (
    //                 <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
    //                   <span className="text-sm font-medium">{area.area}</span>
    //                   <div className="flex items-center space-x-2">
    //                     <Badge variant="destructive">{area.count}</Badge>
    //                     <span className="text-xs text-gray-600">{area.percentage}%</span>
    //                   </div>
    //                 </div>
    //               ))}
    //             </div>
    //           </CardContent>
    //         </Card>
    //       )}

    //       {/* Key Strengths */}
    //       {averages.commonKeyStrengths.length > 0 && (
    //         <Card>
    //           <CardHeader>
    //             <CardTitle className="text-lg">Team Key Strengths</CardTitle>
    //           </CardHeader>
    //           <CardContent>
    //             <div className="space-y-2">
    //               {averages.commonKeyStrengths.slice(0, 5).map((strength, index) => (
    //                 <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
    //                   <span className="text-sm font-medium">{strength.strength}</span>
    //                   <div className="flex items-center space-x-2">
    //                     <Badge className="bg-green-100 text-green-800">{strength.count}</Badge>
    //                     <span className="text-xs text-gray-600">{strength.percentage}%</span>
    //                   </div>
    //                 </div>
    //               ))}
    //             </div>
    //           </CardContent>
    //         </Card>
    //       )}

    //       {/* Protocol Adherence */}
    //       {averages.topProtocolAdherence.length > 0 && (
    //         <Card>
    //           <CardHeader>
    //             <CardTitle className="text-lg">Top Protocol Adherence</CardTitle>
    //           </CardHeader>
    //           <CardContent>
    //             <div className="space-y-2">
    //               {averages.topProtocolAdherence.slice(0, 5).map((protocol, index) => (
    //                 <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
    //                   <span className="text-sm font-medium">{protocol.protocol}</span>
    //                   <div className="flex items-center space-x-2">
    //                     <Badge className="bg-blue-100 text-blue-800">{protocol.count}</Badge>
    //                     <span className="text-xs text-gray-600">{protocol.percentage}%</span>
    //                   </div>
    //                 </div>
    //               ))}
    //             </div>
    //           </CardContent>
    //         </Card>
    //       )}
    //     </>
    //   )}
    // </div>
    null
  )
}

interface IndividualSalesPerformanceProps {
  salesPerformance: SalesPerformance
}

export const IndividualSalesPerformance: React.FC<IndividualSalesPerformanceProps> = ({ 
  salesPerformance 
}) => {
  const formatted = formatIndividualSalesPerformance(salesPerformance)

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGradeColor = (grade: string) => {
    switch (grade.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sales Performance Analysis
          <div className="flex space-x-2">
            <Badge className={getGradeColor(formatted.summary.overallGrade)}>
              {formatted.summary.overallGrade}
            </Badge>
            <Badge className={getConfidenceColor(formatted.summary.confidence)}>
              {formatted.summary.confidence}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Protocol Score */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Protocol Score</span>
          <span className={`text-xl font-bold ${getScoreColor(salesPerformance.protocolScore)}`}>
            {formatted.summary.protocolScore}
          </span>
        </div>
        <Progress value={salesPerformance.protocolScore * 10} className="w-full" />

        <Separator />

        {/* Key Strengths */}
        {formatted.details.keyStrengths.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-green-700">Key Strengths</h4>
            <ul className="space-y-1">
              {formatted.details.keyStrengths.map((strength, index) => (
                <li key={index} className="text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement Areas */}
        {formatted.details.improvementAreas.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-red-700">Areas for Improvement</h4>
            <ul className="space-y-1">
              {formatted.details.improvementAreas.map((area, index) => (
                <li key={index} className="text-sm flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Protocol Adherence */}
        {formatted.details.protocolAdherence.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-blue-700">Protocol Adherence</h4>
            <ul className="space-y-1">
              {formatted.details.protocolAdherence.map((protocol, index) => (
                <li key={index} className="text-sm flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {protocol}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {formatted.details.recommendations && (
          <div>
            <h4 className="font-medium mb-2 text-purple-700">Recommendations</h4>
            <p className="text-sm bg-purple-50 p-3 rounded">
              {formatted.details.recommendations}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}