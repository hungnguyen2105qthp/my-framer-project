"use client"

import Image from "next/image"

export function CustomBrandDemo() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">

      {/* Zoom-like meeting interface */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Meeting participants */}
          <div className="bg-gray-800 rounded-lg p-3 relative animate-fadeInUp">
            <Image
              src="/images/profile1.png"
              alt="Participant 1"
              width={60}
              height={60}
              className="w-full h-20 object-cover rounded-lg"
            />
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Alex Johnson
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 relative animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            <Image
              src="/images/profile2.png"
              alt="Participant 2"
              width={60}
              height={60}
              className="w-full h-20 object-cover rounded-lg"
            />
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">Sarah Chen</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 relative animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            <Image
              src="/images/profile3.png"
              alt="Participant 3"
              width={60}
              height={60}
              className="w-full h-20 object-cover rounded-lg"
            />
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">Mike Torres</div>
          </div>

          <div
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-3 relative animate-fadeInUp flex items-center justify-center"
            style={{ animationDelay: "0.6s" }}
          >
            <Image src="/images/logo-dark.png" alt="Wisp AI Bot" width={40} height={40} className="opacity-90" />
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">Wisp AI</div>
          </div>
        </div>

        {/* Meeting controls */}
        <div className="flex justify-center gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
