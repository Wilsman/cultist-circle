"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Cookie } from "lucide-react"
import { useCookieConsent } from "@/context/cookie-consent-context"

export default function CookieConsent() {
  const { hasConsent, setHasConsent } = useCookieConsent()
  const [isVisible, setIsVisible] = useState<boolean | null>(null)

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent")
    if (!consent) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
      setHasConsent(true)
    }
  }, [setHasConsent])

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true")
    setIsVisible(false)
    setHasConsent(true)
  }

  if (isVisible !== true) return null

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 flex items-end sm:items-space-between justify-center p-4">
      <div className="w-full max-w-2xl animate-slide-up">
        <div className="relative bg-gray-800/95 backdrop-blur-md border border-gray-700 p-6 rounded-lg shadow-xl">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <Cookie className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold mb-3 text-white">Cookie Notice</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                We use cookies to enhance your experience and analyze our traffic. By continuing to use our site, you agree to our{" "}
                <a
                  href="/privacy-policy"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleAccept}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 transition-colors duration-200"
            >
              Accept & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
