"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Image from "next/image";

export function MaintenanceNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        w-full rounded-2xl border border-sky-500/40 bg-gradient-to-br
        from-sky-400/15 via-slate-950/80 to-slate-950/95 px-4 py-3 text-left
        shadow-[0_18px_30px_-20px_rgba(0,0,0,0.8)] transition-all duration-500
        animate-[pulse-color_4s_ease-in-out_infinite]
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-sky-300 mt-0.5 drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]" />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-sky-100">
            New Feature: Flea Market Level Filter
          </p>
          <p className="text-[11px] uppercase tracking-wider text-sky-200/70">
            Updated: December 1, 2025
          </p>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-slate-100/90 leading-relaxed">
        You can now filter out items based on your PMC level! Open Settings →
        General → &quot;Flea Market Level Filter&quot; to enable it and enter
        your level. Items you can&apos;t buy yet will be excluded from Auto
        Select. Please report any errors if found!
      </p>
      <div className="mt-3 pt-3 border-t border-sky-500/20 flex items-start gap-3">
        <Image
          src="https://assets.tarkov.dev/68f261f6928cd23ddf0471fd-icon.webp"
          alt="Figurine"
          width={32}
          height={32}
          className="rounded object-contain"
        />
        <p className="text-[12px] text-slate-100/90 leading-relaxed">
          <span className="font-semibold text-sky-100">New Figurines:</span>{" "}
          We&apos;ve tested some of the new figurines (not all) and have not
          found any new recipes from them - assuming no new special recipes for
          now.
        </p>
      </div>
    </div>
  );
}
