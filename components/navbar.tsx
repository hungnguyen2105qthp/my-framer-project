"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const handleScroll = () => {
    if (typeof window !== "undefined") {
      if (window.scrollY > lastScrollY) {
        // Scrolling down
        setIsVisible(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }
      setLastScrollY(window.scrollY)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll)
      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [lastScrollY])

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 bg-gray-900/80 p-4 shadow-sm transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-2xl font-bold text-white">AI Assistant</div>
        <nav className="flex items-center space-x-4">
          <Button variant="ghost" className="text-white hover:text-purple-300">
            Login
          </Button>
          <Button className="bg-purple-600 text-white hover:bg-purple-700">Book a Demo</Button>
        </nav>
      </div>
    </header>
  )
}
