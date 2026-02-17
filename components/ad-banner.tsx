"use client";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

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
    let retryTimeout: number | undefined;
    let retries = 0;
    const maxRetries = 20;

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
      const retryLoad = () => {
        retries += 1;
        if (window.adsbygoogle) {
          loadAd();
          return;
        }
        if (retries < maxRetries) {
          retryTimeout = window.setTimeout(retryLoad, 250);
        }
      };
      retryTimeout = window.setTimeout(retryLoad, 250);
    }

    return () => {
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, []);

  return (
    <div ref={adRef} className="w-full overflow-hidden">
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          minHeight: "100px",
        }}
        data-ad-client="ca-pub-4028411901202065"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
};

export default AdBanner;
