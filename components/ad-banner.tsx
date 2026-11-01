"use client";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

import React, { useEffect, useRef } from "react";

const AD_CLIENT = "ca-pub-4028411901202065";

type AdBannerProps = {
  dataAdSlot: string;
} & (
  | { dataAdFormat: string; dataFullWidthResponsive: boolean; size?: never }
  | { size: { width: number; height: number }; dataAdFormat?: never }
);

const AdBanner: React.FC<AdBannerProps> = (props) => {
  const { dataAdSlot } = props;
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    if (isAdLoaded.current) return;
    let retryTimeout: number | undefined;
    let retries = 0;
    const maxRetries = 20;

    const loadAd = () => {
      const ad = adRef.current;
      // Skip ads hidden by CSS (for example a desktop-only column on mobile).
      // AdSense can't size them and would log errors.
      if (!ad || isAdLoaded.current || ad.offsetParent === null) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isAdLoaded.current = true;
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

  if (props.size) {
    const { width, height } = props.size;
    return (
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "inline-block", width, height }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={dataAdSlot}
      />
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          minHeight: "100px",
        }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={dataAdSlot}
        data-ad-format={props.dataAdFormat}
        data-full-width-responsive={props.dataFullWidthResponsive.toString()}
      />
    </div>
  );
};

export default AdBanner;
