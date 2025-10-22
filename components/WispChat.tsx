"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "./ui/button"
import { Send, X, Bot, User as UserIcon } from 'lucide-react'
import { Textarea } from "./ui/textarea"

export default function WispChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSendMessage = () => {
    if (message.trim() === '') return
    
    // Add user message
    const userMessage = { text: message, isUser: true }
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    
    // Simulate bot response
    setTimeout(() => {
      const botResponses = [
        "I'm analyzing your meeting notes now. What would you like to know?",
        "I found some key action items from this meeting. Would you like me to list them?",
        "I can help summarize this meeting or find specific information. What do you need?",
        "Would you like me to generate a follow-up email based on this meeting?"
      ]
      const botMessage = {
        text: botResponses[Math.floor(Math.random() * botResponses.length)],
        isUser: false
      }
      setMessages(prev => [...prev, botMessage])
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) {
    return (
      <div className="fixed bottom-8 right-8 z-50">
        <div className="relative">
        <Button 
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
          {/* X button in top right of floating button */}
          <button
            aria-label="Close chat"
            className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 shadow hover:bg-gray-100"
            style={{ display: isOpen ? 'none' : 'block' }}
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3 text-gray-500" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 w-96">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col h-[600px] relative">
        {/* X button in top right of chat window */}
        <button
          aria-label="Close chat"
          className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full p-1 shadow hover:bg-gray-100 z-10"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-xl">
          <div className="flex items-center">
            <Bot className="h-5 w-5 mr-2 text-blue-600" />
            <h3 className="font-medium">Wisp AI Assistant</h3>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400">
              <Bot className="h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="font-medium text-lg mb-2">How can I help you today?</h3>
              <p className="text-sm">Ask me anything about your meetings or notes.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="pr-12 resize-none"
              rows={1}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-1.5 h-8 w-8"
              disabled={message.trim() === ''}
              onClick={handleSendMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
