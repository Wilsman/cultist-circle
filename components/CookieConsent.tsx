"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent")
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true")
    setIsVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "false")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="max-w-2xl mx-auto m-4">
        <div className="relative bg-gray-800/95 backdrop-blur-md border border-gray-700 p-6 rounded-lg shadow-xl">
          <div className="prose prose-invert prose-sm max-w-none">
            <h3 className="text-xl font-semibold mb-4 text-white">🍪 Cookie Policy</h3>
            <p className="text-gray-300 mb-4">
              We use cookies to enhance your experience and analyze our traffic. By clicking
              "Accept All", you consent to our use of cookies. For more information, please
              read our{" "}
              <a
                href="/privacy-policy"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button
              onClick={handleAccept}
              className="interactive-bounce bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Accept All
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              className="interactive-bounce border-gray-600 hover:bg-gray-700 text-gray-300"
            >
              Decline Non-Essential
            </Button>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close cookie consent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
