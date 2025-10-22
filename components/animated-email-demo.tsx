"use client"

import { useEffect, useState } from "react"

export function AnimatedEmailDemo() {
  const [emails, setEmails] = useState<Array<{
    id: number
    subject: string
    category: string
    color: string
    delay: number
    isVisible: boolean
    isCategorized: boolean
  }>>([])

  useEffect(() => {
    const emailData = [
      { id: 1, subject: "Can you review these project updates?", category: "1: needs response", color: "bg-red-500", delay: 1000 },
      { id: 2, subject: "Q3 Financial Report Attached", category: "2: for your info", color: "bg-orange-500", delay: 3000 },
      { id: 3, subject: "Are you available for a quick call?", category: "1: needs response", color: "bg-red-500", delay: 5000 },
      { id: 4, subject: "Team Offsite Photos from Last Friday", category: "2: for your info", color: "bg-orange-500", delay: 7000 },
      { id: 5, subject: "Your meeting has been rescheduled", category: "3: system alert", color: "bg-green-500", delay: 9000 },
      { id: 6, subject: "Meeting notes from yesterday", category: "4: meeting summary", color: "bg-green-400", delay: 11000 },
      { id: 7, subject: "Task completed as requested", category: "5: completed", color: "bg-purple-500", delay: 13000 },
      { id: 8, subject: "Special offer just for you!", category: "6: promotional", color: "bg-pink-500", delay: 15000 },
    ]

    // Initialize emails as invisible
    setEmails(emailData.map(email => ({ ...email, isVisible: false, isCategorized: false })))

    // Animate emails coming in
    emailData.forEach((email, index) => {
      setTimeout(() => {
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, isVisible: true } : e
        ))
      }, email.delay)

      // Categorize email after it appears
      setTimeout(() => {
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, isCategorized: true } : e
        ))
      }, email.delay + 1500)
    })
  }, [])

  const getCategoryCount = (category: string) => {
    return emails.filter(email => email.category === category && email.isCategorized).length
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm max-w-md mx-auto relative overflow-hidden">
      {/* Incoming email area */}
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none" />
      
      {/* Incoming emails */}
      {emails.map((email) => (
        <div
          key={email.id}
          className={`absolute top-4 right-0 w-64 bg-white border border-gray-200 rounded-lg p-3 shadow-sm transition-all duration-1000 ${
            email.isVisible 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-full opacity-0'
          }`}
          style={{ 
            top: `${4 + (email.id - 1) * 60}px`,
            zIndex: 100 - email.id
          }}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${email.color}`} />
            <span className="text-sm font-medium text-gray-900 truncate">
              {email.subject}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {email.isCategorized ? `→ ${email.category}` : 'Processing...'}
          </div>
        </div>
      ))}

      {/* Email Categories */}
      <div className="space-y-4 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            <span className="font-medium text-gray-900">1: needs response</span>
            <span className="ml-auto text-gray-500 text-sm bg-red-100 px-2 py-1 rounded-full transition-all duration-500">
              {getCategoryCount("1: needs response")}
            </span>
          </div>

          <div className="pl-7 space-y-2">
            {emails
              .filter(email => email.category === "1: needs response" && email.isCategorized)
              .map((email) => (
                <div 
                  key={email.id}
                  className="text-sm text-gray-600 overflow-hidden animate-slideInFromRight"
                >
                  {email.subject}
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
            <span className="font-medium text-gray-900">2: for your info</span>
            <span className="ml-auto text-gray-500 text-sm bg-orange-100 px-2 py-1 rounded-full transition-all duration-500">
              {getCategoryCount("2: for your info")}
            </span>
          </div>

          <div className="pl-7 space-y-2">
            {emails
              .filter(email => email.category === "2: for your info" && email.isCategorized)
              .map((email) => (
                <div 
                  key={email.id}
                  className="text-sm text-gray-600 overflow-hidden animate-slideInFromRight"
                >
                  {email.subject}
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <span className="font-medium text-gray-900">3: system alert</span>
            <span className="ml-auto text-gray-500 text-sm bg-green-100 px-2 py-1 rounded-full transition-all duration-500">
              {getCategoryCount("3: system alert")}
            </span>
          </div>

          <div className="pl-7 space-y-2">
            {emails
              .filter(email => email.category === "3: system alert" && email.isCategorized)
              .map((email) => (
                <div 
                  key={email.id}
                  className="text-sm text-gray-600 overflow-hidden animate-slideInFromRight"
                >
                  {email.subject}
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-green-400 rounded-sm"></div>
            <span className="font-medium text-gray-900">4: meeting summary</span>
            <span className="ml-auto text-gray-500 text-sm bg-green-100 px-2 py-1 rounded-full transition-all duration-500">
              {getCategoryCount("4: meeting summary")}
            </span>
          </div>

          <div className="pl-7 space-y-2">
            {emails
              .filter(email => email.category === "4: meeting summary" && email.isCategorized)
              .map((email) => (
                <div 
                  key={email.id}
                  className="text-sm text-gray-600 overflow-hidden animate-slideInFromRight"
                >
                  {email.subject}
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
            <span className="font-medium text-gray-900">5: completed</span>
            <span className="ml-auto text-gray-500 text-sm bg-purple-100 px-2 py-1 rounded-full transition-all duration-500">
              {getCategoryCount("5: completed")}
            </span>
          </div>

          <div className="pl-7 space-y-2">
            {emails
              .filter(email => email.category === "5: completed" && email.isCategorized)
              .map((email) => (
                <div 
                  key={email.id}
                  className="text-sm text-gray-600 overflow-hidden animate-slideInFromRight"
                >
                  {email.subject}
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-pink-500 rounded-sm"></div>
            <span className="font-medium text-gray-900">6: promotional</span>
            <span className="ml-auto text-gray-500 text-sm bg-pink-100 px-2 py-1 rounded-full transition-all duration-500">
              {getCategoryCount("6: promotional")}
            </span>
          </div>

          <div className="pl-7 space-y-2">
            {emails
              .filter(email => email.category === "6: promotional" && email.isCategorized)
              .map((email) => (
                <div 
                  key={email.id}
                  className="text-sm text-gray-600 overflow-hidden animate-slideInFromRight"
                >
                  {email.subject}
                </div>
              ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slideInFromRight {
          animation: slideInFromRight 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
