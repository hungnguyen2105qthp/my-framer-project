"use client"

import { useState, useEffect } from 'react'
import { FileText, MessageSquare, Target, Clock, MessageCircle, User, Calendar, Star, ChevronLeft, ChevronRight, X, TrendingUp, Sparkles, Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

const centerSectionTabs = [
  { id: "notes", label: "Notes", icon: FileText },
  { id: "transcript", label: "Transcript", icon: MessageSquare },
  { id: "tracking", label: "Tracking", icon: Target },
]

export default function DashboardPage() {
  const { theme, setTheme } = useTheme()
  const [currentUserStatus, setCurrentUserStatus] = useState<string | null>(null)
  const [personName, setPersonName] = useState<string>('Sample Provider')
  const [transcriptName, setTranscriptName] = useState<string>('Medical Consultation')
  const [activeTab, setActiveTab] = useState('notes')
  const [rightActiveTab, setRightActiveTab] = useState('comments')
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [selectedTracker, setSelectedTracker] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(765) // 12:45 in seconds

  // Sample hardcoded data
  const sampleTranscript = [
    { speaker: "Provider", text: "Good morning and welcome to our consultation. I hope you're comfortable today. Let me start by reviewing some basic information about your visit." },
    { speaker: "Patient", text: "Thank you for seeing me today. I appreciate you taking the time to discuss my concerns with me." },
    { speaker: "Provider", text: "Of course, that's what we're here for. I'd like to begin our conversation by understanding what brings you in today. Can you share your main concerns?" },
    { speaker: "Patient", text: "Well, I've been experiencing some symptoms that have been concerning me lately, and I wanted to get a professional opinion about them." },
    { speaker: "Provider", text: "I understand your concerns, and I'm glad you decided to come in for evaluation. Let's go through this step by step to better understand your situation." },
    { speaker: "Patient", text: "That sounds good to me. I want to make sure we cover everything that might be relevant to my condition." },
    { speaker: "Provider", text: "Excellent approach. Now, let me ask you some questions about your symptoms and medical history to help guide our assessment today." },
    { speaker: "Patient", text: "Absolutely, I'm ready to answer any questions you have. I want to be as thorough as possible." },
    { speaker: "Provider", text: "Thank you for being so cooperative. Based on the information you've shared, I'd like to conduct a brief examination to gather more clinical data." },
    { speaker: "Patient", text: "That makes sense to me. What kind of examination will you be performing today?" },
    { speaker: "Provider", text: "I'll be conducting a standard clinical assessment that includes reviewing your vital signs and performing a focused physical examination." },
    { speaker: "Patient", text: "Okay, I understand. How long do you think this examination will take?" },
    { speaker: "Provider", text: "The examination should take about 10-15 minutes. After that, we'll discuss my findings and develop an appropriate treatment plan for your situation." },
    { speaker: "Patient", text: "That sounds reasonable. I'm hoping we can find some effective solutions for managing my symptoms." },
    { speaker: "Provider", text: "I'm confident we can work together to develop a comprehensive approach that addresses your concerns and improves your overall well-being." },
    { speaker: "Patient", text: "That's very reassuring to hear. What would be the next steps after today's consultation?" },
    { speaker: "Provider", text: "After our examination and discussion, I'll provide you with specific recommendations and schedule appropriate follow-up care as needed." },
    { speaker: "Patient", text: "I appreciate that. Should I be monitoring anything specific at home between our appointments?" },
    { speaker: "Provider", text: "Yes, I'll give you some guidance on self-monitoring techniques that will help us track your progress and response to treatment." },
    { speaker: "Patient", text: "Thank you for being so thorough in explaining everything. Are there any warning signs I should be aware of?" },
    { speaker: "Provider", text: "I'll provide you with clear guidelines about when to seek immediate medical attention and what symptoms warrant urgent evaluation." },
    { speaker: "Patient", text: "I really appreciate your comprehensive approach to my care. This consultation has been very helpful." },
    { speaker: "Provider", text: "You're very welcome. Please don't hesitate to contact our office if you have any questions or concerns between appointments." }
  ]

  const sampleInsights = {
    trackerByPhrases: [
      { text: "I understand your concerns, and I'm glad you decided to come in", tracker: "empathy", speaker: "Provider", blurred: false },
      { text: "Thank you for being so cooperative", tracker: "active-listening", speaker: "Provider", blurred: false },
      { text: "Let's go through this step by step", tracker: "clinical-approach", speaker: "Provider", blurred: true },
      { text: "Based on the information you've shared", tracker: "assessment", speaker: "Provider", blurred: true },
      { text: "I appreciate you taking the time", tracker: "patient-satisfaction", speaker: "Patient", blurred: false },
      { text: "That sounds reasonable to me", tracker: "validation", speaker: "Patient", blurred: false },
      { text: "I'll be conducting a standard clinical assessment", tracker: "clinical-reasoning", speaker: "Provider", blurred: true },
      { text: "reviewing your vital signs and performing examination", tracker: "examination-plan", speaker: "Provider", blurred: true },
      { text: "we'll discuss my findings and develop treatment plan", tracker: "treatment-planning", speaker: "Provider", blurred: true },
      { text: "I want to be as thorough as possible", tracker: "patient-engagement", speaker: "Patient", blurred: false },
      { text: "I'll give you guidance on self-monitoring techniques", tracker: "patient-education", speaker: "Provider", blurred: true },
      { text: "schedule appropriate follow-up care as needed", tracker: "continuity-of-care", speaker: "Provider", blurred: false },
      { text: "monitoring anything specific at home", tracker: "self-monitoring", speaker: "Patient", blurred: true },
      { text: "clear guidelines about when to seek immediate attention", tracker: "medication-guidance", speaker: "Provider", blurred: true },
      { text: "what symptoms warrant urgent evaluation", tracker: "safety-netting", speaker: "Provider", blurred: true },
      { text: "comprehensive approach to my care has been helpful", tracker: "patient-satisfaction", speaker: "Patient", blurred: false },
      { text: "we're here to help with your concerns", tracker: "reassurance", speaker: "Provider", blurred: false },
      { text: "don't hesitate to contact our office", tracker: "accessibility", speaker: "Provider", blurred: false }
    ]
  }

  const sampleComments = [
    {
      id: 1,
      author: "Dr. Lisa Chen - Department Head",
      timestamp: "2025-10-20 14:30",
      message: "Excellent bedside manner demonstrated. The systematic approach to history taking was exemplary.",
      type: "positive"
    },
    {
      id: 2,
      author: "Clinical Supervisor - Dr. Rodriguez",
      timestamp: "2025-10-20 15:15", 
      message: "Consider incorporating more screening questions for red flag symptoms in future consultations.",
      type: "suggestion"
    }
  ]

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Load current user status (simulated)
  useEffect(() => {
    setCurrentUserStatus('admin') // Hardcoded for example
  }, [])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Medical Consultation Summary</h2>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><span className="font-semibold text-gray-700">Date:</span> <span className="text-gray-900">Sample Date</span></div>
                <div><span className="font-semibold text-gray-700">Duration:</span> <span className="text-gray-900">Sample Duration</span></div>
                <div><span className="font-semibold text-gray-700">Provider:</span> <span className="text-gray-900">Sample Provider</span></div>
                <div><span className="font-semibold text-gray-700">Patient:</span> <span className="text-gray-900">Sample Patient</span></div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 bg-red-50 p-2 rounded">Chief Complaint</h3>
                  <ul className="space-y-1 pl-4">
                    <li className="text-gray-700">• Sample presenting complaint for <span className="font-semibold">demonstration purposes</span></li>
                    <li className="text-gray-700">• <span className="blur-sm bg-gray-100 px-1 rounded select-none">Sample symptom progression details</span></li>
                    <li className="text-gray-700">• Patient expressing sample concerns about condition</li>
                    <li className="text-gray-700">• <span className="blur-sm bg-gray-100 px-1 rounded select-none">Sample associated symptoms for demo</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 bg-green-50 p-2 rounded">Assessment & Plan</h3>
                  <ul className="space-y-1 pl-4">
                    <li className="text-gray-700">• Sample comprehensive history taking for demo</li>
                    <li className="text-gray-700">• Clinical presentation consistent with <span className="font-semibold blur-sm bg-gray-100 px-1 rounded select-none">sample diagnosis for demonstration</span></li>
                    <li className="text-gray-700">• <span className="blur-sm bg-gray-100 px-1 rounded select-none">Sample identified triggers for demo purposes</span></li>
                    <li className="text-gray-700">• Sample family history information for demonstration</li>
                    <li className="text-gray-700">• <span className="blur-sm bg-gray-100 px-1 rounded select-none">Sample physical examination findings</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 bg-blue-50 p-2 rounded">Clinical Observations</h3>
                  <ul className="space-y-1 pl-4">
                    <li className="text-gray-700">• <span className="font-semibold text-blue-700">Sample empathetic approach</span> to patient concerns</li>
                    <li className="text-gray-700">• <span className="font-semibold text-green-700 blur-sm bg-gray-100 px-1 rounded select-none">Sample systematic methodology</span> for demonstration</li>
                    <li className="text-gray-700">• <span className="font-semibold text-purple-700">Sample patient education</span> provided for demo</li>
                    <li className="text-gray-700">• <span className="font-semibold text-indigo-700 blur-sm bg-gray-100 px-1 rounded select-none">Sample clinical reasoning demonstration</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 bg-yellow-50 p-2 rounded">Treatment Plan</h3>
                  <div className="bg-gray-100 p-4 rounded space-y-2">
                    <div><span className="font-semibold text-gray-700">Sample Treatment Category:</span> <span className="text-gray-900 blur-sm bg-gray-100 px-1 rounded select-none">Sample specific recommendations blurred</span></div>
                    <div><span className="font-semibold text-gray-700">Sample Management:</span> <span className="text-green-600 font-semibold">Sample techniques for demonstration</span></div>
                    <div><span className="font-semibold text-gray-700">Sample Monitoring:</span> <span className="text-blue-600 font-semibold blur-sm bg-gray-100 px-1 rounded select-none">Sample tracking method blurred</span></div>
                    <div><span className="font-semibold text-gray-700">Sample Intervention:</span> <span className="text-gray-900 blur-sm bg-gray-100 px-1 rounded select-none">Sample treatment details blurred</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 bg-purple-50 p-2 rounded">Follow-up Plan</h3>
                  <ul className="space-y-1 pl-4">
                    <li className="text-gray-700">• Return appointment in <span className="font-semibold text-purple-700">sample timeframe</span></li>
                    <li className="text-gray-700">• <span className="blur-sm bg-gray-100 px-1 rounded select-none">Sample review process details blurred</span></li>
                    <li className="text-gray-700">• <span className="font-semibold text-red-700">Sample urgent return criteria</span> for demonstration</li>
                    <li className="text-gray-700">• <span className="blur-sm bg-gray-100 px-1 rounded select-none">Sample additional treatment considerations</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'transcript':
        return (
          <div className="p-6 space-y-6">
            {/* Audio Player */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={togglePlayPause}
                  variant="outline"
                  size="sm"
                  className="w-12 h-12 rounded-full p-0 flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </Button>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Medical Consultation - October 20, 2025</span>
                    <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
            </div>

            {/* Transcript Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Transcript</h3>
              {sampleTranscript.map((item, index) => {
                // Define which lines to blur (strategic selection)
                const shouldBlur = [2, 4, 6, 8, 10, 13, 15, 17, 19, 21].includes(index)
                
                return (
                  <div key={index} className="flex space-x-3 hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                      item.speaker === 'Provider' ? 'bg-blue-500 shadow-blue-200 shadow-lg' : 'bg-green-500 shadow-green-200 shadow-lg'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                          item.speaker === 'Provider' 
                            ? 'text-blue-800 bg-blue-100' 
                            : 'text-green-800 bg-green-100'
                        }`}>
                          {item.speaker}
                        </span>
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                          {Math.floor(index * 30 / 60)}:{(index * 30 % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="text-gray-800 text-sm leading-relaxed border-l-2 border-gray-200 pl-3">
                        {shouldBlur ? (
                          <p className="blur-sm select-none bg-gray-50 p-2 rounded">
                            {item.text}
                          </p>
                        ) : (
                          <p>{item.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Transcript Statistics */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{sampleTranscript.length}</div>
                  <div className="text-sm text-gray-600">Total Exchanges</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{sampleTranscript.filter(item => item.speaker === 'Provider').length}</div>
                  <div className="text-sm text-gray-600">Provider Statements</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{sampleTranscript.filter(item => item.speaker === 'Patient').length}</div>
                  <div className="text-sm text-gray-600">Patient Responses</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">10</div>
                  <div className="text-sm text-gray-600">Protected Sections</div>
                </div>
              </div>
              
            </div>
          </div>
        )

      case 'tracking':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Tracking Analysis</h2>
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                Sample Data
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Highlighted Transcript */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Transcript with Tracking</h3>
                  <div className="text-sm text-gray-500">
                    {sampleInsights.trackerByPhrases.length} tracked phrases found
                  </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="p-4 bg-gray-50 rounded-lg leading-relaxed space-y-4">
                    {sampleInsights.trackerByPhrases.map((sentence: any, index: number) => {
                      const trackerColors: Record<string, string> = {
                        'empathy': 'bg-yellow-200 text-yellow-900',
                        'active-listening': 'bg-green-200 text-green-900',
                        'clinical-approach': 'bg-blue-200 text-blue-900',
                        'assessment': 'bg-purple-200 text-purple-900',
                        'patient-satisfaction': 'bg-pink-200 text-pink-900',
                        'validation': 'bg-orange-200 text-orange-900',
                        'clinical-reasoning': 'bg-indigo-200 text-indigo-900',
                        'examination-plan': 'bg-cyan-200 text-cyan-900',
                        'treatment-planning': 'bg-red-200 text-red-900',
                        'patient-engagement': 'bg-lime-200 text-lime-900',
                        'patient-education': 'bg-teal-200 text-teal-900',
                        'continuity-of-care': 'bg-violet-200 text-violet-900',
                        'self-monitoring': 'bg-rose-200 text-rose-900',
                        'medication-guidance': 'bg-emerald-200 text-emerald-900',
                        'safety-netting': 'bg-amber-200 text-amber-900',
                        'reassurance': 'bg-sky-200 text-sky-900',
                        'accessibility': 'bg-slate-200 text-slate-900',
                      }
                      const colorClass = trackerColors[sentence.tracker] || 'bg-gray-200 text-gray-900'
                      
                      return (
                        <div key={index} className="mb-6 bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                                sentence.speaker === 'Provider' 
                                  ? 'text-blue-800 bg-blue-100' 
                                  : 'text-green-800 bg-green-100'
                              }`}>
                                {sentence.speaker}
                              </span>
                              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                {Math.floor((index + 2) * 45 / 60)}:{((index + 2) * 45 % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${colorClass} font-medium`}>
                                {sentence.tracker.replace(/-/g, ' ')}
                              </span>
                              <span className="text-xs text-gray-400">#{index + 1}</span>
                            </div>
                          </div>
                          <div className="text-gray-800 text-sm leading-relaxed border-l-4 border-gray-200 pl-4">
                            {sentence.blurred ? (
                              <span className={`px-2 py-1 rounded ${colorClass} font-medium blur-sm select-none`}>
                                {sentence.text}
                              </span>
                            ) : (
                              <span className={`px-2 py-1 rounded ${colorClass} font-medium`}>
                                {sentence.text}
                              </span>
                            )}
                          </div>
                          
                          {/* Context Information */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Clinical Category: <span className="font-medium">{sentence.tracker.replace(/-/g, ' ')}</span></span>
                              <span>Confidence: {Math.floor(85 + Math.random() * 10)}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )

      default:
        return <div>Content not found</div>
    }
  }

  const renderRightSidebarContent = () => {
    switch (rightActiveTab) {
      case 'comments':
        return (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Comments & Feedback</h3>
            <div className="space-y-4">
              {sampleComments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-3">
                  <div className="blur-sm select-none">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        comment.type === 'positive' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {comment.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{comment.message}</p>
                    <div className="text-xs text-gray-500">{comment.timestamp}</div>
                  </div>
                </div>
              ))}
              
            </div>
          </div>
        )
      
      case 'trackers':
        return (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Conversation Trackers</h3>
            <div className="space-y-3">
              {[
                { name: "Empathy", count: 3, color: "bg-yellow-100 text-yellow-800" },
                { name: "Active Listening", count: 5, color: "bg-green-100 text-green-800" },
                { name: "Clinical Assessment", count: 4, color: "bg-blue-100 text-blue-800" }
              ].map((tracker, index) => (
                <div
                  key={index}
                  className="w-full text-left border rounded-lg p-4"
                >
                  <div className={`blur-sm select-none ${tracker.color} rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tracker.name}</span>
                      <span className="text-sm">{tracker.count} matches</span>
                    </div>
                  </div>
                </div>
              ))}
              
            </div>
          </div>
        )
      
      default:
        return <div>Content not found</div>
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="flex h-screen overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{transcriptName}</h1>
                <p className="text-gray-600">{personName} • Example Consultation</p>
              </div>
              <div className="text-sm text-gray-500">
                Sample Data • {formatTime(duration)}
              </div>
            </div>
          </div>

          {/* Content Area with Resizable Panels */}
          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Main Content Panel */}
              <ResizablePanel defaultSize={rightSidebarOpen ? 70 : 100} minSize={50}>
                <div className="h-full flex flex-col">
                  {/* Center Section Tabs */}
                  <div className="border-b border-border bg-card">
                    <nav className="flex space-x-8 px-6">
                      {centerSectionTabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id)
                              if (tab.id === 'transcript') {
                                setRightActiveTab('comments')
                              } else if (tab.id === 'tracking') {
                                setRightActiveTab('trackers')
                              }
                            }}
                            className={`flex items-center py-5 px-4 font-medium text-base transition-colors relative z-10 mr-3 ${
                              isActive
                                ? "text-purple-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                            style={{ width: '140px', justifyContent: 'flex-start' }}
                          >
                            <Icon className="w-5 h-5 mr-3" />
                            {tab.label}
                          </button>
                        )
                      })}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto">
                    {renderTabContent()}
                  </div>
                </div>
              </ResizablePanel>

              {/* Right Sidebar */}
              {rightSidebarOpen && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <div className="h-full bg-gray-50 border-l border-border flex flex-col">
                      {/* Right Sidebar Header */}
                      <div className="border-b border-border bg-white px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-4">
                            <button
                              onClick={() => setRightActiveTab('comments')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                rightActiveTab === 'comments'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Comments
                            </button>
                            <button
                              onClick={() => setRightActiveTab('trackers')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                rightActiveTab === 'trackers'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Trackers
                            </button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRightSidebarOpen(false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Right Sidebar Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderRightSidebarContent()}
                      </div>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>

            {/* Toggle Right Sidebar Button (when closed) */}
            {!rightSidebarOpen && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRightSidebarOpen(true)}
                  className="bg-white shadow-lg"
                >
                  Comments
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}