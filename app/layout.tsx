import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
