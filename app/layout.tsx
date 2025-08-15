// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { CookieConsentProvider } from "@/context/cookie-consent-context";
import Script from "next/script";
import { LanguageProvider } from "@/contexts/language-context";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ChatbotWidget } from "@/components/ai-chatbot/chatbot-widget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0C0C0C",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    // Base URL ensures relative URLs (canonical, images) resolve correctly
    metadataBase: new URL("https://cultistcircle.com"),
    title: {
      default: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
      template: "%s | Cultist Circle",
    },
    description:
      "Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator. Find optimal item combinations for 6h, 12h, and 14h sacrifices.",
    keywords: [
      "Escape from Tarkov",
      "Tarkov",
      "Cultist Circle",
      "Calculator",
      "EFT",
      "Ritual",
      "Base Value",
      "Items",
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
      description:
        "Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator. Find optimal item combinations for 6h, 12h, and 14h sacrifices.",
      siteName: "Cultist Circle Calculator",
      url: "/",
      images: [
        {
          // Serve from same domain to avoid third-party fetch issues
          url: "/images/og2.png",
          width: 1200,
          height: 630,
          alt: "Cultist Circle Calculator preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
      description:
        "Get the best Cultist Circle rewards in Escape from Tarkov.",
      creator: "@wilsman77",
      site: "@wilsman77",
      images: ["/images/og2.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Google Analytics */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-MDQ1Z37Y5M" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){ dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', 'G-MDQ1Z37Y5M');
          `}
        </Script>

        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4028411901202065"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Buy Me a Coffee */}
        <Script
          id="bmc-widget"
          strategy="afterInteractive"
          data-name="BMC-Widget"
          data-cfasync="false"
          src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
          data-id="wilsman77"
          data-description="Support me on Buy me a coffee!"
          data-message=""
          data-color="#5F7FFF"
          data-position="Right"
          data-x_margin="50"
          data-y_margin="50"
        />
        <PostHogProvider>
            <CookieConsentProvider>
            <LanguageProvider>
                <main className="relative min-h-screen">
                  {/* Background color */}
              <div className="fixed inset-0 -z-10 bg-[#101720]" />
    
              {/* Content */}
              <div className="relative z-10">{children}</div>
    
              {/* Cookie consent and notifications */}
              <div className="relative z-50">
                    <ChatbotWidget />
                <CookieConsent />
                    <SonnerToaster />
                  </div>
                </main>
            </LanguageProvider>
            </CookieConsentProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
