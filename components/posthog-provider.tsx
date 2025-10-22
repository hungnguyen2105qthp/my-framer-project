'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { useAuth } from '@/context/auth-context'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      defaults: '2025-05-24',
      capture_exceptions: true,
      debug: process.env.NODE_ENV === 'development',
    })
  }, [])

  useEffect(() => {
    if (user) {
      posthog.identify(user.uid, {
        email: user.email,
        name: user.displayName,
      })
    } else {
      posthog.reset()
    }
  }, [user])

  return <PHProvider client={posthog}>{children}</PHProvider>
}