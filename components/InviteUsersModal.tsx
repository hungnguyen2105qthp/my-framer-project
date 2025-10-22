"use client"

import { useState, useEffect } from "react"
import { X, Search, UserPlus, Mail, ChevronDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, setDoc, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { getUserDisplayName, isUserDataEncrypted } from "@/lib/decryption-utils"

interface AuthorizedUser {
  id: string
  email: string
  status?: "nurse" | "admin" | "founder"
}

interface TranscriptUser {
  uid: string
  displayName: string
  email?: string
  encryptedUserData?: any
}

interface SelectedUserWithRole extends TranscriptUser {
  selectedRole: "nurse" | "admin" | "founder"
}

interface InviteUsersModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteUsersModal({ isOpen, onClose }: InviteUsersModalProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<SelectedUserWithRole[]>([])
  const [selectedStatus, setSelectedStatus] = useState<"nurse" | "admin" | "founder">("nurse")
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([])
  const [transcriptUsers, setTranscriptUsers] = useState<TranscriptUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<TranscriptUser[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTranscripts, setLoadingTranscripts] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, userId: string, userEmail: string} | null>(null)
  const [currentUserStatus, setCurrentUserStatus] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<{userId: string, currentStatus: string} | null>(null)
  const [selectedNewStatus, setSelectedNewStatus] = useState<"nurse" | "admin" | "founder">("nurse")
  const [showUserList, setShowUserList] = useState(true)

  // Load authorized users and current user status when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAuthorizedUsers()
      loadCurrentUserStatus()
      loadTranscriptUsers()
    }
  }, [isOpen, user])

  // Filter users based on search query and exclude already authorized users
  useEffect(() => {
    // First filter out users who are already authorized
    const authorizedEmails = new Set(authorizedUsers.map(user => user.email.toLowerCase()))
    const availableUsers = transcriptUsers.filter(user => 
      !authorizedEmails.has(user.email.toLowerCase())
    )
    
    if (!searchQuery.trim()) {
      setFilteredUsers(availableUsers)
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = availableUsers.filter(user => {
      const userEmail = user.email.toLowerCase()
      const userName = user.displayName.toLowerCase()
      
      // Check if query matches email patterns
      const emailStartsWith = userEmail.startsWith(query)
      const emailContains = userEmail.includes(query)
      
      // Check if query matches name patterns
      const nameStartsWith = userName.startsWith(query)
      const nameContains = userName.includes(query)
      
      // Split name into parts for partial matching (e.g., "jmcc" should match "Jennifer McCleary")
      const nameParts = userName.split(' ')
      const namePartsMatch = nameParts.some(part => part.startsWith(query))
      
      // Check for first letter combinations (e.g., "jmcc" for "Jennifer McCleary")
      const nameInitials = nameParts.map(part => part.charAt(0)).join('')
      const initialsMatch = nameInitials.includes(query)
      
      return emailStartsWith || emailContains || nameStartsWith || nameContains || namePartsMatch || initialsMatch
    })
    
    // Sort filtered results with priority order
    filtered.sort((a, b) => {
      const aEmail = a.email.toLowerCase()
      const bEmail = b.email.toLowerCase()
      const aName = a.displayName.toLowerCase()
      const bName = b.displayName.toLowerCase()
      
      // Priority 1: Exact email starts with query
      const aEmailStartsWith = aEmail.startsWith(query)
      const bEmailStartsWith = bEmail.startsWith(query)
      if (aEmailStartsWith && !bEmailStartsWith) return -1
      if (!aEmailStartsWith && bEmailStartsWith) return 1
      
      // Priority 2: Exact name starts with query  
      const aNameStartsWith = aName.startsWith(query)
      const bNameStartsWith = bName.startsWith(query)
      if (aNameStartsWith && !bNameStartsWith) return -1
      if (!aNameStartsWith && bNameStartsWith) return 1
      
      // Priority 3: Email contains query
      const aEmailContains = aEmail.includes(query)
      const bEmailContains = bEmail.includes(query)
      if (aEmailContains && !bEmailContains) return -1
      if (!aEmailContains && bEmailContains) return 1
      
      return 0
    })
    
    setFilteredUsers(filtered)
  }, [searchQuery, transcriptUsers, authorizedUsers])

  // Show available users (excluding already authorized) when transcript users are loaded
  useEffect(() => {
    if (transcriptUsers.length > 0) {
      const authorizedEmails = new Set(authorizedUsers.map(user => user.email.toLowerCase()))
      const availableUsers = transcriptUsers.filter(user => 
        !authorizedEmails.has(user.email.toLowerCase())
      )
      setFilteredUsers(availableUsers)
      setShowUserList(true)
    }
  }, [transcriptUsers, authorizedUsers])

  const loadCurrentUserStatus = async () => {
    if (!user?.email) return
    
    try {
      const userDocRef = doc(db, 'authorizedUsers', user.email.toLowerCase())
      const userSnap = await getDoc(userDocRef)
      
      if (userSnap.exists()) {
        setCurrentUserStatus(userSnap.data().status || null)
      }
    } catch (error) {
      console.error('Error loading current user status:', error)
    }
  }

  // Load transcript users using the same approach as activity page
  const loadTranscriptUsers = async () => {
    try {
      setLoadingTranscripts(true)
      
      // Use the same API approach as activity page
      const chainId = 'Revive' // Default chain - you might want to make this dynamic
      
      console.log('🚀 [INVITE] Loading documents from API for chainId:', chainId)
      const documentsResponse = await fetch(`/api/get-all-location-documents?chainId=${encodeURIComponent(chainId)}`)
      
      if (!documentsResponse.ok) {
        console.error('❌ [INVITE] Failed to get documents from API:', documentsResponse.status)
        throw new Error('Failed to fetch location documents')
      }
      
      const documentsData = await documentsResponse.json()
      console.log('📊 [INVITE] Documents API response:', documentsData)
      
      if (!documentsData.success || !documentsData.documents) {
        console.error('❌ [INVITE] Invalid documents data from API:', documentsData)
        throw new Error('Invalid documents data')
      }
      
      const documentIds = documentsData.documents
      console.log('📄 [INVITE] Found', documentIds.length, 'document IDs')
      
      const users: TranscriptUser[] = []
      const processedUserIds = new Set<string>()
      
      // Process each document ID - same logic as activity page
      for (const documentId of documentIds) {
        if (!documentId || processedUserIds.has(documentId)) continue
        processedUserIds.add(documentId)
        
        try {
          // Fetch transcript document
          const transcriptDocRef = doc(db, 'transcript', documentId)
          const transcriptDoc = await getDoc(transcriptDocRef)
          
          if (transcriptDoc.exists()) {
            const transcriptData = transcriptDoc.data()
            let displayName = ''
            
            // Use the same decryption approach as activity page
            const fallbackEmail = `${documentId.substring(0, 8)}@device.local`
            
            if (transcriptData.encryptedUserData && isUserDataEncrypted(transcriptData.encryptedUserData)) {
              try {
                const decryptedName = await Promise.race([
                  getUserDisplayName(fallbackEmail, transcriptData.encryptedUserData),
                  new Promise<string>((_, reject) => 
                    setTimeout(() => reject(new Error('Decryption timeout')), 3000)
                  )
                ]).catch(() => {
                  console.warn(`⚠️ Decryption failed for ${documentId}, using fallback`)
                  return fallbackEmail
                })
                
                if (decryptedName && decryptedName !== fallbackEmail && decryptedName !== 'Unknown User' && decryptedName.trim() !== '') {
                  displayName = decryptedName
                  console.log(`✅ Decrypted name for ${documentId}: ${displayName}`)
                }
              } catch (error) {
                console.error(`❌ Error decrypting ${documentId}:`, error)
              }
            } else if (transcriptData.userEmail) {
              displayName = transcriptData.userEmail
              console.log(`📧 Using userEmail for ${documentId}: ${displayName}`)
            } else if (transcriptData.name) {
              displayName = transcriptData.name
              console.log(`📝 Using name for ${documentId}: ${displayName}`)
            }
            
            // Get email - try actual email first, then UID mapping
            const email = transcriptData.userEmail || await getEmailFromUID(documentId)
            
            if (email) {
              // Store user data with email
              users.push({
                uid: documentId,
                displayName,
                email: email,
                encryptedUserData: transcriptData.encryptedUserData
              })
              console.log(`✅ Added user: ${displayName} (${email})`)
            } else {
              console.log(`⚠️ No email found for ${documentId}, skipping`)
            }
          } else {
            console.log(`⚠️ Document ${documentId} does not exist`)
          }
        } catch (error) {
          console.error(`❌ Error processing document ${documentId}:`, error)
        }
      }
      
      // Set users directly since we already have emails
      console.log('✅ [INVITE] Loaded', users.length, 'users with emails:', users.map(u => `${u.displayName} (${u.email})`)) 
      setTranscriptUsers(users)
      
    } catch (error) {
      console.error('Error loading transcript users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoadingTranscripts(false)
    }
  }

  // Get email from UID - now using API endpoint for accurate mapping
  const getEmailFromUID = async (uid: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/get-user-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uids: [uid] })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.emailMap && data.emailMap[uid]) {
          return data.emailMap[uid]
        }
      }
    } catch (error) {
      console.error(`Error fetching email for UID ${uid}:`, error)
    }
    
    // Fallback mapping for known UIDs
    const knownUIDs: Record<string, string> = {
      'HswPjCmMxIcs7SqlPDpDEHCRrJX2': 'rohan@7xlabs.com',
      'Gawp9tuM3lN41q4YkRhgbG3Nacs1': 'poonampradeepyadav999@gmail.com', 
      'nF0l7mfoxMZPCLYJvcb1er1oC': 'vasanth7781@gmail.com'
    }
    
    return knownUIDs[uid] || null
  }

  const loadAuthorizedUsers = async () => {
    try {
      setLoading(true)
      const authorizedUsersRef = collection(db, 'authorizedUsers')
      const snapshot = await getDocs(authorizedUsersRef)
      
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        status: doc.data().status || "nurse"
      }))
      
      // Remove duplicates by email (keep the first occurrence)
      const uniqueUsers = users.filter((user, index, self) => 
        index === self.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase())
      )
      
      console.log('📋 [INVITE] Loaded authorized users:', uniqueUsers.length, 'unique users from', users.length, 'documents')
      setAuthorizedUsers(uniqueUsers)
    } catch (error) {
      console.error('Error loading authorized users:', error)
      toast.error('Failed to load authorized users')
    } finally {
      setLoading(false)
    }
  }

  // Check if search query is a valid email that's not in the list
  const isValidDirectEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleInvite = async () => {
    const directEmail = searchQuery.trim()
    const hasSelectedUsers = selectedUsers.length > 0
    const hasValidDirectEmail = isValidDirectEmail(directEmail)
    
    if (!hasSelectedUsers && !hasValidDirectEmail) {
      toast.error('Please select users from the list or enter a valid email address')
      return
    }
    
    if (!hasSelectedUsers && hasValidDirectEmail) {
      // Check if email is already authorized
      const isAlreadyAuthorized = authorizedUsers.some(user => 
        user.email.toLowerCase() === directEmail.toLowerCase()
      )
      
      if (isAlreadyAuthorized) {
        toast.error('This user is already authorized')
        return
      }
    }

    try {
      setIsInviting(true)
      
      // Prepare users to invite (either selected users or direct email input)
      const usersToInvite: SelectedUserWithRole[] = []
      
      // Add selected users
      if (hasSelectedUsers) {
        usersToInvite.push(...selectedUsers)
      }
      
      // Add direct email input as a user
      if (hasValidDirectEmail && !hasSelectedUsers) {
        usersToInvite.push({
          uid: directEmail,
          displayName: directEmail.split('@')[0], // Use part before @ as name
          email: directEmail,
          selectedRole: selectedStatus // Use the global selected role
        })
      }
      
      const invitePromises = usersToInvite.map(async (selectedUser) => {
        const emailLower = selectedUser.email.toLowerCase()
        const userDocRef = doc(db, 'authorizedUsers', emailLower)
        
        // Prevent admins from inviting as founder
        const roleToAssign = isAdmin && selectedUser.selectedRole === 'founder' 
          ? 'admin' 
          : selectedUser.selectedRole
        
        // Set the document with email as the ID and email field
        await setDoc(userDocRef, {
          email: selectedUser.email,
          status: roleToAssign, // Use validated role
          invitedAt: new Date(),
          invitedBy: user?.email || 'unknown'
        })
        
        // Send invitation email via Brevo
        try {
          console.log(`📧 [FRONTEND] Sending email to: ${selectedUser.email}`)
          
          const emailResponse = await fetch('/api/send-invitation-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: selectedUser.email,
              invitedBy: user?.email || 'unknown'
            })
          })
          
          console.log(`📡 [FRONTEND] Email API response status: ${emailResponse.status}`)
          
          const emailResult = await emailResponse.json()
          console.log(`📤 [FRONTEND] Email API result:`, emailResult)
          
          if (!emailResult.success) {
            console.warn(`⚠️ [FRONTEND] Failed to send email to ${selectedUser.email}:`)
            console.warn('- Message:', emailResult.message)
            console.warn('- Error:', emailResult.error)
            console.warn('- Status:', emailResult.status)
            // Show user-friendly error
            toast.error(`Failed to send email to ${selectedUser.email}: ${emailResult.message}`)
          } else {
            console.log(`✅ [FRONTEND] Email sent successfully to ${selectedUser.email}`)
            console.log('- Message ID:', emailResult.messageId)
          }
        } catch (emailError) {
          console.error(`❌ [FRONTEND] Network error sending email to ${selectedUser.email}:`, emailError)
          toast.error(`Network error sending email to ${selectedUser.email}`)
        }
      })
      
      // Wait for all invites to complete
      await Promise.all(invitePromises)

      const userNames = usersToInvite.map(u => `${u.displayName} (${u.selectedRole})`).join(', ')
      const userCount = usersToInvite.length
      toast.success(`Successfully invited ${userCount} user${userCount > 1 ? 's' : ''}: ${userNames}. Invitation emails have been sent.`)
      
      // Reset form
      setSearchQuery("")
      setSelectedUsers([])
      setSelectedStatus("nurse")
      
      // Reload the authorized users list
      await loadAuthorizedUsers()
    } catch (error) {
      console.error('Error inviting users:', error)
      toast.error('Failed to invite some users. They may already be authorized.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleUserSelect = (user: TranscriptUser) => {
    // Toggle user selection
    const isAlreadySelected = selectedUsers.some(u => u.uid === user.uid)
    
    if (isAlreadySelected) {
      setSelectedUsers(prev => prev.filter(u => u.uid !== user.uid))
    } else {
      // Add user with current selected role as default
      const userWithRole: SelectedUserWithRole = {
        ...user,
        selectedRole: selectedStatus // Use current selected role as default
      }
      setSelectedUsers(prev => [...prev, userWithRole])
    }
    
    // Don't clear search query to allow multiple selections
  }
  
  const removeSelectedUser = (user: SelectedUserWithRole) => {
    setSelectedUsers(prev => prev.filter(u => u.uid !== user.uid))
  }

  const updateUserRole = (userUid: string, role: "nurse" | "admin" | "founder") => {
    setSelectedUsers(prev => 
      prev.map(user => 
        user.uid === userUid ? { ...user, selectedRole: role } : user
      )
    )
  }

  const applyRoleToAllSelected = (role: "nurse" | "admin" | "founder") => {
    setSelectedUsers(prev => 
      prev.map(user => ({ ...user, selectedRole: role }))
    )
    setSelectedStatus(role)
  }

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    // Show confirmation dialog first
    setDeleteConfirmation({ show: true, userId, userEmail })
  }

  const confirmDeleteUser = async () => {
    if (!deleteConfirmation) return
    
    try {
      await deleteDoc(doc(db, 'authorizedUsers', deleteConfirmation.userId))
      toast.success(`Removed ${deleteConfirmation.userEmail} from authorized users`)
      await loadAuthorizedUsers()
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error('Failed to remove user')
    } finally {
      setDeleteConfirmation(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmation(null)
  }

  const handleEditUserStatus = (userId: string, currentStatus: string) => {
    setEditingUser({ userId, currentStatus })
    // If admin is trying to edit a founder, default to admin instead
    if (isAdmin && currentStatus === 'founder') {
      setSelectedNewStatus('admin')
    } else {
      setSelectedNewStatus(currentStatus as "nurse" | "admin" | "founder")
    }
  }

  const saveUserStatus = async () => {
    if (!editingUser) return
    
    // Prevent admins from setting founder status
    if (isAdmin && selectedNewStatus === 'founder') {
      toast.error('Admins cannot assign Founder role')
      return
    }
    
    try {
      const userDocRef = doc(db, 'authorizedUsers', editingUser.userId)
      await setDoc(userDocRef, { status: selectedNewStatus }, { merge: true })
      
      toast.success(`User role updated to ${selectedNewStatus} successfully`)
      setEditingUser(null)
      await loadAuthorizedUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const cancelEditStatus = () => {
    setEditingUser(null)
  }

  const isFounder = currentUserStatus === 'founder'
  const isAdmin = currentUserStatus === 'admin'
  const canEditRoles = isFounder || isAdmin

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Share</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search Input and Role Selector Row */}
          <div className="space-y-2">
            <div className="flex space-x-3">
              {/* Search Input - Left Side */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                  }}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && (selectedUsers.length > 0 || isValidDirectEmail(searchQuery.trim())) && handleInvite()}
                />
              </div>
              
              {/* Role Selector - Right Side */}
              <div className="w-40">
                <Select 
                  value={selectedStatus} 
                  onValueChange={(role) => {
                    setSelectedStatus(role as "nurse" | "admin" | "founder")
                    // Apply to all selected users
                    applyRoleToAllSelected(role as "nurse" | "admin" | "founder")
                  }}
                  disabled={!canEditRoles}
                >
                  <SelectTrigger className={!canEditRoles ? "opacity-75" : ""}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {/* Only founders can assign Founder role */}
                    {isFounder && <SelectItem value="founder">Founder</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Selected Users Display with Individual Role Selectors */}
            {selectedUsers.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Selected Users ({selectedUsers.length})</label>
                <div className="space-y-2">
                  {selectedUsers.map((user) => (
                    <div key={user.uid} className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{user.displayName || '\u00A0'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Individual Role Selector (show for founders and admins) */}
                        {canEditRoles && (
                          <Select 
                            value={user.selectedRole} 
                            onValueChange={(role) => updateUserRole(user.uid, role as "nurse" | "admin" | "founder")}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nurse">Nurse</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              {/* Only founders can assign Founder role */}
                              {isFounder && <SelectItem value="founder">Founder</SelectItem>}
                            </SelectContent>
                          </Select>
                        )}
                        {/* Show role as text for users who cannot edit roles */}
                        {!canEditRoles && (
                          <span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded">
                            {user.selectedRole}
                          </span>
                        )}
                        <button
                          onClick={() => removeSelectedUser(user)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* User Selection List - Always Visible */}
            {transcriptUsers.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Select Users</label>
                <Card className="border border-border max-h-64 overflow-y-auto">
                  <CardContent className="p-0">
                    {loadingTranscripts ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        Loading users...
                      </div>
                    ) : filteredUsers.length === 0 && searchQuery.trim() ? (
                      // Only show "no users found" if there's a search query and no results
                      // If no search query, just don't show anything (all users are filtered out or already authorized)
                      null
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const isSelected = selectedUsers.some(u => u.uid === user.uid)
                        return (
                          <div
                            key={user.uid}
                            className={`flex items-center space-x-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 ${
                              isSelected ? 'bg-primary/10 border-primary' : ''
                            }`}
                            onClick={() => handleUserSelect(user)}
                          >
                            <div className={`h-4 w-4 border-2 rounded flex items-center justify-center ${
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`}>
                              {isSelected && <div className="h-2 w-2 bg-white rounded-full"></div>}
                            </div>
                            <User className={`h-4 w-4 ${
                              isSelected ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${
                                isSelected ? 'text-primary' : 'text-foreground'
                              }`}>
                                {user.displayName || '\u00A0'}
                              </div>
                              {user.email && (
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Role selector moved to top row next to search input */}
            
            <Button
              onClick={handleInvite}
              disabled={isInviting || (selectedUsers.length === 0 && !isValidDirectEmail(searchQuery.trim()))}
              className="w-full"
            >
              {isInviting ? 'Inviting...' : 'Invite'}
            </Button>
          </div>

          {/* Authorized Users List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Authorized Users</h3>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading users...
              </div>
            ) : authorizedUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No authorized users yet
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {authorizedUsers.map((authorizedUser) => (
                  <Card key={authorizedUser.id} className="border border-border">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="text-sm text-foreground">{authorizedUser.email}</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-muted-foreground capitalize">
                              {authorizedUser.status || 'nurse'}
                            </span>
                            {/* Show edit button based on user permissions - prevent users from editing their own status */}
                            {(isFounder || (isAdmin && authorizedUser.status !== 'founder')) && 
                             authorizedUser.email.toLowerCase() !== user?.email?.toLowerCase() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUserStatus(authorizedUser.id, authorizedUser.status || 'nurse')}
                                className="h-4 px-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(authorizedUser.id, authorizedUser.email)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Confirm Delete</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to remove <span className="font-medium text-foreground">{deleteConfirmation.userEmail}</span> from authorized users?
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteUser}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Dialog */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Change User Role</h3>
            <p className="text-muted-foreground mb-4">
              Current role: <span className="font-medium capitalize">{editingUser.currentStatus}</span>
            </p>
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-foreground">Select new role:</label>
              {["nurse", "admin", ...(isFounder ? ["founder"] : [])].map((status) => (
                <label key={status} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="userRole"
                    value={status}
                    checked={selectedNewStatus === status}
                    onChange={(e) => setSelectedNewStatus(e.target.value as "nurse" | "admin" | "founder")}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm capitalize">{status}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={cancelEditStatus}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveUserStatus}
                disabled={selectedNewStatus === editingUser.currentStatus}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
