"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DashboardPreview } from "./dashboard-preview"
import { CoachingDashboardPreview } from "./coaching-dashboard-preview"
import { IntelligenceDashboardPreview } from "./intelligence-dashboard-preview"

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState("visibility")

  const features = {
    visibility: {
      title: (
        <>
          See what your clients <span className="text-purple-600">really want</span>
        </>
      ),
      description:
        "Our AI analyzes every consultation to identify client preferences, concerns, and budget considerations. No more guessing what treatments to recommend - get data-driven insights that lead to higher conversion rates.",
      buttonText: "See How It Works",
      contentComponent: DashboardPreview,
    },
    coaching: {
      title: "Improve coaching effectiveness",
      description:
        "Provide targeted feedback and training based on real conversation data. Identify areas for improvement and track progress over time to ensure your team is always performing at their best.",
      buttonText: "LEARN ABOUT COACHING",
      contentComponent: CoachingDashboardPreview,
    },
    intelligence: {
      title: "Unlock business intelligence",
      description:
        "Gain deep insights into market trends, customer needs, and competitive landscapes. Leverage AI to uncover hidden patterns and make data-driven decisions that propel your business forward.",
      buttonText: "EXPLORE INTELLIGENCE",
      contentComponent: IntelligenceDashboardPreview,
    },
  }

  const CurrentContentComponent = features[activeTab as keyof typeof features].contentComponent

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900">
          Learn from every conversation. <span className="text-purple-600">Boost every sale.</span>
        </h2>

        <div className="mt-12 flex justify-center space-x-4 border-b border-gray-300 pb-4">
          {Object.keys(features).map((key) => (
            <button
              key={key}
              className={`px-6 py-2 text-lg font-medium capitalize transition-colors duration-200 ${
                activeTab === key ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setActiveTab(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="mt-12 rounded-lg bg-white p-8 shadow-xl lg:flex lg:items-center lg:justify-between">
          <div className="lg:w-1/2 lg:pr-8">
            <span className="inline-block rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold uppercase text-purple-600">
              {activeTab}
            </span>
            <h3 className="mt-4 text-3xl font-bold leading-tight text-gray-900">
              {features[activeTab as keyof typeof features].title}
            </h3>
            <p className="mt-4 text-gray-700">{features[activeTab as keyof typeof features].description}</p>
            <Button className="mt-8 bg-purple-600 text-white hover:bg-purple-700">
              {features[activeTab as keyof typeof features].buttonText}
            </Button>
          </div>
          <div className="mt-8 lg:mt-0 lg:w-1/2">
            <CurrentContentComponent />
          </div>
        </div>
      </div>
    </section>
  )
}
