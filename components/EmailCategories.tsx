"use client"

import { motion } from "framer-motion"

const categories = [
  {
    id: "1",
    label: "needs reply",
    color: "bg-red-100 text-red-700 border-red-200",
    examples: [
      "Can you review these project updates?",
      "Are you available for a quick call this week?"
    ]
  },
  {
    id: "2",
    label: "FYI",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    examples: [
      "Q3 Financial Report Attached",
      "Team Offsite Photos from Last Friday"
    ]
  },
  {
    id: "3",
    label: "comment",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    examples: [
      "You were mentioned in a comment",
      "Someone replied to your thread"
    ]
  },
  {
    id: "4",
    label: "notification",
    color: "bg-green-100 text-green-700 border-green-200",
    examples: [
      "GitHub notification",
      "Slack alert"
    ]
  },
  {
    id: "5",
    label: "meeting update",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    examples: [
      "Calendar invite",
      "Meeting rescheduled"
    ]
  },
  {
    id: "6",
            label: "advertisement",
    color: "bg-pink-100 text-pink-700 border-pink-200",
    examples: [
      "Newsletter",
      "Promotional offer"
    ]
  }
]

export function EmailCategories() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {categories.map((category, index) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          className={`p-4 rounded-lg border ${category.color} transition-all`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">{category.id}:</span>
            <span className="text-sm font-medium">{category.label}</span>
          </div>
          {category.examples.length > 0 && (
            <div className="space-y-2 mt-3">
              {category.examples.map((example, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="text-sm"
                >
                  {example}
                </motion.p>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
} 