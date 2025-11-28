"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

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
            Updated: November 28, 2025
          </p>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-slate-100/90 leading-relaxed">
        You can now filter out items based on your PMC level! Open Settings →
        General → &quot;Flea Market Level Filter&quot; to enable it and enter
        your level. Items you can&apos;t buy yet will be excluded from Auto
        Select. 🎯
      </p>
    </div>
  );
}
