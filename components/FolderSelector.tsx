"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Folder, Plus } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { getFirebaseDb } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { toast } from "react-hot-toast"

interface FolderSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectFolder: (folderId: string, folderName: string) => void
  position?: { top: number; left: number }
}

export default function FolderSelector({ 
  isOpen, 
  onClose, 
  onSelectFolder,
  position = { top: 0, left: 0 }
}: FolderSelectorProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch user's tags from Firestore
  useEffect(() => {
    const fetchTags = async () => {
      if (!user?.email || !isOpen) return
      
      setLoading(true)
      try {
        const db = getFirebaseDb()
        const tagsDocRef = doc(db, 'tags', user.email)
        const tagsDoc = await getDoc(tagsDocRef)
        
        if (tagsDoc.exists()) {
          const data = tagsDoc.data()
          setTags(data.tags || [])
        } else {
          // Create default tags document if it doesn't exist
          const defaultTags = ['Work', 'Personal', 'Team', 'Important']
          await setDoc(tagsDocRef, { tags: defaultTags })
          setTags(defaultTags)
        }
      } catch (error) {
        // console.error('Error fetching tags:', error)
        toast.error('Failed to load folders')
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [user?.email, isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const filteredTags = tags.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !user?.email) return
    
    const tagName = newTagName.trim()
    
    // Check if tag already exists
    if (tags.includes(tagName)) {
      toast.error('Folder already exists')
      return
    }

    try {
      const db = getFirebaseDb()
      const tagsDocRef = doc(db, 'tags', user.email)
      
      // Add new tag to Firestore
      await updateDoc(tagsDocRef, {
        tags: arrayUnion(tagName)
      })
      
      // Update local state
      setTags(prev => [...prev, tagName])
      setNewTagName("")
      setIsCreatingTag(false)
      toast.success(`Folder "${tagName}" created`)
    } catch (error) {
      // console.error('Error creating tag:', error)
      toast.error('Failed to create folder')
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-64 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      ref={popupRef}
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search folders"
            className="pl-8 h-9 bg-gray-50 dark:bg-gray-700 border-0 focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="max-h-60 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            Loading folders...
          </div>
        ) : filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <button
              key={tag}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => onSelectFolder(tag, tag)}
            >
              <Folder className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="truncate">{tag}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No folders found' : 'No folders yet'}
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        {isCreatingTag ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Folder name"
              className="h-8 text-sm flex-1"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateTag()
                } else if (e.key === 'Escape') {
                  setIsCreatingTag(false)
                  setNewTagName("")
                }
              }}
            />
            <Button 
              size="sm" 
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
            >
              Add
            </Button>
          </div>
        ) : (
          <button
            className="w-full flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 rounded"
            onClick={() => setIsCreatingTag(true)}
          >
            <Plus className="h-4 w-4" />
            <span>New folder</span>
          </button>
        )}
      </div>
    </div>
  )
}
