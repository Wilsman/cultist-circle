import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsentProvider } from "@/context/cookie-consent-context";
import Script from "next/script";
// import { PostHogProvider } from "@/components/PostHogProvider";

export const metadata: Metadata = {
  title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
  description:
    "Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator. Find optimal item combinations for 6h, 12h, and 14h sacrifices with real-time flea market data. Auto-select best items, pin favorites, and share sacrifices.",
  keywords: [
    "Escape from Tarkov",
    "EFT",
    "Cultist Circle",
    "Calculator",
    "Tarkov Sacrifices",
    "Cultist Circle Sacrifices",
    "Best Cultist Circle Sacrifices",
    "6h Sacrifices",
    "12h Sacrifices",
    "14h Sacrifices",
    "Quest Items",
    "Hideout Items",
    "Tarkov Flea Market",
    "Optimal Sacrifices",
    "Tarkov Tools",
    "Tarkov Helper",
  ],
  authors: [{ name: "Wilsman77" }],
  creator: "Wilsman77",
  publisher: "Wilsman77",
  openGraph: {
    title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
    description:
      "Find the perfect item combinations for Cultist Circle sacrifices in Escape from Tarkov. Get 6h quest/hideout rewards with our smart calculator and real-time market data.",
    url: "https://www.cultistcircle.com/",
    siteName: "Cultist Circle Calculator",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://pub-226fae05b0214cbeb8e3cb97c8fb6293.r2.dev/cultist-circle.jpeg",
        width: 1200,
        height: 630,
        alt: "Cultist Circle Calculator - Optimize Your EFT Sacrifices",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
    description:
      "Get the best Cultist Circle rewards in Escape from Tarkov. Find optimal item combinations for 6h, 12h, and 14h sacrifices with real-time market data.",
    creator: "@wilsman77",
    // images: ["/twitter-card.jpg"], // TODO: Add Twitter card
  },
  metadataBase: new URL("https://www.cultistcircle.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark antialiased">
      <head>
        {/* <!-- Google tag (gtag.js) --> */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-MDQ1Z37Y5M"
        ></Script>
        <Script id="google-analytics">
          {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-MDQ1Z37Y5M');
        `}
        </Script>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4028411901202065"
          crossOrigin="anonymous"
        ></script>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Buy Me a Coffee Widget Script - Using Next.js Script component for proper loading */}
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
        {/* <PostHogProvider> */}
          <CookieConsentProvider>
            <main className="relative min-h-screen">
              {/* Background color */}
              <div className="fixed inset-0 -z-10 bg-[#101720]" />

              {/* Content */}
              <div className="relative z-10">{children}</div>

              {/* Cookie consent and notifications */}
              <div className="relative z-50">
                <CookieConsent />
                <Toaster />
              </div>
            </main>
          </CookieConsentProvider>
        {/* </PostHogProvider> */}
      </body>
    </html>
  );
}
