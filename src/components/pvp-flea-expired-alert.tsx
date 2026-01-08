import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ChevronDown } from "lucide-react";

export function PvpFleaExpiredAlert() {
  return (
    <div className="flex items-center justify-center px-3 sm:px-4 md:px-8">
      <Alert
        variant="default"
        className="
          group relative mb-3 overflow-hidden rounded-xl
          border border-red-500/25 dark:border-red-500/30
          bg-white/70 dark:bg-slate-900/40 backdrop-blur
          shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]
          transition-colors duration-300
          w-full max-w-3xl
        "
      >
        {/* Left accent */}
        <div className="absolute inset-y-0 left-0 w-1 bg-red-500/60 dark:bg-red-500/50" aria-hidden />
        {/* Ambient glow sweep */}
        <div className="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute -top-1/3 right-0 h-[200%] w-1/2 rotate-12 bg-gradient-to-b from-red-400/10 via-transparent to-transparent blur-2xl" />
        </div>

        <details className="group w-full open:mb-1" open>
          <summary className="flex items-center justify-between cursor-pointer list-none p-3 sm:p-4 md:p-5">
            <AlertTitle
              className="
                flex items-center gap-2
                text-sm font-semibold tracking-wide
                text-red-900 dark:text-red-100
              "
            >
              <span
                className="
                  inline-flex h-6 w-6 items-center justify-center
                  rounded-md bg-red-500/10 text-red-600 dark:text-red-300
                  ring-1 ring-red-500/20
                "
              >
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              PVP Flea Prices Expired - Added Trader Prices
            </AlertTitle>
            <ChevronDown className="h-4 w-4 shrink-0 text-red-600/80 dark:text-red-300/80 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5">
            <AlertDescription className="mt-1 space-y-2">
              <p className="text-sm text-red-950/90 dark:text-red-50/95 leading-relaxed">
                Flea Market pricing is no longer available in <strong>PVP</strong> because the Flea Market is turned off. Use <strong>Settings → Price Mode</strong> to switch to <strong>Trader prices</strong>, then choose your <strong>Trader Levels</strong> to calculate using trader-only prices.
              </p>
            </AlertDescription>
            <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/10">
              <p className="text-xs text-gray-500 dark:text-gray-400">⚠️ Traders are currently work-in-progress, known limitations: all quest locked items present.</p>
            </div>
          </div>
        </details>

      </Alert>
    </div>
  );
}
