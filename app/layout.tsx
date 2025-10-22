import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { PostHogProvider } from "@/components/posthog-provider"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: "Candytrail - Boost in-person offline retail sales",
  description: "Candytrail finds high-intent leads and auto-coaches reps to close more deals, faster.",
  generator: 'v0.dev',
  icons: {
    icon: '/logocandyprob.png',
    shortcut: '/logocandyprob.png',
    apple: '/logocandyprob.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans`}>
        <AuthProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </AuthProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}