"use client";

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

import React, { useEffect, useRef } from "react";
import Script from "next/script";

type AdBannerProps = {
  dataAdSlot: string;
  dataAdFormat?: string;
  dataFullWidthResponsive?: boolean;
};

const AdBanner: React.FC<AdBannerProps> = ({
  dataAdSlot,
  dataAdFormat = "auto",
  dataFullWidthResponsive = true,
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Only push new ad if window.adsbygoogle exists
      if (typeof window !== "undefined" && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error("Error loading ad:", error);
    }
  }, []);

  return (
    <>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4028411901202065"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error("AdSense script failed to load:", e);
        }}
      />
      <div
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4028411901202065"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive}
      />
    </>
  );
};

export default AdBanner;
