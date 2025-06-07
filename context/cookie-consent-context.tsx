"use client"

import { createContext, useContext, useState, useEffect } from "react"

type CookieConsentContextType = {
  hasConsent: boolean
  setHasConsent: (value: boolean) => void
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [hasConsent, setHasConsent] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent")
    setHasConsent(consent === "true")
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <CookieConsentContext.Provider value={{ hasConsent, setHasConsent }}>
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext)
  if (context === undefined) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider")
  }
  return context
}
