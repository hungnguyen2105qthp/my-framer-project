"use client"

import { Button } from "@/components/ui/button"
import { Mic, FileText, BarChart, LayoutDashboard, Brain } from "lucide-react"
import { motion } from "framer-motion"

export function InteractiveBlurbs() {
  const blurbs = [
    { icon: FileText, text: "Consult Capture" },
    { icon: BarChart, text: "Rep Analytics" },
    { icon: LayoutDashboard, text: "Chain Dashboard" },
    { icon: Brain, text: "AI Coaching" },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-4 md:flex-row md:items-start md:justify-start md:p-8">
      {/* Central Microphone Button with Pulsating Effect */}
      <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-gray-800/70 md:mt-16">
        <div className="absolute h-full w-full animate-[pulse-ring_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full border border-white/50"></div>
        <div className="absolute h-full w-full animate-[pulse-ring_2s_cubic-bezier(0.4,0,0.6,1)_infinite_0.5s] rounded-full border border-white/50"></div>
        <Button className="relative z-10 h-36 w-36 rounded-full bg-gray-900/80 text-white hover:bg-gray-900/90">
          <Mic className="h-16 w-16" />
        </Button>
      </div>

      {/* Feature Blurbs/Buttons */}
      <motion.div
        className="flex flex-col gap-4 md:ml-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {blurbs.map((blurb, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Button className="flex items-center gap-3 rounded-lg bg-gray-800/70 px-6 py-4 text-lg text-white shadow-lg transition-all duration-300 ease-out hover:bg-gray-700/80">
              <blurb.icon className="h-6 w-6" />
              {blurb.text}
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
