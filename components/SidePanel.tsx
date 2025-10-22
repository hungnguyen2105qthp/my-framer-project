"use client"

import { X, Clock, Users, FileText, CheckCircle, MessageSquare } from 'lucide-react'
import { Button } from "./ui/button"

interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  meeting?: {
    title: string
    date: string
    duration: string
    participants: string[]
    summary?: string
    actionItems?: Array<{
      id: string
      text: string
      completed: boolean
      assignee: string
    }>
  }
}

export default function SidePanel({ isOpen, onClose, meeting }: SidePanelProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto z-50">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Meeting Details
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {meeting ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {meeting.title}
              </h3>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5" />
                  <span>{meeting.date}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1.5" />
                  <span>{meeting.participants.length} participants</span>
                </div>
              </div>
            </div>

            {meeting.summary && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Summary
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {meeting.summary}
                </p>
              </div>
            )}

            {meeting.actionItems && meeting.actionItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Action Items
                </h4>
                <div className="space-y-3">
                  {meeting.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <div className="ml-3 flex-1">
                        <p className={`text-sm ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                          {item.text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Assigned to {item.assignee}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat about this meeting
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-gray-500 dark:text-gray-400">
              Select a meeting to view details
            </h3>
          </div>
        )}
      </div>
    </div>
  )
}
