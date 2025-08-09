import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PvpWipeTipAlert() {
  return (
    <div className="flex items-center justify-center px-3 sm:px-4 md:px-8">
      <Alert
        variant="default"
        className="
          group relative mb-4 overflow-hidden rounded-2xl
          border border-amber-300/30 dark:border-amber-300/15
          bg-[linear-gradient(180deg,rgba(255,248,236,0.75),rgba(255,239,224,0.6)),radial-gradient(1200px_400px_at_-20%_-10%,rgba(255,170,64,0.10),transparent)]
          dark:bg-[linear-gradient(180deg,rgba(60,30,0,0.45),rgba(40,18,0,0.35)),radial-gradient(1200px_400px_at_-20%_-10%,rgba(255,170,64,0.08),transparent)]
          backdrop-blur-xl
          shadow-[0_12px_40px_-14px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]
          dark:shadow-[0_14px_50px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)]
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

        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 md:p-5">
          {/* Product block */}
          <div className="relative shrink-0 self-center sm:self-auto">
            <div
              className="
                overflow-hidden rounded-xl
                ring-1 ring-black/5 dark:ring-white/10
                shadow-[0_8px_24px_-10px_rgba(0,0,0,0.35)]
                transition-transform duration-500 ease-out
                group-hover:scale-[1.02]
              "
            >
              <Image
                src="https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp"
                alt="MP5 Icon"
                width={60}
                height={60}
                className="w-12 h-12 sm:w-16 sm:h-16 object-cover"
              />
            </div>

            {/* Crisp counter badge */}
            <div
              className="
                absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6
                rounded-full bg-emerald-500 text-white
                text-[9px] sm:text-[10px] font-extrabold tracking-tight
                flex items-center justify-center
                shadow-[0_6px_18px_-6px_rgba(16,185,129,0.9)]
                ring-2 ring-white/70 dark:ring-white/20
              "
            >
              5
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <AlertTitle
              className="
                flex items-center gap-2
                text-[12px] sm:text-[13px] md:text-sm font-semibold tracking-wide
                text-amber-900 dark:text-amber-100
              "
            >
              <span
                className="
                  inline-flex h-5 w-5 items-center justify-center
                  rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300
                  ring-1 ring-amber-500/20
                "
              >
                🔥
              </span>
              Hardcore PVP Wipe Tip (L1 Traders)
            </AlertTitle>

            <AlertDescription className="mt-2 space-y-2">
              <div className="text-[12px] sm:text-[13px] text-amber-950/90 dark:text-amber-50/95 leading-relaxed">
                <span className="font-medium">
                  <strong>5× MP5</strong> from PeaceKeeper LL1
                </span>{" "}
                = <span className="font-bold text-emerald-600 dark:text-emerald-400">400K+ threshold</span>
              </div>

              {/* Price pill */}
              <div
                className="
                  inline-flex items-center gap-2 rounded-lg
                  bg-white/60 dark:bg-white/5
                  px-3 py-1.5
                  text-[11px] sm:text-[12px] font-mono tabular-nums
                  text-amber-900/90 dark:text-amber-50/90
                  ring-1 ring-black/5 dark:ring-white/10
                  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]
                  dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
                  whitespace-normal break-words
                "
              >
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

        {/* Precision underline + progress shimmer */}
        <div className="relative mx-3 sm:mx-4 md:mx-5 mb-1 mt-1">
          <div className="h-px w-full rounded-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent dark:via-amber-300/30" />
          <div className="pointer-events-none absolute inset-x-0 -top-[1px] h-[2px] overflow-hidden">
            <div className="animate-[shimmer_2.4s_ease-in-out_infinite] h-full w-1/2 sm:w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/25 rounded-full mx-auto" />
          </div>
        </div>
      </Alert>
    </div>
  );
}
