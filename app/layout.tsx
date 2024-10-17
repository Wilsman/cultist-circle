import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import localFont from "next/font/local";
import "./globals.css";
import Script from "next/script";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Cultist Circle Calculator",
  description:
    "A tool to calculate the total ritual value of items for cultist rewards in Tarkov.",
  openGraph: {
    images: [
      {
        url: "https://www.cultistcircle.com/images/cultist-circle.jpeg",
        width: 800,
        height: 600,
        alt: "Cultist Circle",
      },
    ],
  },
  twitter: {
    images: [
      {
        url: "https://www.cultistcircle.com/images/cultist-circle.jpeg",
        width: 800,
        height: 600,
        alt: "Cultist Circle",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CookieConsentProvider>
          {children}
          <Analytics />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
