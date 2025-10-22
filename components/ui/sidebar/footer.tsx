"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function SidebarFooter() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure we only render theme-dependent content after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="mt-auto p-4 border-t dark:border-gray-800">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {!mounted ? (
          // Fallback content during SSR/initial hydration
          <>
            <Sun className="mr-2 h-4 w-4" />
            <span>Toggle Theme</span>
          </>
        ) : theme === "light" ? (
          <>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Mode</span>
          </>
        )}
      </Button>
    </div>
  )
} 