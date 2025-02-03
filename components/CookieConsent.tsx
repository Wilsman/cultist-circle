'use client'

import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Switch } from './ui/switch'
import { useCookieConsent } from '@/context/cookie-consent-context'

interface CookieType {
  id: string
  name: string
  description: string
  required?: boolean
  defaultValue?: boolean
}

const cookieTypes: CookieType[] = [
  {
    id: 'necessary',
    name: 'Necessary',
    description: 'These cookies are necessary for the website to function properly and cannot be switched off.',
    required: true,
    defaultValue: true
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'These cookies help us improve the site by tracking which pages are most popular and how visitors move around the site.',
    defaultValue: true
  },
  {
    id: 'advertising',
    name: 'Advertising',
    description: 'These cookies are used to make advertising messages more relevant to you and your interests.',
    defaultValue: false
  }
]

export default function CookieConsent() {
  const { setHasConsent } = useCookieConsent()
  const [isVisible, setIsVisible] = useState<boolean | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) {
      setIsVisible(true)
      // Initialize preferences with default values
      const initialPreferences = cookieTypes.reduce((acc, type) => ({
        ...acc,
        [type.id]: type.defaultValue ?? false
      }), {})
      setPreferences(initialPreferences)
    } else {
      setIsVisible(false)
      setHasConsent(true)
      try {
        const savedPreferences = JSON.parse(consent)
        setPreferences(savedPreferences)
      } catch (e) {
        console.error('Error parsing cookie preferences:', e)
      }
    }
  }, [setHasConsent])

  const handleAcceptAll = () => {
    const allAccepted = cookieTypes.reduce((acc, type) => ({
      ...acc,
      [type.id]: true
    }), {})
    saveConsent(allAccepted)
  }

  const handleRejectNonEssential = () => {
    const essentialOnly = cookieTypes.reduce((acc, type) => ({
      ...acc,
      [type.id]: type.required ?? false
    }), {})
    saveConsent(essentialOnly)
  }

  const handlePreferenceChange = (typeId: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [typeId]: value
    }))
  }

  const handleSavePreferences = () => {
    saveConsent(preferences)
  }

  const saveConsent = (prefs: Record<string, boolean>) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs))
    setIsVisible(false)
    setShowPreferences(false)
    setHasConsent(true)
    
    // Handle analytics consent
    if (prefs.analytics) {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
      })
      window.dataLayer?.push({
        event: 'consent_accepted_analytics',
      })
    } else {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'denied',
      })
    }

    // Handle advertising consent
    if (prefs.advertising) {
      window.gtag?.('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      })
      window.dataLayer?.push({
        event: 'consent_accepted_advertising',
      })
    } else {
      window.gtag?.('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
    }
  }

  if (isVisible !== true) return null

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-2xl animate-slide-up">
          <div className="relative bg-gray-800/95 backdrop-blur-md border border-gray-700 p-6 rounded-lg shadow-xl">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <Cookie className="h-8 w-8 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold mb-3 text-white">Cookie Preferences</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We use cookies to enhance your experience and analyze our traffic. You can customize your preferences or accept all cookies.{' '}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setShowPrivacyPolicy(true)
                    }}
                    className="text-blue-400 hover:text-blue-300 underline transition-colors"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowPreferences(true)}
                className="text-gray-300 hover:text-white"
              >
                Customize
              </Button>
              <Button
                variant="secondary"
                onClick={handleRejectNonEssential}
                className="text-gray-300 hover:text-white"
              >
                Reject Non-Essential
              </Button>
              <Button
                onClick={handleAcceptAll}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Customize which cookies you want to accept. Some cookies are necessary for the website to function properly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {cookieTypes.map((type) => (
              <div key={type.id} className="flex items-start justify-between space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium leading-none">{type.name}</h4>
                    {type.required && (
                      <span className="text-xs text-gray-500">(Required)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {type.description}
                  </p>
                </div>
                <Switch
                  checked={preferences[type.id] ?? false}
                  onCheckedChange={(checked) => handlePreferenceChange(type.id, checked)}
                  disabled={type.required}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreferences(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Last updated: February 3, 2025
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-2">Cookie Usage</h3>
              <p className="mb-4">
                We use different types of cookies to optimize your experience on our website. Cookies are small text files that are stored on your device when you visit our website.
              </p>
              
              <h4 className="font-medium mb-2">Necessary Cookies</h4>
              <p className="mb-4">
                These cookies are essential for the website to function properly. They enable basic functions like page navigation, access to secure areas, and proper website operation. The website cannot function properly without these cookies.
              </p>

              <h4 className="font-medium mb-2">Analytics Cookies</h4>
              <p className="mb-4">
                Analytics cookies help us understand how visitors interact with our website. These cookies help provide information on metrics like number of visitors, bounce rate, traffic source, etc. This helps us improve our website performance and user experience.
              </p>

              <h4 className="font-medium mb-2">Advertising Cookies</h4>
              <p className="mb-4">
                These cookies are used to deliver advertisements more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Your Choices</h3>
              <p className="mb-4">
                You can choose to accept or decline different types of cookies. Necessary cookies cannot be declined as they are essential for the website to work properly. You can modify your cookie preferences at any time by clicking the &ldquo;Customize&rdquo; button in the cookie banner.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
              <p>
                If you have any questions about our cookie policy or privacy practices, please contact us at privacy@example.com.
              </p>
            </section>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setShowPrivacyPolicy(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
