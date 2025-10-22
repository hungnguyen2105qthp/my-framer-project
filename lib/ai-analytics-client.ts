import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { clientLogger } from './logger'

// Interface for AI phrase analysis
interface AIPhraseAnalysis {
  phrase: string
  category: string
  timestamp: string
  originalTimestampId: string
  originalTranscriptId: string
  userEmail: string
  keywords: string[]
  confidence: number
}

// Interface for AI analytics document
interface AIAnalyticsDocument {
  id: string
  transcriptId: string
  timestampId: string
  userEmail: string
  phrasesByCategory: {
    [category: string]: AIPhraseAnalysis[]
  }
  totalPhrases: number
  analyzedAt: any
  aiGenerated: boolean
}

// Function to get AI analytics from Firestore
export const getAIAnalyticsFromFirestore = async (): Promise<AIAnalyticsDocument[]> => {
  try {
    //clientLogger.info('🤖 Fetching AI analytics from Firestore...')
    
    const analyticsRef = collection(db, 'analytics')
    const analyticsSnap = await getDocs(analyticsRef)
    
    const aiAnalytics: AIAnalyticsDocument[] = []
    
    analyticsSnap.docs.forEach(doc => {
      const data = doc.data()
      if (data.aiGenerated) {
        aiAnalytics.push({
          id: doc.id,
          ...data
        } as AIAnalyticsDocument)
      }
    })
    
    //clientLogger.success(`✅ Found ${aiAnalytics.length} AI analytics documents`)
    return aiAnalytics
    
  } catch (error) {
    clientLogger.error('❌ Error fetching AI analytics:', error)
    return []
  }
}

// Function to build display data from AI analytics
export const buildAIDisplayData = (aiAnalytics: AIAnalyticsDocument[]) => {
  const categories = [
    "Consultation Opening",
    "Treatment Discovery", 
    "Objection Handling",
    "Upsell Opportunities",
    "Treatment Education",
    "Closing & Booking",
    "Follow-up & Retention",
    "Script Adherence"
  ]
  
  const categoryColors = {
    "Consultation Opening": "bg-purple-500",
    "Treatment Discovery": "bg-blue-500",
    "Objection Handling": "bg-red-500",
    "Upsell Opportunities": "bg-green-500",
    "Treatment Education": "bg-yellow-500",
    "Closing & Booking": "bg-orange-500",
    "Follow-up & Retention": "bg-teal-500",
    "Script Adherence": "bg-gray-600"
  }
  
  // Build category data
  const categoryData = categories.map(category => {
    let totalPhrases = 0
    const phrases: string[] = []
    
    aiAnalytics.forEach(analytics => {
      const categoryPhrases = analytics.phrasesByCategory[category] || []
      totalPhrases += categoryPhrases.length
      categoryPhrases.forEach(phraseData => {
        phrases.push(phraseData.phrase)
      })
    })
    
    return {
      name: category,
      color: categoryColors[category as keyof typeof categoryColors],
      count: totalPhrases,
      percentage: aiAnalytics.length > 0 ? (totalPhrases / aiAnalytics.length) * 100 : 0,
      phrases: phrases
    }
  })
  
  // Build phrase data
  const phraseMap = new Map<string, { count: number; category: string; transcriptIds: string[] }>()
  
  aiAnalytics.forEach(analytics => {
    Object.entries(analytics.phrasesByCategory).forEach(([category, phrases]) => {
      phrases.forEach(phraseData => {
        const key = `${phraseData.phrase}-${category}`
        if (phraseMap.has(key)) {
          const existing = phraseMap.get(key)!
          existing.count++
          if (!existing.transcriptIds.includes(analytics.transcriptId)) {
            existing.transcriptIds.push(analytics.transcriptId)
          }
        } else {
          phraseMap.set(key, {
            count: 1,
            category: category,
            transcriptIds: [analytics.transcriptId]
          })
        }
      })
    })
  })
  
  const phraseData = Array.from(phraseMap.entries()).map(([key, data]) => {
    const [phrase] = key.split('-', 1)
    return {
      phrase: phrase,
      count: data.count,
      percentage: aiAnalytics.length > 0 ? (data.count / aiAnalytics.length) * 100 : 0,
      category: data.category,
      transcriptIds: data.transcriptIds
    }
  }).sort((a, b) => b.count - a.count)
  
  return {
    categoryData,
    phraseData,
    totalAnalytics: aiAnalytics.length
  }
}

// Function to get detailed AI analytics for a specific transcript
export const getAIAnalyticsForTranscript = async (transcriptId: string): Promise<AIAnalyticsDocument[]> => {
  try {
    const analyticsRef = collection(db, 'analytics')
    const analyticsSnap = await getDocs(analyticsRef)
    
    const transcriptAnalytics: AIAnalyticsDocument[] = []
    
    analyticsSnap.docs.forEach(doc => {
      const data = doc.data()
      if (data.aiGenerated && data.transcriptId === transcriptId) {
        transcriptAnalytics.push({
          id: doc.id,
          ...data
        } as AIAnalyticsDocument)
      }
    })
    
    return transcriptAnalytics
    
  } catch (error) {
    //clientLogger.error('❌ Error fetching transcript AI analytics:', error)
    return []
  }
} 