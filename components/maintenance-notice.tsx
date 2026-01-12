"use client";

import { useEffect, useState } from "react";
import { CandyCane, ArrowRight } from "lucide-react";
import Link from "next/link";

export function MaintenanceNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Link
      href="/recipes"
      className={`
        relative z-10 mx-auto block w-full max-w-xl cursor-pointer overflow-hidden rounded-xl
        border border-sky-500/60 bg-gradient-to-br
        from-sky-400/20 via-slate-950/85 to-slate-950/95 px-4 py-3 text-left
        shadow-[0_18px_30px_-20px_rgba(0,0,0,0.8)]
        hover:border-sky-400/80 hover:from-sky-400/30 hover:shadow-[0_20px_40px_-15px_rgba(56,189,248,0.3)]
        transition-all duration-300 ease-in-out transform hover:scale-[1.02]
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
    >
      <div
        className={`
          absolute inset-0 -z-10 animate-[pulse-color_4s_ease-in-out_infinite]
        `}
      ></div>
      <div className="flex items-start gap-3">
        <CandyCane className="h-5 w-5 text-sky-300 mt-0.5 drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]" />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold text-sky-100">
            New Recipes Added - Patch 1.0.1.0
          </p>
          <p className="text-[11px] uppercase tracking-wider text-sky-200/70">
            Updated: December 24, 2025
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-sky-300 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-2 text-[12px] text-slate-100/90 leading-relaxed">
        🎉 New crafting recipes are now available! Christmas ornaments, golden
        items, medical supplies, and more were added in Patch 1.0.1.0
        (24/12/2025). Click to view all recipes!
      </p>
    </Link>
  );
}
