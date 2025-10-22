"use client"

import React, { useEffect, useRef, useState } from 'react'

interface CounterUpProps {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
}

export const CounterUp: React.FC<CounterUpProps> = ({ value, duration = 2000, suffix = '', prefix = '' }) => {
  const [currentValue, setCurrentValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          let startTimestamp: DOMHighResTimeStamp | null = null
          const step = (timestamp: DOMHighResTimeStamp) => {
            if (!startTimestamp) startTimestamp = timestamp
            const progress = Math.min((timestamp - startTimestamp) / duration, 1)
            setCurrentValue(Math.floor(progress * value))
            if (progress < 1) {
              window.requestAnimationFrame(step)
            }
          }
          window.requestAnimationFrame(step)
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the component is visible
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [value, duration])

  return (
    <div ref={ref}>
      {prefix}{currentValue}{suffix}
    </div>
  )
}
