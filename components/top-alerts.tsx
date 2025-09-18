import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronDown } from "lucide-react";

interface TopAlertsProps {}

export function TopAlerts({}: TopAlertsProps) {
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
          {/* PVP Flea Prices Back Announcement */}
          <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-50/80 to-green-50/80 dark:from-emerald-950/40 dark:to-green-950/40 px-3 py-1.5 text-[11px] sm:text-[12px] text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/20 dark:ring-emerald-400/20">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/20">
              🎉
            </span>
            <span className="truncate font-semibold whitespace-pre-wrap">
              <span className="text-emerald-700 dark:text-emerald-300">
                Great news! PVP flea market prices are now back in the app.
                <br />
                Switch to PVP mode and make sure to switch back to Flea Market
                Prices in the settings.
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
                Expand to view most popular sacrifices — found by our amazing
                community
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
                        src="https://assets.tarkov.dev/5c94bbff86f7747ee735c08f-icon.webp"
                      alt="Labs access"
                      width={32}
                      height={32}
                      className="rounded"
                    />
                    <span className="font-semibold">
                      1× Labs Access
                    </span>
                    <span className="opacity-60">➡️</span>
                    <Image
                      src="https://assets.tarkov.dev/6193e5f3aa34a3034236bdb3-icon.webp"
                      alt="HK G28 Patrol"
                      width={32}
                      height={32}
                      className="rounded"
                      />
                    <span className="font-semibold">1× HK G28 Patrol</span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300">
                      <Image
                        src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                        alt="Peacekeeper"
                        width={14}
                        height={14}
                        className="rounded-full ring-1 ring-black/10 dark:ring-white/10"
                        />
                      <span className="font-medium">LL3</span>
                    </span>
                    <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">
                      (6h & 14h)
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
