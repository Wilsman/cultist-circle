import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsentProvider } from "@/context/cookie-consent-context";
import Script from "next/script";
// import { PostHogProvider } from "@/components/PostHogProvider";

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  themeColor: "#0C0C0C",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
    description: "Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator. Find optimal item combinations for 6h, 12h, and 14h sacrifices.",
    openGraph: {
      type: "website",
      locale: "en_US",
      title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
      description: "Maximize your Escape from Tarkov Cultist Circle rewards with our advanced calculator. Find optimal item combinations for 6h, 12h, and 14h sacrifices.",
      images: [
        {
          url: 'https://assets.cultistcircle.com/og2.png',
          width: 1200,
          height: 630,
        },
      ],
      siteName: "Cultist Circle",
      url: "https://cultistcircle.com",
    },
    twitter: {
      card: "summary_large_image",
      title: "Cultist Circle Calculator | Optimize Your EFT Sacrifices",
      description: "Get the best Cultist Circle rewards in Escape from Tarkov.",
      creator: "@wilsman77",
      images: ['https://assets.cultistcircle.com/og2.png'],
    },
  };
}

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
