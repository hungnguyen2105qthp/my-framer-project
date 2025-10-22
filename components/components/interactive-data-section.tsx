'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight } from 'lucide-react'
import Image from 'next/image' // Import Image component

interface TabContent {
  title: string
  description: string
  visual: {
    query: string;
    alt: string;
    width: number;
    height: number;
  }
}

const tabData: Record<string, TabContent> = {
  'DATA SOURCES': {
    title: 'Build better lead lists with custom databases, not generic data providers',
    description: 'Most tools rely on stale data or firmographic filters. We build tailored prospect databases from scratch based on your exact ICP.',
    visual: {
      query: 'abstract data flow with lines and nodes, dark background, light green and pink accents',
      alt: 'Abstract data flow illustration',
      width: 600,
      height: 400,
    },
  },
  'MESSAGING': {
    title: 'Craft compelling messages that resonate with your audience',
    description: 'Our AI-powered messaging engine helps you create personalized outreach that cuts through the noise and gets replies.',
    visual: {
      query: 'email message with personalized fields, AI icon, dark background',
      alt: 'Personalized email message illustration',
      width: 600,
      height: 400,
    },
  },
  'ICP MATCHING': {
    title: 'Precisely identify your Ideal Customer Profile (ICP) with advanced AI',
    description: 'Stop wasting time on unqualified leads. Our system uses deep learning to find prospects that perfectly match your ICP, ensuring higher conversion rates.',
    visual: {
      query: 'target icon with bullseye, AI brain, and matching profiles, dark background',
      alt: 'ICP matching illustration',
      width: 600,
      height: 400,
    },
  },
  'MANAGED DELIVERABILITY': {
    title: 'Ensure your emails land in the inbox, not the spam folder',
    description: 'Our experts actively manage your email deliverability, monitoring sender reputation, optimizing technical settings, and adapting to ISP changes to maximize inbox placement.',
    visual: {
      query: 'email inbox with a checkmark, shield icon, and network lines, dark background',
      alt: 'Email deliverability illustration',
      width: 600,
      height: 400,
    },
  },
  'LOOP OPTIMIZATION': {
    title: 'Continuously improve your campaigns with data-driven insights',
    description: 'We analyze every interaction, identify patterns, and implement A/B tests to constantly refine your outreach strategy, ensuring optimal performance and ROI.',
    visual: {
      query: 'looping arrow with data points and growth chart, dark background',
      alt: 'Loop optimization illustration',
      width: 600,
      height: 400,
    },
  },
  'FULLY MANAGED': {
    title: 'Experience truly hands-off outbound with our fully managed service',
    description: 'From strategy to execution and optimization, our team handles every aspect of your outbound campaigns, freeing up your time to focus on core business activities.',
    visual: {
      query: 'team of people working together, gears, and a rocket ship, dark background',
      alt: 'Fully managed service illustration',
      width: 600,
      height: 400,
    },
  },
}

export function InteractiveDataSection() {
  const [activeTab, setActiveTab] = useState('DATA SOURCES')
  const currentContent = tabData[activeTab]

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
            <Button className="bg-primary-pink text-text-dark-primary hover:bg-primary-pink/90 px-8 py-3 rounded-md shadow-md flex items-center space-x-2">
              <span>Book Call</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-96 flex items-center justify-center"> {/* Fixed height for visual consistency */}
            <Image
              src={`/placeholder.svg?height=${currentContent.visual.height}&width=${currentContent.visual.width}&query=${encodeURIComponent(currentContent.visual.query)}`}
              width={currentContent.visual.width}
              height={currentContent.visual.height}
              alt={currentContent.visual.alt}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
