import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown } from "lucide-react";

export function PvpWipeTipAlert() {
  return (
    <div className="flex items-center justify-center px-3 sm:px-4 md:px-8">
      <Alert
        variant="default"
        className="
          group relative mb-2 overflow-hidden rounded-xl
          border border-slate-300/25 dark:border-slate-700/30
          bg-[linear-gradient(180deg,rgba(248,250,252,0.7),rgba(241,245,249,0.55)),radial-gradient(1200px_400px_at_-20%_-10%,rgba(148,163,184,0.08),transparent)]
          dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.45),rgba(15,23,42,0.35)),radial-gradient(1200px_400px_at_-20%_-10%,rgba(148,163,184,0.06),transparent)]
          backdrop-blur-xl
          shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)]
          dark:shadow-[0_10px_36px_-14px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.06)]
          transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]
          will-change-transform
          animate-fade-in
          w-full max-w-3xl
        "
      >
        {/* Ambient glow sweep */}
        <div className="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute -top-1/3 right-0 h-[200%] w-1/2 rotate-12 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent blur-2xl" />
        </div>
        <details className="group w-full open:mb-1">
          <summary className="flex items-center justify-between cursor-pointer list-none p-2 sm:p-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/15">💡</span>
              <span className="truncate text-[11px] sm:text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                Hardcore PVP Wipe Tip (L1 Traders)
              </span>
              <span className="hidden sm:inline text-[10px] font-medium text-slate-500/90 ml-1">
                5× MP5 = 400K+
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-2.5 sm:px-3.5 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              {/* Product block */}
              <div className="relative shrink-0 self-center sm:self-auto">
                <div className="overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_6px_18px_-10px_rgba(0,0,0,0.25)]">
                  <Image
                    src="https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp"
                    alt="MP5 Icon"
                    width={48}
                    height={48}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover"
                  />
                </div>
                {/* Crisp counter badge */}
                <div className="absolute -top-2 -right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-emerald-500/90 text-white text-[8px] sm:text-[9px] font-extrabold tracking-tight flex items-center justify-center shadow-[0_4px_14px_-6px_rgba(16,185,129,0.7)] ring-1 ring-white/70 dark:ring-white/20">
                  5
                </div>
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1">
                <AlertDescription className="mt-1 space-y-2">
                  <div className="text-[12px] sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                    <span className="font-medium"><strong>5× MP5</strong> from PeaceKeeper LL1</span>{" "}
                    = <span className="font-bold text-emerald-600 dark:text-emerald-400">400K+ threshold</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] font-mono tabular-nums text-slate-700/90 dark:text-slate-200/90 ring-1 ring-black/5 dark:ring-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                    <span className="opacity-70">💰 Cost</span>
                    <span>: $478 (63,547₽) × 5 =</span>
                    <span className="font-bold">$2,390 (317,735₽)</span>
                  </div>
                  <p className="text-[11px] sm:text-[12px] text-gray-500 dark:text-gray-400/90">
                    Investigating why some weapons are returning higher base values.
                  </p>
                </AlertDescription>
              </div>
            </div>
          </div>
        </details>

        {/* Precision underline + progress shimmer */}
        <div className="relative mx-3 sm:mx-4 md:mx-5 mb-1 mt-1">
          <div className="h-px w-full rounded-full bg-gradient-to-r from-transparent via-slate-400/40 to-transparent dark:via-slate-300/20" />
          <div className="pointer-events-none absolute inset-x-0 -top-[1px] h-[2px] overflow-hidden">
            <div className="animate-[shimmer_2.4s_ease-in-out_infinite] h-full w-1/2 sm:w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20 rounded-full mx-auto" />
          </div>
        </div>
      </Alert>
    </div>
  );
}
