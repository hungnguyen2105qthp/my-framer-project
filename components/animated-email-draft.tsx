"use client"

import { useState, useEffect } from "react"

export function AnimatedEmailDraft() {
  const [typedText, setTypedText] = useState("")
  const [showCursor, setShowCursor] = useState(true)

  const replyText = `Hi there,

Thanks for reaching out! I've reviewed your request and I'd be happy to help you with this. Based on what you've described, I think we can find a solution that works well for your needs.

Let me know if you have any questions.

Best regards`

  useEffect(() => {
    let currentIndex = 0;
    let direction = 1; // 1 for typing, -1 for backspacing
    let pauseTimeout: NodeJS.Timeout;

    const animate = () => {
      if (direction === 1 && currentIndex < replyText.length) {
        setTypedText(replyText.slice(0, currentIndex + 1));
        currentIndex++;
      }
      
      // When reaching the end, pause for 2 seconds before starting over
      if (currentIndex >= replyText.length) {
        currentIndex = 0;
        setTypedText("");
      }
    };

    // Run animation every 50ms
    const interval = setInterval(animate, 50);

    return () => {
      clearInterval(interval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Gmail-like interface */}
      <div className="space-y-4">
        {/* Email header */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="text-sm text-gray-500">To: contact@example.com</div>
        </div>

        {/* Original email with light orange background */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="space-y-2 text-sm text-gray-600">
            <div>Hello,</div>
            <div>I hope this message finds you well.</div>
            <div>I wanted to follow up on our recent conversation about the project timeline and next steps.</div>
          </div>
        </div>

        {/* Reply box */}
        <div className="relative bg-white/80 backdrop-blur-md rounded-lg p-4 border border-gray-200/50 shadow-lg">
          {/* Gmail-like toolbar */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">AI Draft Reply</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>

          <div className="text-sm text-gray-700 min-h-[120px]">
            <div className="whitespace-pre-line">
              {typedText}
              <span className="animate-pulse opacity-50">|</span>
            </div>
          </div>

          {/* Gmail-like send button */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-all"
            >
              Send
            </button>
            <div className="flex items-center gap-1 text-gray-400">
              <div className="w-4 h-4 border border-gray-300 rounded"></div>
              <div className="w-4 h-4 border border-gray-300 rounded"></div>
              <div className="w-4 h-4 border border-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
