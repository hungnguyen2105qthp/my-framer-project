'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight } from 'lucide-react'

// Custom visual components
const DataFlowVisual = () => (
  <svg width="600" height="400" viewBox="0 0 600 400" className="w-full h-full">
    <defs>
      <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#ec4899', stopOpacity: 0.8}} />
        <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 0.8}} />
      </linearGradient>
      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor: '#10b981', stopOpacity: 0.6}} />
        <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 0.8}} />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="#1f2937" rx="12" />
    
    {/* Animated nodes */}
    <circle cx="100" cy="100" r="20" fill="url(#nodeGrad)">
      <animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="80" r="15" fill="url(#nodeGrad)">
      <animate attributeName="r" values="15;20;15" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="500" cy="120" r="18" fill="url(#nodeGrad)">
      <animate attributeName="r" values="18;23;18" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="150" cy="250" r="16" fill="url(#nodeGrad)">
      <animate attributeName="r" values="16;21;16" dur="2.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="280" r="22" fill="url(#nodeGrad)">
      <animate attributeName="r" values="22;27;22" dur="1.9s" repeatCount="indefinite" />
    </circle>
    
    {/* Animated connecting lines */}
    <path d="M100 100 L300 80" stroke="url(#lineGrad)" strokeWidth="3" opacity="0.7">
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3s" repeatCount="indefinite" />
    </path>
    <path d="M300 80 L500 120" stroke="url(#lineGrad)" strokeWidth="3" opacity="0.7">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="3s" repeatCount="indefinite" />
    </path>
    <path d="M100 100 L150 250" stroke="url(#lineGrad)" strokeWidth="3" opacity="0.7">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
    </path>
    <path d="M150 250 L400 280" stroke="url(#lineGrad)" strokeWidth="3" opacity="0.7">
      <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.8s" repeatCount="indefinite" />
    </path>
    <path d="M400 280 L500 120" stroke="url(#lineGrad)" strokeWidth="3" opacity="0.7">
      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.2s" repeatCount="indefinite" />
    </path>
    
    {/* Data flow indicators */}
    <circle cx="50" cy="50" r="8" fill="#10b981" opacity="0.8">
      <animateMotion dur="4s" repeatCount="indefinite" path="M0,0 L250,30 L450,70 L0,0" />
    </circle>
    <circle cx="50" cy="350" r="6" fill="#06b6d4" opacity="0.8">
      <animateMotion dur="3.5s" repeatCount="indefinite" path="M0,0 L100,-100 L250,-70 L0,0" />
    </circle>
  </svg>
)

const EmailOutreachVisual = () => (
  <svg width="600" height="400" viewBox="0 0 600 400" className="w-full h-full">
    <rect width="600" height="400" fill="#1f2937" rx="12" />
    
    {/* Email interface */}
    <rect x="80" y="80" width="440" height="280" fill="#374151" rx="8" stroke="#6b7280" strokeWidth="1" />
    
    {/* Email header */}
    <rect x="80" y="80" width="440" height="50" fill="#4b5563" rx="8" />
    <text x="100" y="105" fill="#e5e7eb" fontSize="14" fontWeight="bold">AI-Generated Email</text>
    
    {/* AI indicator */}
    <circle cx="470" cy="105" r="15" fill="#ec4899" opacity="0.8">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
    </circle>
    <text x="463" y="110" fill="white" fontSize="10" fontWeight="bold">AI</text>
    
    {/* Email body with personalized fields */}
    <rect x="100" y="150" width="180" height="20" fill="#10b981" opacity="0.6" rx="3">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
    </rect>
    <text x="105" y="163" fill="#e5e7eb" fontSize="12">Hi [First Name],</text>
    
    <rect x="100" y="180" width="350" height="15" fill="#374151" />
    <text x="105" y="192" fill="#9ca3af" fontSize="11">I noticed your company [Company Name] recently</text>
    
    <rect x="100" y="200" width="320" height="15" fill="#374151" />
    <text x="105" y="212" fill="#9ca3af" fontSize="11">expanded into [Industry]. Our AI solution helped</text>
    
    <rect x="250" y="200" width="100" height="15" fill="#06b6d4" opacity="0.6" rx="3">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
    </rect>
    
    <rect x="100" y="220" width="300" height="15" fill="#374151" />
    <text x="105" y="232" fill="#9ca3af" fontSize="11">[Similar Company] increase efficiency by 40%.</text>
    
    <rect x="200" y="220" width="120" height="15" fill="#ec4899" opacity="0.6" rx="3">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.8s" repeatCount="indefinite" />
    </rect>
    
    {/* Personalization indicators */}
    <circle cx="290" cy="158" r="3" fill="#10b981">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="360" cy="208" r="3" fill="#06b6d4">
      <animate attributeName="r" values="3;5;3" dur="2.3s" repeatCount="indefinite" />
    </circle>
    <circle cx="330" cy="228" r="3" fill="#ec4899">
      <animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite" />
    </circle>
  </svg>
)

const ICPTargetVisual = () => (
  <svg width="600" height="400" viewBox="0 0 600 400" className="w-full h-full">
    <rect width="600" height="400" fill="#1f2937" rx="12" />
    
    {/* Bullseye target */}
    <circle cx="300" cy="200" r="120" fill="none" stroke="#6b7280" strokeWidth="2" opacity="0.3" />
    <circle cx="300" cy="200" r="90" fill="none" stroke="#6b7280" strokeWidth="2" opacity="0.4" />
    <circle cx="300" cy="200" r="60" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="200" r="30" fill="none" stroke="#ec4899" strokeWidth="4" opacity="0.8">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="200" r="10" fill="#ec4899" opacity="0.9">
      <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
    </circle>
    
    {/* AI Brain in center */}
    <g transform="translate(285, 185)">
      <path d="M15 5 C20 0, 25 5, 25 10 C30 8, 32 15, 28 18 C30 25, 20 28, 15 25 C10 28, 0 25, 2 18 C-2 15, 0 8, 5 10 C5 5, 10 0, 15 5 Z" 
            fill="#8b5cf6" opacity="0.8">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
      </path>
      <circle cx="10" cy="12" r="1.5" fill="#e5e7eb" />
      <circle cx="20" cy="12" r="1.5" fill="#e5e7eb" />
      <path d="M8 18 Q15 22 22 18" stroke="#e5e7eb" strokeWidth="1" fill="none" />
    </g>
    
    {/* Profile cards around target */}
    <g transform="translate(150, 80)">
      <rect width="60" height="40" fill="#374151" rx="4" opacity="0.8">
        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite" />
      </rect>
      <circle cx="15" cy="15" r="6" fill="#10b981" />
      <rect x="25" y="10" width="30" height="3" fill="#9ca3af" />
      <rect x="25" y="16" width="25" height="3" fill="#9ca3af" />
    </g>
    
    <g transform="translate(400, 120)">
      <rect width="60" height="40" fill="#374151" rx="4" opacity="0.8">
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <circle cx="15" cy="15" r="6" fill="#06b6d4" />
      <rect x="25" y="10" width="30" height="3" fill="#9ca3af" />
      <rect x="25" y="16" width="25" height="3" fill="#9ca3af" />
    </g>
    
    <g transform="translate(120, 280)">
      <rect width="60" height="40" fill="#374151" rx="4" opacity="0.8">
        <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.8s" repeatCount="indefinite" />
      </rect>
      <circle cx="15" cy="15" r="6" fill="#ec4899" />
      <rect x="25" y="10" width="30" height="3" fill="#9ca3af" />
      <rect x="25" y="16" width="25" height="3" fill="#9ca3af" />
    </g>
    
    <g transform="translate(420, 300)">
      <rect width="60" height="40" fill="#374151" rx="4" opacity="0.8">
        <animate attributeName="opacity" values="0.7;0.9;0.7" dur="3.2s" repeatCount="indefinite" />
      </rect>
      <circle cx="15" cy="15" r="6" fill="#f59e0b" />
      <rect x="25" y="10" width="30" height="3" fill="#9ca3af" />
      <rect x="25" y="16" width="25" height="3" fill="#9ca3af" />
    </g>
    
    {/* Connection lines to center */}
    <path d="M180 100 L260 170" stroke="#10b981" strokeWidth="2" opacity="0.6">
      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2s" repeatCount="indefinite" />
    </path>
    <path d="M430 140 L340 180" stroke="#06b6d4" strokeWidth="2" opacity="0.6">
      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.3s" repeatCount="indefinite" />
    </path>
    <path d="M150 300 L260 230" stroke="#ec4899" strokeWidth="2" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.8s" repeatCount="indefinite" />
    </path>
    <path d="M450 320 L340 220" stroke="#f59e0b" strokeWidth="2" opacity="0.6">
      <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2.5s" repeatCount="indefinite" />
    </path>
  </svg>
)

const CoachingVisual = () => (
  <svg width="600" height="400" viewBox="0 0 600 400" className="w-full h-full">
    <rect width="600" height="400" fill="#1f2937" rx="12" />
    
    {/* Dashboard interface */}
    <rect x="50" y="50" width="500" height="300" fill="#374151" rx="8" stroke="#6b7280" strokeWidth="1" />
    
    {/* Header */}
    <rect x="50" y="50" width="500" height="40" fill="#4b5563" rx="8" />
    <text x="70" y="72" fill="#e5e7eb" fontSize="14" fontWeight="bold">Sales Coaching Dashboard</text>
    
    {/* Shield icon */}
    <g transform="translate(480, 60)">
      <path d="M10 5 L15 0 L20 5 L20 15 C20 20, 15 22, 15 22 C15 22, 10 20, 10 15 Z" fill="#10b981" opacity="0.8">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M13 8 L14 10 L17 7" stroke="white" strokeWidth="1.5" fill="none" />
    </g>
    
    {/* Email list */}
    <g transform="translate(70, 110)">
      <rect width="200" height="30" fill="#6b7280" opacity="0.3" rx="4" />
      <circle cx="15" cy="15" r="8" fill="#10b981" opacity="0.8">
        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M11 15 L13 17 L19 11" stroke="white" strokeWidth="2" fill="none" />
      <text x="30" y="18" fill="#e5e7eb" fontSize="12">Call #1 - Scored: 85%</text>
    </g>
    
    <g transform="translate(70, 150)">
      <rect width="200" height="30" fill="#6b7280" opacity="0.3" rx="4" />
      <circle cx="15" cy="15" r="8" fill="#f59e0b" opacity="0.8">
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.3s" repeatCount="indefinite" />
      </circle>
      <text x="12" y="18" fill="white" fontSize="10">!</text>
      <text x="30" y="18" fill="#e5e7eb" fontSize="12">Call #2 - Needs Review</text>
    </g>
    
    <g transform="translate(70, 190)">
      <rect width="200" height="30" fill="#6b7280" opacity="0.3" rx="4" />
      <circle cx="15" cy="15" r="8" fill="#10b981" opacity="0.8">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <path d="M11 15 L13 17 L19 11" stroke="white" strokeWidth="2" fill="none" />
      <text x="30" y="18" fill="#e5e7eb" fontSize="12">Call #3 - Scored: 92%</text>
    </g>
    
    {/* Performance chart */}
    <g transform="translate(320, 110)">
      <text x="0" y="0" fill="#e5e7eb" fontSize="12" fontWeight="bold">Performance Trends</text>
      <rect x="0" y="10" width="200" height="120" fill="#4b5563" opacity="0.5" rx="4" />
      
      {/* Chart bars */}
      <rect x="20" y="90" width="15" height="30" fill="#10b981" opacity="0.7">
        <animate attributeName="height" values="30;40;30" dur="2s" repeatCount="indefinite" />
        <animate attributeName="y" values="90;80;90" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="50" y="70" width="15" height="50" fill="#10b981" opacity="0.7">
        <animate attributeName="height" values="50;60;50" dur="2.3s" repeatCount="indefinite" />
        <animate attributeName="y" values="70;60;70" dur="2.3s" repeatCount="indefinite" />
      </rect>
      <rect x="80" y="60" width="15" height="60" fill="#ec4899" opacity="0.7">
        <animate attributeName="height" values="60;70;60" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="60;50;60" dur="1.8s" repeatCount="indefinite" />
      </rect>
      <rect x="110" y="80" width="15" height="40" fill="#06b6d4" opacity="0.7">
        <animate attributeName="height" values="40;50;40" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="y" values="80;70;80" dur="2.5s" repeatCount="indefinite" />
      </rect>
    </g>
    
    {/* Network connections */}
    <g opacity="0.4">
      <path d="M100 250 L150 280 L200 250 L250 280" stroke="#6b7280" strokeWidth="2" fill="none">
        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
      </path>
      <circle cx="100" cy="250" r="3" fill="#10b981" />
      <circle cx="150" cy="280" r="3" fill="#06b6d4" />
      <circle cx="200" cy="250" r="3" fill="#ec4899" />
      <circle cx="250" cy="280" r="3" fill="#f59e0b" />
    </g>
    
    {/* Coaching feedback indicator */}
    <g transform="translate(400, 250)">
      <rect width="120" height="60" fill="#4b5563" opacity="0.8" rx="6" />
      <text x="10" y="18" fill="#e5e7eb" fontSize="11" fontWeight="bold">Live Feedback</text>
      <rect x="10" y="25" width="80" height="8" fill="#10b981" opacity="0.6" rx="4">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </rect>
      <text x="10" y="45" fill="#9ca3af" fontSize="9">Great opening!</text>
    </g>
  </svg>
)

interface TabContent {
  title: string
  description: string
}

const tabData: Record<string, TabContent> = {
  'INTELLIGENT LEAD DISCOVERY': {
    title: 'Custom-built lead lists, not cookie-cutter data',
    description: 'Stop buying stale lists. Candytrail\'s AI agents crawl the web to surface high-intent leads actively searching for your solution—so your pipeline starts with buyers, not browsers.',
  },
  'AI OUTREACH': {
    title: 'Craft compelling messages that resonate with your audience',
    description: 'Our engine writes personalized, high-converting cold emails for every lead we surface - tailored to each prospect\'s pain points and profile.',
  },
  'PRECISION ICP': {
    title: 'Precisely identify your ICP with advanced AI',
    description: 'We use behavioral signals and real-time web activity to lock in your ideal customer profile—not just job titles or firmographics.',
  },
  'CONTINUOUS COACHING ENGINE': {
    title: 'Daily automated sales coaching',
    description: 'Candytrail listens to every call, scores it, and flags what works. Sales managers can drop timestamped feedback and watch rep performance climb weekly—not quarterly.',
  }
}

export function InteractiveDataSection() {
  const [activeTab, setActiveTab] = useState('INTELLIGENT LEAD DISCOVERY')
  const currentContent = tabData[activeTab]

  // Safety check - return loading state if content is not found
  if (!currentContent) {
    return (
      <section className="py-16 md:py-24 lg:py-32 bg-custom-light-bg text-text-light-primary">
        <div className="container px-4 md:px-8 lg:px-12">
          <p>Loading...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24 lg:py-32 bg-custom-light-bg text-text-light-primary">
      <div className="container px-4 md:px-8 lg:px-12">
        <div className="flex flex-wrap gap-x-8 gap-y-4 mb-12 text-sm font-semibold text-text-light-muted uppercase">
          {Object.keys(tabData).map((tabName) => (
            <span
              key={tabName}
              className={`pb-1 cursor-pointer transition-colors ${
                activeTab === tabName ? 'border-b-2 border-primary-pink text-primary-pink' : 'hover:text-primary-pink'
              }`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
            </span>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-12 items-center bg-card-dark-bg rounded-xl shadow-lg p-8 md:p-12 text-text-dark-primary">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {currentContent.title}
            </h2>
            <p className="text-lg text-text-dark-muted max-w-lg">
              {currentContent.description}
            </p>
            <a href="https://calendly.com/adimahna/30min" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
              <Button className="bg-primary-pink text-text-dark-primary hover:bg-primary-pink/90 px-8 py-3 rounded-md shadow-md flex items-center space-x-2">
                <span>Book Call</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
          <div className="h-96 flex items-center justify-center"> {/* Fixed height for visual consistency */}
            <div className="w-full h-full max-w-[600px] max-h-[400px] flex items-center justify-center">
              {activeTab === 'INTELLIGENT LEAD DISCOVERY' && <DataFlowVisual />}
              {activeTab === 'AI OUTREACH' && <EmailOutreachVisual />}
              {activeTab === 'PRECISION ICP' && <ICPTargetVisual />}
              {activeTab === 'CONTINUOUS COACHING ENGINE' && <CoachingVisual />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
