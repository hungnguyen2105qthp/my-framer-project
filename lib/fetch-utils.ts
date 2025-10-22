/**
 * Utility functions for robust API calls with timeout and retry logic
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
}

export interface FetchOptions extends RequestInit {
  timeout?: number
}

/**
 * Fetch with configurable timeout
 */
export async function fetchWithTimeout(
  url: string, 
  options: FetchOptions = {}, 
  timeoutMs: number = 60000
): Promise<Response> {
  const { timeout, ...fetchOptions } = options
  const actualTimeout = timeout || timeoutMs

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), actualTimeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${actualTimeout}ms`)
    }
    throw error
  }
}

/**
 * Retry function with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        console.log(`❌ Final retry attempt ${attempt} failed:`, lastError.message)
        throw lastError
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      )
      const jitter = Math.random() * 1000 // Add up to 1 second of jitter
      const delay = exponentialDelay + jitter

      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, lastError.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Robust fetch with timeout and retry logic
 */
export async function robustFetch(
  url: string,
  options: FetchOptions = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { timeout = 600000, ...fetchOptions } = options // Default 10 minute timeout

  return retryWithBackoff(async () => {
    console.log(`🌐 Making robust fetch request to: ${url}`)
    console.log(`   • Timeout: ${timeout}ms`)
    console.log(`   • Method: ${fetchOptions.method || 'GET'}`)
    
    const response = await fetchWithTimeout(url, fetchOptions, timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response
  }, {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    ...retryOptions
  })
}

/**
 * Sleep utility for rate limiting
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}