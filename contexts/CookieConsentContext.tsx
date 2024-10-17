"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

type CookieConsentContextType = {
  cookiesAccepted: boolean | null
  acceptCookies: () => void
  declineCookies: () => void
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext)
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider')
  }
  return context
}

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cookiesAccepted, setCookiesAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent')
    if (consent !== null) {
      setCookiesAccepted(consent === 'true')
    }
  }, [])

  const acceptCookies = () => {
    setCookiesAccepted(true)
    localStorage.setItem('cookieConsent', 'true')
  }

  const declineCookies = () => {
    setCookiesAccepted(false)
    localStorage.setItem('cookieConsent', 'false')
  }

  return (
    <CookieConsentContext.Provider value={{ cookiesAccepted, acceptCookies, declineCookies }}>
      {children}
    </CookieConsentContext.Provider>
  )
}
