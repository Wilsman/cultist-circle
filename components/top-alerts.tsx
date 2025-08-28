import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, BadgeCheck, ChevronDown } from "lucide-react";

interface TopAlertsProps {
  isPVE: boolean;
}

export function TopAlerts({ isPVE }: TopAlertsProps) {
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
          {/* New special task announcement (always visible, top-most) */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/20">
              🔥
            </span>
            <span className="truncate font-semibold">
              New: Friend from Norvinsk – Part 5 recipe
            </span>
            <Link
              href="/recipes"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-300/40 dark:border-slate-700/40 bg-white/50 dark:bg-slate-900/30 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-900/50 transition-colors"
            >
              View
            </Link>
          </div>

          {!isPVE && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] sm:text-[12px] text-red-800 dark:text-red-200 ring-1 ring-red-500/25">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-red-500/15 text-red-600 dark:text-red-300 ring-1 ring-red-500/20">
                <AlertTriangle className="h-3 w-3" />
              </span>
              <span className="font-semibold truncate">
                PVP Flea is back (35+). Prices coming soon. Trader prices still available.
              </span>
            </div>
          )}

          {/* Labyrinth figurines tip in header */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
            <Image
              src="https://assets.tarkov.dev/679b9d43597ba2ed120c3d44-icon.webp"
              alt="Labyrinth figurine"
              width={32}
              height={32}
              className="rounded"
            />
            <div className="min-w-0 flex flex-col">
              <span className="truncate font-semibold">
                You can get Labyrinth figurines from the 6-hour rituals
              </span>
              <span className="text-[10px] leading-tight text-slate-600 dark:text-slate-400">
                Might require having the prestige task New Beginning active
              </span>
            </div>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              Confirmed
            </span>
          </div>
          {/* First combo preview (always visible) */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
            <Image
              src="https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp"
              alt="MP5"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="font-semibold">5× MP5</span>
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
              <Image
                src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                alt="Peacekeeper"
                width={14}
                height={14}
                className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
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
                Expand to view most popular sacrifices — found by our amazing community
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-2.5 sm:px-3.5 pb-3 sm:pb-4">
            <div className="flex flex-col items-start gap-3 sm:gap-4">
              <div className="min-w-0 w-full">
                <AlertDescription className="mt-1 space-y-2">
                  {/* Example rows */}
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
                    <Image
                      src="https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp"
                      alt="MP5"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">4× MP5</span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
                      <Image
                        src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                        alt="Peacekeeper"
                        width={14}
                        height={14}
                        className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
                      />
                      <span className="font-medium">LL1</span>
                    </span>
                    <span className="opacity-60">+</span>
                    <Image
                      src="https://assets.tarkov.dev/590c645c86f77412b01304d9-icon.webp"
                      alt="Diary"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">1× Diary</span>
                    <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">
                      400K+ (6h & 14h)
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
                    <Image
                      src="https://assets.tarkov.dev/60479c3f420fac5ebc199f86-icon.webp"
                      alt="STM-9"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">3× STM-9</span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
                      <Image
                        src="https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp"
                        alt="Skier"
                        width={14}
                        height={14}
                        className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
                      />
                      <span className="font-medium">LL2</span>
                    </span>
                    <span className="opacity-60">+</span>
                    <Image
                      src="https://assets.tarkov.dev/5a13df5286f774032f5454a0-icon.webp"
                      alt="Saiga-9"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">1× Saiga-9</span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
                      <Image
                        src="https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp"
                        alt="Skier"
                        width={14}
                        height={14}
                        className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
                      />
                      <span className="font-medium">LL1</span>
                    </span>
                    <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">
                      14h (+1 STM for 6h)
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/60 dark:bg-white/5 px-3 py-1.5 text-[11px] sm:text-[12px] text-slate-800 dark:text-slate-200 ring-1 ring-black/5 dark:ring-white/10">
                    <Image
                      src="https://assets.tarkov.dev/59411abb86f77478f702b5d2-icon.webp"
                      alt="HK MP5 9x19 submachine gun (Navy 3 Round Burst) SD"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">
                      2× MP5 SD
                    </span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
                      <Image
                        src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                        alt="Peacekeeper"
                        width={14}
                        height={14}
                        className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
                      />
                      <span className="font-medium">LL2</span>
                    </span>
                    <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">
                      Cheap 14h(only)
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
