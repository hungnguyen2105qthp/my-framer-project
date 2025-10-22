'use client'

import React, { useState, useEffect } from 'react'

interface AnimatedHeadingProps {
  baseText: string
  phrases: string[]
  interval?: number // Interval between full phrases (before typing next)
  typingSpeed?: number // Speed of typing animation (ms per character)
}

export function AnimatedHeading({ baseText, phrases, interval = 2000, typingSpeed = 75 }: AnimatedHeadingProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    let phraseTimer: NodeJS.Timeout
    let charTimer: NodeJS.Timeout

    const typePhrase = (index: number) => {
      const targetPhrase = phrases[index]
      let charIndex = 0
      setDisplayedText('') // Clear text before typing new phrase
      setIsTyping(true)

      const typeChar = () => {
        if (charIndex < targetPhrase.length) {
          setDisplayedText((prev) => prev + targetPhrase.charAt(charIndex))
          charIndex++
          charTimer = setTimeout(typeChar, typingSpeed)
        } else {
          setIsTyping(false)
          // Once typing is complete, wait for the interval before starting the next phrase
          phraseTimer = setTimeout(() => {
            setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length)
          }, interval)
        }
      }
      typeChar()
    }

    typePhrase(currentPhraseIndex)

    return () => {
      clearTimeout(phraseTimer)
      clearTimeout(charTimer)
    }
  }, [currentPhraseIndex, phrases, interval, typingSpeed])

  // Calculate max width to prevent layout shift
  const maxWidth = Math.max(...phrases.map(phrase => phrase.length)) * 1.2 + 'ch'; // Approx char width

  return (
    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight break-words">
      {baseText}
      <span
        className="inline-block text-primary-pink break-words"
        style={{ minWidth: 'min(20ch, 90vw)' }} // Responsive width that prevents overflow
      >
        {displayedText}
      </span>
    </h1>
  )
}
