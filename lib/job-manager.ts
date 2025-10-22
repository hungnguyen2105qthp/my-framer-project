/**
 * Background Job Management System for Long-Running Tasks
 */

export interface ProcessingJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: {
    completed: number
    total: number
    currentBatch?: number
    percentage: number
  }
  results: any[]
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  transcriptText?: string
  estimatedTimeRemaining?: string
}

class JobManager {
  private jobs = new Map<string, ProcessingJob>()
  private readonly JOB_CLEANUP_TIME = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Create a new background processing job
   */
  createJob(transcriptText: string, jobId?: string): string {
    const id = jobId || this.generateJobId()
    
    const job: ProcessingJob = {
      id,
      status: 'pending',
      progress: {
        completed: 0,
        total: 0,
        percentage: 0
      },
      results: [],
      createdAt: new Date(),
      transcriptText
    }

    this.jobs.set(id, job)
    console.log(`📋 Created background job: ${id}`)
    
    // Start processing immediately in background
    this.processInBackground(id).catch(error => {
      console.error(`❌ Background job ${id} failed:`, error)
      this.updateJobStatus(id, 'failed', undefined, error.message)
    })

    return id
  }

  /**
   * Get job status and results
   */
  getJob(jobId: string): ProcessingJob | null {
    const job = this.jobs.get(jobId)
    if (!job) return null

    // Calculate estimated time remaining
    if (job.status === 'processing' && job.progress.total > 0) {
      const elapsed = job.startedAt ? Date.now() - job.startedAt.getTime() : 0
      const avgTimePerBatch = elapsed / Math.max(job.progress.completed, 1)
      const remaining = (job.progress.total - job.progress.completed) * avgTimePerBatch
      job.estimatedTimeRemaining = this.formatDuration(remaining)
    }

    return { ...job } // Return copy to prevent mutations
  }

  /**
   * Update job status
   */
  updateJobStatus(
    jobId: string, 
    status: ProcessingJob['status'], 
    progress?: Partial<ProcessingJob['progress']>,
    error?: string
  ): void {
    const job = this.jobs.get(jobId)
    if (!job) return

    job.status = status
    if (progress) {
      job.progress = { ...job.progress, ...progress }
      job.progress.percentage = Math.round((job.progress.completed / Math.max(job.progress.total, 1)) * 100)
    }
    if (error) job.error = error
    if (status === 'processing' && !job.startedAt) job.startedAt = new Date()
    if (status === 'completed' || status === 'failed') job.completedAt = new Date()

    console.log(`📊 Job ${jobId} status: ${status} (${job.progress.percentage}%)`)
  }

  /**
   * Add results to job
   */
  addJobResults(jobId: string, results: any[]): void {
    const job = this.jobs.get(jobId)
    if (!job) return

    job.results.push(...results)
  }

  /**
   * Background processing logic
   */
  private async processInBackground(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job || !job.transcriptText) return

    try {
      this.updateJobStatus(jobId, 'processing')

      // Split into sentences and chunks
      const sentences = this.splitIntoSentences(job.transcriptText)
      const chunks = this.createChunks(sentences, 25)
      
      this.updateJobStatus(jobId, 'processing', {
        total: chunks.length,
        completed: 0
      })

      console.log(`🚀 Starting background processing for job ${jobId}`)
      console.log(`   • Total sentences: ${sentences.length}`)
      console.log(`   • Total chunks: ${chunks.length}`)

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📝 Job ${jobId}: Processing chunk ${i + 1}/${chunks.length}`)

        try {
          const chunkResults = await this.processChunk(
            chunks[i], 
            i * 25, 
            sentences.length
          )

          this.addJobResults(jobId, chunkResults)
          this.updateJobStatus(jobId, 'processing', {
            completed: i + 1,
            currentBatch: i + 1
          })

          // Rate limiting between chunks
          if (i < chunks.length - 1) {
            console.log(`⏳ Job ${jobId}: Waiting 2s before next chunk...`)
            await this.sleep(2000)
          }

        } catch (chunkError) {
          console.error(`❌ Job ${jobId} chunk ${i + 1} failed:`, chunkError)
          
          // For now, continue with other chunks rather than failing entire job
          // In production, you might want different error handling strategies
          this.updateJobStatus(jobId, 'processing', {
            completed: i + 1,
            currentBatch: i + 1
          })
        }
      }

      console.log(`✅ Job ${jobId} completed successfully`)
      this.updateJobStatus(jobId, 'completed')

    } catch (error) {
      console.error(`💥 Job ${jobId} failed completely:`, error)
      this.updateJobStatus(jobId, 'failed', undefined, 
        error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Process a single chunk (same logic as original API)
   */
  private async processChunk(
    chunkSentences: string[], 
    startIndex: number, 
    totalSentences: number
  ): Promise<any[]> {
    // Import OpenAI dynamically to avoid issues
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `You are an expert medical spa consultation analyzer. Classify each sentence from this transcript chunk into one of the 7 tracker categories or mark as "none" if it doesn't fit any category.

TRANSCRIPT SENTENCES:
${chunkSentences.map((sentence, index) => `[${startIndex + index}] ${sentence}`).join('\n')}

TRACKER CATEGORIES:
**1. INTRODUCTION** - Professional greeting, name introductions, welcoming patient, role clarification, setting expectations
**2. RAPPORT-BUILDING** - Building personal connection, comfort checks, showing care, making patient feel at ease  
**3. LISTENING-TO-CONCERNS** - Patient expressing actual concerns, objections, fears, worries that need addressing
**4. OVERALL-ASSESSMENT** - Comprehensive evaluation of multiple areas, holistic approach, big-picture analysis
**5. TREATMENT-PLAN** - Specific recommendations, treatment explanations, procedure options, dosage discussions
**6. PRICING-QUESTIONS** - Cost discussions, budget conversations, payment options, investment explanations
**7. FOLLOW-UP-BOOKING** - Scheduling future appointments, next steps, continuity planning

INSTRUCTIONS:
1. Classify each sentence by its index number
2. Assign ONE tracker category or "none"
3. Provide confidence score (0.0-1.0)

RESPONSE FORMAT (JSON):
{
  "classifications": [
    {
      "sentenceIndex": ${startIndex},
      "sentence": "exact sentence text",
      "tracker": "introduction",
      "confidence": 0.95
    }
  ]
}

Classify all sentences now:`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert medical consultation analyzer. Classify each sentence into tracker categories with high accuracy. Always respond with valid JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })

    const rawContent = response.choices[0].message.content
    let result

    try {
      result = JSON.parse(rawContent || '{}')
    } catch (parseError) {
      console.error('❌ JSON Parse Error for chunk:', parseError)
      result = { classifications: [] }
    }

    return this.processClassifications(result.classifications || [], chunkSentences, startIndex, totalSentences)
  }

  /**
   * Utility methods
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .map(s => s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : s + '.')
  }

  private createChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private processClassifications(classifications: any[], sentences: string[], startIndex: number, totalSentences: number) {
    const processedTranscript: any[] = []
    
    classifications.forEach((classification, index) => {
      const sentence = classification.sentence || sentences[classification.sentenceIndex - startIndex] || sentences[index]
      
      if (!sentence) return
      
      const actualIndex = classification.sentenceIndex || (startIndex + index)
      const approximateStart = Math.floor((actualIndex / totalSentences) * 300)
      const approximateEnd = Math.floor(((actualIndex + 1) / totalSentences) * 300)
      
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }

      processedTranscript.push({
        confidence: classification.confidence || 0.8,
        end: approximateEnd * 1000,
        start: approximateStart * 1000,
        text: sentence,
        timestamp: formatTime(approximateStart),
        tracker: classification.tracker === "none" ? "none" : classification.tracker
      })
    })
    
    return processedTranscript
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clean up old completed jobs
   */
  cleanup(): void {
    const now = Date.now()
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && (now - job.completedAt.getTime()) > this.JOB_CLEANUP_TIME) {
        this.jobs.delete(jobId)
        console.log(`🗑️ Cleaned up old job: ${jobId}`)
      }
    }
  }
}

// Global singleton instance
export const jobManager = new JobManager()

// Cleanup old jobs every hour
setInterval(() => jobManager.cleanup(), 60 * 60 * 1000)