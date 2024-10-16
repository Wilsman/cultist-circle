"use client";

import React, { useEffect, useRef } from "react";

type AdBannerProps = {
  dataAdSlot: string;
  dataAdFormat: string;
  dataFullWidthResponsive: boolean;
};

const AdBanner: React.FC<AdBannerProps> = ({
  dataAdSlot,
  dataAdFormat,
  dataFullWidthResponsive,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    if (isAdLoaded.current) return;

    const loadAd = () => {
      try {
        if (adRef.current && !isAdLoaded.current) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          isAdLoaded.current = true;
        }
      } catch (error) {
        console.error("AdSense error:", error);
      }
    };

    if (window.adsbygoogle) {
      loadAd();
    } else {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4028411901202065`;
      script.async = true;
      script.onload = loadAd;
      document.head.appendChild(script);
    }

    return () => {
      isAdLoaded.current = false;
    };
  }, []);

  return (
    <div ref={adRef} className="w-full overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "auto", minHeight: "100px" }}
        data-ad-client="ca-pub-4028411901202065"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
};

export default AdBanner;
