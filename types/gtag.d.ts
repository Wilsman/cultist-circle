interface Window {
  gtag?: (
    command: 'consent',
    action: 'update',
    consentParameters: {
      analytics_storage?: 'granted' | 'denied'
      ad_storage?: 'granted' | 'denied'
      ad_user_data?: 'granted' | 'denied'
      ad_personalization?: 'granted' | 'denied'
    }
  ) => void
  dataLayer?: any[]
}
