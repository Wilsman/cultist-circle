import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import CookieConsent from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsentProvider } from "@/context/cookie-consent-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cultist Circle Calculator",
  description: "Calculate the optimal items for your Cultist Circle runs in Escape from Tarkov",
  keywords: [
    "Escape from Tarkov",
    "EFT",
    "Cultist Circle",
    "Calculator",
    "Optimal Items",
    "Tarkov Calculator",
  ],
  authors: [{ name: "Wilsman77" }],
  creator: "Wilsman77",
  publisher: "Wilsman77",
  openGraph: {
    title: "Cultist Circle Calculator",
    description: "Calculate the optimal items for your Cultist Circle runs in Escape from Tarkov",
    url: "https://cultist-circle.vercel.app",
    siteName: "Cultist Circle Calculator",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cultist Circle Calculator",
    description: "Calculate the optimal items for your Cultist Circle runs in Escape from Tarkov",
    creator: "@wilsman77",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <CookieConsentProvider>
          <main className="relative min-h-screen">
            {/* Background gradient effects */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-b from-gray-900 to-black" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_500px_at_50%_200px,#3b82f6,transparent)]" />
            
            {/* Content */}
            <div className="relative z-10">
              {children}
            </div>

            {/* Cookie consent and notifications */}
            <div className="relative z-50">
              <CookieConsent />
              <Toaster />
            </div>
          </main>
        </CookieConsentProvider>

        {/* Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
