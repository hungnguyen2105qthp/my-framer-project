'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface TabContent {
  tag: string
  title: string
  description: string
  imageAlt: string
  imageQuery: string
  buttonText: string
}

const tabData: Record<string, TabContent> = {
  'VISIBILITY': {
    tag: 'VISIBILITY',
    title: 'Hear what your customers hear',
    description: 'Siro allows leaders to understand what\'s really happening when team members are out representing your brand. No more guessing if a process is followed or why a sale was lost, our AI-enabled app captures and analyzes each customer conversation in real time. Reps don\'t even need to take notes!',
    imageAlt: 'Conversation timeline UI',
    imageQuery: 'conversation timeline UI with audio waves and text',
    buttonText: 'SEE HOW SIRO WORKS',
  },
  'COACHING': {
    tag: 'COACHING',
    title: 'Deliver personalized coaching at scale',
    description: 'Our AI identifies key moments in conversations, highlights areas for improvement, and provides actionable feedback to help your sales reps grow faster and close more deals.',
    imageAlt: 'Sales coaching dashboard',
    imageQuery: 'sales coaching dashboard with performance metrics and feedback',
    buttonText: 'EXPLORE COACHING FEATURES',
  },
  'INTELLIGENCE': {
    tag: 'INTELLIGENCE',
    title: 'Unlock deep insights from every customer interaction',
    description: 'Gain unparalleled intelligence on market trends, customer pain points, and competitor strategies by analyzing thousands of conversations. Make data-driven decisions to optimize your sales process.',
    imageAlt: 'Business intelligence dashboard',
    imageQuery: 'business intelligence dashboard with charts and graphs',
    buttonText: 'GET INTELLIGENCE INSIGHTS',
  },
}

export function InteractiveSalesCoachingSection() {
  const [activeTab, setActiveTab] = useState('VISIBILITY')
  const currentContent = tabData[activeTab]

  return (
    <section className="py-16 md:py-24 lg:py-32 bg-custom-dark-bg text-text-dark-primary">
      <div className="container px-4 md:px-8 lg:px-12 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-12 text-text-dark-primary">
          Learn from every conversation. Get more wins.
        </h2>
        <div className="flex justify-center space-x-8 mb-12 text-lg font-semibold">
          {Object.keys(tabData).map((tabName) => (
            <div
              key={tabName}
              className={`relative pb-2 cursor-pointer ${
                activeTab === tabName ? 'text-primary-pink' : 'text-text-dark-muted hover:text-primary-pink transition-colors'
              }`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
              {activeTab === tabName && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-pink"></span>
              )}
            </div>
          ))}
        </div>
        <div className="bg-card-light-bg p-8 rounded-xl shadow-lg grid lg:grid-cols-2 gap-8 items-center text-left">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-light-primary">
              {currentContent.tag}
            </div>
            <h3 className="text-3xl md:text-4xl font-bold leading-tight text-text-light-primary">
              {currentContent.title}
            </h3>
            <p className="text-lg text-text-light-muted">
              {currentContent.description}
            </p>
            <Button className="bg-primary-pink text-text-dark-primary hover:bg-primary-pink/90 px-8 py-3 rounded-md shadow-md">
              {currentContent.buttonText}
            </Button>
          </div>
          <div className="flex justify-center items-center">
            <Image
              src={`/placeholder.svg?height=400&width=600&query=${encodeURIComponent(currentContent.imageQuery)}`}
              width={600}
              height={400}
              alt={currentContent.imageAlt}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
