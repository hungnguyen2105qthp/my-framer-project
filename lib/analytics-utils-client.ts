import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { clientLogger } from './logger'

// Category definitions for med spa analysis (client-side only)
const categories = [
  { name: "Consultation Opening", color: "bg-purple-500", keywords: ["hello", "welcome", "how are you", "nice to meet", "first time", "new patient", "consultation", "appointment", "scheduled", "introduction", "meet", "greet", "welcome to", "thank you for coming"] },
  { name: "Treatment Discovery", color: "bg-blue-500", keywords: ["concern", "goal", "looking to", "want to", "interested in", "botox", "filler", "dysport", "juvederm", "restylane", "treatment", "procedure", "area", "wrinkles", "lines", "volume", "lift", "tighten", "smooth", "plump", "fullness", "aging", "appearance", "look younger", "anti-aging"] },
  { name: "Objection Handling", color: "bg-red-500", keywords: ["expensive", "cost", "price", "afford", "budget", "money", "cheaper", "alternative", "scared", "nervous", "pain", "hurt", "side effect", "risk", "safe", "natural", "permanent", "temporary", "last", "duration", "time", "busy", "schedule", "commitment", "think about", "consider", "maybe later", "not sure", "hesitant", "worried", "concerned"] },
  { name: "Upsell Opportunities", color: "bg-green-500", keywords: ["package", "series", "multiple", "combination", "both", "together", "while you're here", "also", "addition", "enhance", "improve", "better results", "complementary", "maintenance", "follow up", "touch up", "refresher", "preventative", "prevent", "maintain", "keep up", "regular", "routine", "program", "membership", "loyalty", "discount", "special", "offer", "deal"] },
  { name: "Treatment Education", color: "bg-yellow-500", keywords: ["explain", "how it works", "process", "procedure", "technique", "method", "ingredient", "product", "brand", "dysport", "botox", "juvederm", "restylane", "safety", "fda", "approved", "clinical", "study", "research", "evidence", "proven", "effective", "results", "outcome", "expectation", "realistic", "timeline", "recovery", "downtime", "aftercare", "care"] },
  { name: "Closing & Booking", color: "bg-orange-500", keywords: ["book", "schedule", "appointment", "date", "time", "available", "calendar", "confirm", "commit", "proceed", "start", "begin", "ready", "decision", "move forward", "sign up", "register", "deposit", "payment", "credit card", "financing", "care credit", "installment", "plan", "today", "now", "next", "future"] },
  { name: "Follow-up & Retention", color: "bg-teal-500", keywords: ["follow up", "check in", "how are you", "feeling", "results", "satisfied", "happy", "pleased", "return", "come back", "next visit", "maintenance", "touch up", "refresher", "series", "package", "loyalty", "member", "regular", "routine", "schedule", "reminder", "call", "text", "email", "contact", "reach out"] },
  { name: "Script Adherence", color: "bg-gray-600", keywords: ["script", "protocol", "standard", "procedure", "policy", "guideline", "requirement", "must", "should", "need to", "have to", "required", "mandatory", "compliance", "follow", "adhere", "stick to", "routine", "process", "step", "checklist", "form", "documentation", "consent", "waiver", "medical history", "assessment", "evaluation"] },
]

// Function to analyze transcript text and extract phrases by category (client-side)
export const analyzeTranscriptText = (text: string, speakerTranscript: Array<{text?: string, timestamp?: string}> = []) => {
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
            const matchingSpeaker = speakerTranscript.find(speaker => 
              speaker.text && speaker.text.toLowerCase().includes(cleanPhrase.toLowerCase())
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

// Client-side function to analyze a single transcript
export const analyzeSingleTranscript = async (transcript: any) => {
  const text = transcript.transcript.toLowerCase()
  const speakerTranscript: Array<{text?: string, timestamp?: string}> = transcript.speakerTranscript || []
  const documentPhrases: { phrase: string; category: string; color: string; keywords: string[]; timestamp: string }[] = []
  
  categories.forEach(category => {
    const matchingKeywords = category.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    )
    
    if (matchingKeywords.length > 0) {
      const sentences = text.split(/[.!?]+/)
      sentences.forEach((sentence: string) => {
        if (matchingKeywords.some(keyword => sentence.includes(keyword.toLowerCase()))) {
          const cleanPhrase = sentence.trim()
          if (cleanPhrase.length > 0) {
            // Find the matching speaker entry to get the timestamp
            const matchingSpeaker = speakerTranscript.find(speaker => 
              speaker.text && speaker.text.toLowerCase().includes(cleanPhrase.toLowerCase())
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
  
  return {
    documentId: transcript.id,
    transcriptName: transcript.name,
    userEmail: transcript.userEmail,
    timestamp: transcript.timestamp,
    audioURL: transcript.audioURL,
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
    analysisTimestamp: new Date().toISOString()
  }
}

// Export categories for use in other components
export { categories } 