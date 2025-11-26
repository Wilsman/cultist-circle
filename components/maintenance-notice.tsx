"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

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
        w-full rounded-2xl border border-amber-500/40 bg-gradient-to-br
        from-green-300/25 via-slate-900/70 to-slate-950/60 px-4 py-3 text-left
        shadow-[0_18px_30px_-20px_rgba(0,0,0,0.8)] transition-all duration-500
        animate-[pulse-color_4s_ease-in-out_infinite]
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="flex items-start gap-3">
        <Check className="h-5 w-5 text-amber-300 mt-0.5" />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-amber-50">
            We&apos;re Back!
          </p>
          <p className="text-[11px] uppercase tracking-wider text-amber-200/70">
            Updated: November 26, 2025
          </p>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-slate-100/90 leading-relaxed">
        The API has recovered from the 1.0 patch. Flea prices are syncing
        normally and all the new items are ready to sacrifice. 🤞
      </p>
    </div>
  );
}
