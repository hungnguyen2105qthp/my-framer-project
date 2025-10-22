// Utility functions for decrypting user data
// Note: This is a placeholder implementation. You'll need to implement actual decryption
// based on your encryption algorithm (AES-GCM-256)

interface EncryptedUserData {
  encryptedFirstName: string
  encryptedFullName: string
  encryptedLastName: string
  encryptionAlgorithm: string
  encryptionType: string
  encryptionVersion: string
}

interface DecryptedUserData {
  firstName: string
  lastName: string
  fullName: string
}

// Generate encryption key from user credentials using multiple approaches
async function generateEncryptionKey(userCredentials: string, method: 'sha256' | 'pbkdf2' | 'raw' = 'sha256'): Promise<CryptoKey> {
  // Check if we're in a browser environment with crypto.subtle
  if (typeof window === 'undefined' || !crypto?.subtle) {
    throw new Error('Crypto operations are only available in browser environment')
  }
  
  const encoder = new TextEncoder()
  
  if (method === 'raw') {
    // Try using the credential directly as a 32-byte key (pad or truncate)
    const keyData = encoder.encode(userCredentials)
    const paddedKey = new Uint8Array(32)
    paddedKey.set(keyData.slice(0, 32))
    
    return await crypto.subtle.importKey(
      'raw',
      paddedKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
  } else if (method === 'pbkdf2') {
    // Try PBKDF2 key derivation (common in many encryption implementations)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userCredentials),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('wisp-salt'), // Common salt
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
  } else {
    // Original SHA-256 approach
    const data = encoder.encode(userCredentials)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
  }
}

// Convert Base64 to ArrayBuffer with enhanced error handling
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof atob === 'undefined') {
    throw new Error('Base64 operations are only available in browser environment')
  }
  
  try {
    // Clean the base64 string (remove whitespace and padding issues)
    const cleanBase64 = base64.replace(/\s/g, '')
    const binaryString = atob(cleanBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  } catch (error) {
    console.error('Base64 decode error:', error)
    throw new Error(`Invalid Base64 string: ${base64.substring(0, 20)}...`)
  }
}

// Alternative Base64 decoding for URL-safe base64
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Convert base64url to standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  
  // Add padding if necessary
  while (base64.length % 4) {
    base64 += '='
  }
  
  return base64ToArrayBuffer(base64)
}

// Extract nonce and ciphertext from encrypted data - try multiple formats
function extractNonceAndCiphertext(encryptedData: ArrayBuffer, nonceLength: number = 12): { nonce: Uint8Array; ciphertext: ArrayBuffer } {
  // Try different nonce lengths (12 is standard for AES-GCM, but some implementations use 16)
  const nonce = new Uint8Array(encryptedData.slice(0, nonceLength))
  const ciphertext = encryptedData.slice(nonceLength)
  return { nonce, ciphertext }
}

// Alternative extraction for different formats
function extractNonceAndCiphertextAlternative(encryptedData: ArrayBuffer): { nonce: Uint8Array; ciphertext: ArrayBuffer } {
  // Some implementations put the nonce at the end
  const totalLength = encryptedData.byteLength
  if (totalLength < 12) {
    throw new Error('Encrypted data too short')
  }
  
  const nonce = new Uint8Array(encryptedData.slice(totalLength - 12))
  const ciphertext = encryptedData.slice(0, totalLength - 12)
  return { nonce, ciphertext }
}

// Decrypt a single encrypted field with multiple approaches
async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string | null> {
  try {
    // Try different base64 decodings
    const decodingMethods = [
      () => base64ToArrayBuffer(encryptedBase64),
      () => base64UrlToArrayBuffer(encryptedBase64)
    ]
    
    for (const decodeMethod of decodingMethods) {
      try {
        const encryptedData = decodeMethod()
        
        // Try multiple extraction methods and nonce lengths
        const extractionMethods = [
          () => extractNonceAndCiphertext(encryptedData, 12), // Standard 12-byte nonce at start
          () => extractNonceAndCiphertext(encryptedData, 16), // 16-byte nonce at start
          () => extractNonceAndCiphertextAlternative(encryptedData), // Nonce at end
        ]
        
        for (const extractMethod of extractionMethods) {
          try {
            const { nonce, ciphertext } = extractMethod()
            
            // Skip if ciphertext is too short
            if (ciphertext.byteLength < 1) {
              continue
            }
            
            // Try decryption with this nonce/ciphertext combination
            const decryptedBuffer = await crypto.subtle.decrypt(
              {
                name: 'AES-GCM',
                iv: nonce
              },
              key,
              ciphertext
            )
            
            // If successful, convert to string and return
            const decoder = new TextDecoder()
            const result = decoder.decode(decryptedBuffer)
            
            // Validate the result (should be printable text)
            if (result && result.length > 0 && /^[\x20-\x7E\s]*$/.test(result)) {
              return result
            }
            
          } catch (error) {
            // Continue to next extraction method
            continue
          }
        }
      } catch (error) {
        // Continue to next decoding method
        continue
      }
    }
    
    // If all methods failed, return null
    return null
    
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}

// Main decryption function with multiple key derivation attempts
export const decryptUserData = async (encryptedData: EncryptedUserData, userCredentials: string): Promise<DecryptedUserData> => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      //console.log('⚠️ Decryption attempted on server side, returning fallback values')
      return {
        firstName: "Unknown",
        lastName: "User",
        fullName: "Unknown User"
      }
    }
    
    // console.log('🔐 Attempting to decrypt user data with credentials:', userCredentials)
    // console.log('📄 Encrypted data:', encryptedData)
    
    // Try different key derivation methods
    const keyMethods: Array<'sha256' | 'pbkdf2' | 'raw'> = ['sha256', 'pbkdf2', 'raw']
    
    for (const method of keyMethods) {
      try {
        // Generate decryption key using this method
        const key = await generateEncryptionKey(userCredentials, method)
        
        // Try to decrypt each field
        const firstName = await decryptData(encryptedData.encryptedFirstName, key)
        const fullName = await decryptData(encryptedData.encryptedFullName, key)
        const lastName = await decryptData(encryptedData.encryptedLastName, key)
        
        // If we got at least one successful decryption, use this method
        if (firstName || fullName || lastName) {
          //console.log(`✅ Decryption successful with method: ${method}`)
          //console.log('✅ Decryption results:', { firstName, fullName, lastName })
          
          return {
            firstName: firstName || "Unknown",
            lastName: lastName || "User",
            fullName: fullName || `${firstName || "Unknown"} ${lastName || "User"}`
          }
        }
      } catch (error) {
        //console.log(`❌ Key method ${method} failed:`, error instanceof Error ? error.message : 'Unknown error')
        continue
      }
    }
    
    // If all methods failed
    // console.log('❌ All key derivation methods failed')
    return {
      firstName: "Unknown",
      lastName: "User",
      fullName: "Unknown User"
    }
  } catch (error) {
    console.error('❌ Error decrypting user data:', error)
    return {
      firstName: "Unknown",
      lastName: "User",
      fullName: "Unknown User"
    }
  }
}


// Get user display name (decrypted or fallback)
export const getUserDisplayName = async (userEmail: string, encryptedUserData?: any): Promise<string> => {
  if (!encryptedUserData) {
    return userEmail
  }
  
  // If we're on the server side, return email as fallback
  if (typeof window === 'undefined') {
    return userEmail
  }
  
  try {
    const decryptedData = await decryptUserData(encryptedUserData, userEmail)
    
    if (decryptedData.fullName && decryptedData.fullName !== "Unknown User") {
      return decryptedData.fullName
    }
    
    return userEmail
  } catch (error) {
    return userEmail
  }
}

// Check if user data is encrypted
export const isUserDataEncrypted = (userData: any): boolean => {
  return userData && 
         userData.encryptedFirstName && 
         userData.encryptedLastName && 
         userData.encryptionAlgorithm === "AES-GCM-256"
}

 