/* eslint-disable @next/next/no-img-element */
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
        relative z-10 block w-full cursor-pointer overflow-hidden rounded-xl
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
            Latest Recipe Update
          </p>
          <p className="text-[11px] uppercase tracking-wider text-sky-200/70">
            Updated: March 27, 2026
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-sky-300 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-2 text-[12px] text-slate-100/90 leading-relaxed">
        Hideout Cat figurine now crafts into Cat figurine in 66 mins. Click to
        view the latest recipes and check the full list.
      </p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-sky-100/90">
        <img
          src="https://assets.tarkov.dev/68f260d7b84c6e1f8a09cffd-icon.webp"
          alt="Hideout Cat figurine"
          width={24}
          height={24}
          className="rounded"
          loading="lazy"
        />
        <span className="font-medium">Hideout Cat figurine</span>
        <span className="text-sky-300/80">-&gt;</span>
        <img
          src="https://assets.tarkov.dev/59e3658a86f7741776641ac4-icon.webp"
          alt="Cat figurine"
          width={24}
          height={24}
          className="rounded"
          loading="lazy"
        />
        <span className="font-medium">Cat figurine</span>
      </div>
    </Link>
  );
}
