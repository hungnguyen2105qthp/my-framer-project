"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { MessageCircle, Copy, Mail, Link2, Share2, MessageSquare } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface MeetingSidePanelProps {
  meeting: {
    id: string
    title: string
    timestamp: number
    emoji: string
  }
  onClose?: () => void
}

export function MeetingSidePanel({ meeting, onClose }: MeetingSidePanelProps) {
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copied, setCopied] = useState(false)

  const suggestions = [
    'List action items',
    'Summarize key points',
    'Extract decisions'
  ]

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleEmail = () => {
    const subject = `Notes: ${meeting.title}`;
    const body = `Here are my notes from our meeting:\n\n${notes}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const handleSlack = () => {
    // This would typically open a Slack share dialog
    // For now, we'll just log it
    // console.log('Sharing to Slack:', notes);
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      // console.log('Sending message:', message)
      setMessage('')
    }
  }

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Meeting Notes</h3>
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <span className="sr-only">Close panel</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Share Notes</h4>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                  onClick={() => setShowShareOptions(!showShareOptions)}
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                {showShareOptions && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleCopyLink}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Link
                    </button>
                    <button
                      onClick={handleCopyText}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                    <button
                      onClick={handleEmail}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </button>
                    <button
                      onClick={handleSlack}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Slack
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Textarea
              placeholder="Add your meeting notes here..."
              className="min-h-[120px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Ask Wisp</h4>
            <div className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <Button 
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {/* Chat messages will appear here */}
        <div className="text-sm text-muted-foreground text-center py-8">
          Messages about this meeting will appear here
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Message Wisp..."
            className="min-h-[40px] max-h-32 resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            size="icon" 
            className="h-10 w-10 flex-shrink-0"
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
