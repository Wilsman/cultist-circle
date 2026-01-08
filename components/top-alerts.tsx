/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronDown } from "lucide-react";

export function TopAlerts() {
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
          transition-all duration-500 [transition-timing-function:cubic-bezier(.2,.8,.2,1)]
          will-change-transform
          animate-fade-in
          w-full max-w-3xl
        "
      >
        {/* Ambient glow sweep */}
        <div className="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute -top-1/3 right-0 h-[200%] w-1/2 rotate-12 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent blur-2xl" />
        </div>

        {/* Compact header row(s) */}
        <div className="flex flex-col gap-1 px-2.5 sm:px-3.5 pt-2">
          {/* New Recipes Announcement */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-950/40 dark:to-orange-950/40 px-3 py-1.5 text-[11px] sm:text-[12px] text-red-800 dark:text-red-200 ring-1 ring-red-500/20 dark:ring-red-400/20">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-red-500/15 text-red-600 dark:text-red-300 ring-1 ring-red-500/20">
              🎄
            </span>
            <span className="truncate font-semibold whitespace-pre-wrap">
              <span className="text-red-700 dark:text-red-300">
                🎉 New recipes added! Christmas ornaments, golden items, medical
                supplies, and more are now craftable.
                <br />
                Added in Patch 1.0.1.0 (24/12/2025).{" "}
                <Link
                  href="/recipes"
                  className="underline hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  Visit the Recipes page to check them out!
                </Link>
              </span>
            </span>
          </div>

          {/* New special task announcement (hidden) */}
          {false && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/20">
                🔥
              </span>
              <span className="truncate font-semibold">
                Weapon base values can be found in the{" "}
                <Link
                  href="/base-values"
                  className="underline hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                >
                  Base Values lookup
                </Link>{" "}
                - search by weapon name or use &quot;&lt;weapon&gt;
                default&quot; for trader prices. Values may vary; updates are
                ongoing.
              </span>
            </div>
          )}

          {/* Combined Base Values and Settings tip */}
          <div className="flex items-start gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold leading-tight text-red-800 dark:text-red-200">
                We are still working on finding the correct multiplier for
                Weapon base values, please use the{" "}
                <Link
                  href="/base-values"
                  className="underline hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                >
                  Base Values lookup
                </Link>{" "}
                page. To display weapons in the calculator, go to Settings →
                Excluded Categories and uncheck &quot;Weapon&quot;.
              </span>
              <span className="block text-[10px] leading-tight text-red-600 dark:text-red-400 mt-0.5">
                Caution: Weapon base values are higher than shown in the app, we
                are working on finding the correct multiplier for weapons.
              </span>
            </div>
          </div>
          {/* First combo preview (always visible) */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
            <img
              src="https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp"
              alt="MP5"
              width={32}
              height={32}
              className="rounded"
              fetchPriority="low"
              loading="lazy"
            />
            <span className="font-semibold">5× MP5</span>
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
              <img
                src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                alt="Peacekeeper"
                width={14}
                height={14}
                className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
                fetchPriority="low"
                loading="lazy"
              />
              <span className="font-medium">LL1</span>
            </span>
            <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">
              400K+ (6h & 14h)
            </span>
          </div>
        </div>

        <details className="group w-full open:mb-1">
          <summary className="flex items-center justify-between cursor-pointer list-none p-2 sm:p-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline text-[10px] font-medium text-slate-500/90 ml-1 truncate">
                Expand to view featured new recipes from Patch 1.0.1.0
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-2.5 sm:px-3.5 pb-3 sm:pb-4">
            <div className="flex flex-col items-start gap-3 sm:gap-4">
              <div className="min-w-0 w-full">
                <AlertDescription className="mt-1 space-y-2">
                  {/* New Recipe Examples */}
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
                    <img
                      src="https://assets.tarkov.dev/5df8a72c86f77412640e2e83-icon.webp"
                      alt="Christmas tree ornament (White)"
                      width={32}
                      height={32}
                      className="rounded"
                      fetchPriority="low"
                      loading="lazy"
                    />
                    <span className="font-semibold">
                      1× Christmas ornament (White)
                    </span>
                    <span className="opacity-60">➡️</span>
                    <img
                      src="https://assets.tarkov.dev/5df8a77486f77412672a1e3f-icon.webp"
                      alt="Christmas tree ornament (Violet)"
                      width={32}
                      height={32}
                      className="rounded"
                      fetchPriority="low"
                      loading="lazy"
                    />
                    <span className="font-semibold">
                      1× Christmas ornament (Violet)
                    </span>
                    <span className="ml-auto font-bold text-blue-600 dark:text-blue-400">
                      66 mins
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
                    <img
                      src="https://assets.tarkov.dev/62a09cfe4f842e1bd12da3e4-icon.webp"
                      alt="Golden egg"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">1× Tigzresq splint</span>
                    <span className="opacity-60">➡️</span>
                    <img
                      src="https://assets.tarkov.dev/62a09cfe4f842e1bd12da3e4-icon.webp"
                      alt="Golden egg"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">1× Golden egg</span>
                    <span className="ml-auto font-bold text-blue-600 dark:text-blue-400">
                      66 mins
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
                    <img
                      src="https://assets.tarkov.dev/590c695186f7741e566b64a2-icon.webp"
                      alt="Augmentin antibiotic pills"
                      width={32}
                      height={32}
                      className="rounded"
                      fetchPriority="low"
                      loading="lazy"
                    />
                    <span className="font-semibold">
                      1× Augmentin antibiotic pills
                    </span>
                    <span className="opacity-60">➡️</span>
                    <img
                      src="https://assets.tarkov.dev/5fca138c2a7b221b2852a5c6-icon.webp"
                      alt="xTG-12 antidote injector"
                      width={32}
                      height={32}
                      className="rounded"
                      fetchPriority="low"
                      loading="lazy"
                    />
                    <span className="font-semibold">
                      1× xTG-12 antidote injector
                    </span>
                    <span className="ml-auto font-bold text-blue-600 dark:text-blue-400">
                      66 mins
                    </span>
                  </div>
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

export default TopAlerts;
