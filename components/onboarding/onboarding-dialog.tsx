"use client";

import React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Gem,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Timer,
  WandSparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cc_onboarding_seen_v1";
const SHOW_DELAY_MS = 1200;

const EXAMPLE_ITEMS = [
  { id: "5c0530ee86f774697952d952", name: "LEDX Skin Transilluminator" },
  { id: "57347ca924597744596b4e71", name: "Graphics card" },
  { id: "59faff1d86f7746c51718c9c", name: "Physical Bitcoin" },
  { id: "59faf7ca86f7740dbe19f6c2", name: "Roler Submariner gold wrist watch" },
  { id: "5c12620d86f7743f8b198b72", name: "Tetriz portable game console" },
];

// Running totals as each example item lands in the circle.
const EXAMPLE_TOTALS = [0, 62_000, 157_000, 235_000, 322_000, 412_000];
const METER_MAX = 450_000;

const TIERS = [
  { range: "400k+", time: "6h or 14h", note: "25% quest/hideout", hot: true },
  { range: "350k+", time: "14h", note: "High value", hot: true },
  { range: "200–350k", time: "12h" },
  { range: "100–200k", time: "8h" },
  { range: "50–100k", time: "5h" },
  { range: "25–50k", time: "4h" },
  { range: "10–25k", time: "3h" },
  { range: "0–10k", time: "2h" },
];

const formatRoubles = (value: number) =>
  `₽${Math.round(value).toLocaleString("en-US")}`;

/* ------------------------------------------------------------------ */
/* Visuals                                                             */
/* ------------------------------------------------------------------ */

function SacrificeVisual({ reduce }: { reduce: boolean }) {
  const total = useMotionValue(
    reduce ? EXAMPLE_TOTALS[EXAMPLE_TOTALS.length - 1] : 0,
  );
  const totalText = useTransform(total, formatRoubles);
  const fillWidth = useTransform(total, [0, METER_MAX], ["0%", "100%"]);
  const [reached, setReached] = React.useState(() => (reduce ? 2 : 0));

  useMotionValueEvent(total, "change", (value) => {
    setReached(value >= 400_000 ? 2 : value > 350_000 ? 1 : 0);
  });

  React.useEffect(() => {
    if (reduce) return;
    const steps = EXAMPLE_TOTALS.length - 1;
    const controls = animate(total, EXAMPLE_TOTALS, {
      duration: 0.42 * steps,
      delay: 0.45,
      ease: "easeOut",
      times: EXAMPLE_TOTALS.map((_, i) => i / steps),
    });
    return () => controls.stop();
  }, [reduce, total]);

  return (
    <div className="w-full max-w-[400px] space-y-5 px-6">
      <div className="flex justify-center gap-2 sm:gap-3">
        {EXAMPLE_ITEMS.map((item, i) => (
          <div
            key={item.id}
            className="relative h-14 w-14 rounded-xl border border-dashed border-white/15 bg-white/[0.03] sm:h-16 sm:w-16"
          >
            <motion.img
              src={`https://assets.tarkov.dev/${item.id}-icon.webp`}
              alt={item.name}
              className="absolute inset-0 h-full w-full rounded-xl border border-amber-400/40 bg-slate-900 object-contain p-1 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
              initial={reduce ? false : { y: -36, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: 0.45 + i * 0.42,
                type: "spring",
                stiffness: 320,
                damping: 18,
              }}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total base value
          </span>
          <motion.span
            className={cn(
              "font-mono text-lg font-bold tabular-nums transition-colors duration-300",
              reached === 2 ? "text-amber-300" : "text-white",
            )}
          >
            {totalText}
          </motion.span>
        </div>
        <div className="relative h-2.5 rounded-full bg-white/10">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-slate-400 via-amber-400 to-orange-500"
            style={{ width: fillWidth }}
          />
          {[350_000, 400_000].map((mark, i) => (
            <div
              key={mark}
              className="absolute -top-1 bottom-[-4px] w-px bg-white/40"
              style={{ left: `${(mark / METER_MAX) * 100}%` }}
            >
              <span
                className={cn(
                  "absolute top-full mt-1 -translate-x-1/2 text-[10px] font-semibold tabular-nums transition-colors duration-300",
                  reached > i ? "text-amber-300" : "text-slate-500",
                )}
              >
                {mark / 1000}k
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TiersVisual({ reduce }: { reduce: boolean }) {
  return (
    <div className="w-full max-w-[420px] space-y-1 pl-4 pr-12 sm:px-6">
      {TIERS.map((tier, i) => (
        <div key={tier.range} className="flex items-center gap-2.5">
          <span
            className={cn(
              "w-[4.5rem] shrink-0 text-right font-mono text-[11px] tabular-nums",
              tier.hot ? "font-bold text-amber-300" : "text-slate-500",
            )}
          >
            {tier.range}
          </span>
          <div className="relative h-4 flex-1 sm:h-5">
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 flex items-center rounded-full px-2",
                tier.hot
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_16px_rgba(251,146,60,0.45)]"
                  : "bg-slate-700/70",
              )}
              initial={reduce ? false : { width: "0%" }}
              animate={{ width: `${100 - i * 10}%` }}
              transition={{
                delay: 0.15 + (TIERS.length - i) * 0.06,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-semibold sm:text-[11px]",
                  tier.hot ? "text-slate-950" : "text-slate-300",
                )}
              >
                {tier.time}
                {tier.note ? (
                  <span className="hidden font-medium opacity-80 sm:inline">
                    {" "}
                    · {tier.note}
                  </span>
                ) : null}
              </span>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

const WORKFLOW = [
  { icon: SlidersHorizontal, label: "Set mode & target" },
  { icon: WandSparkles, label: "Auto Select", highlight: true },
  { icon: Timer, label: "Start & track" },
];

function WorkflowVisual({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative flex w-full max-w-[440px] items-start justify-between px-6">
      <div className="absolute left-[16%] right-[16%] top-8 h-px bg-slate-700/60">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-emerald-400/0 via-emerald-400 to-emerald-400/0"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 1.1, ease: "easeInOut" }}
        />
      </div>
      {WORKFLOW.map(({ icon: Icon, label, highlight }, i) => (
        <motion.div
          key={label}
          className="relative flex w-24 flex-col items-center gap-2.5 text-center sm:w-28"
          initial={reduce ? false : { y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.25, type: "spring", damping: 16 }}
        >
          <div
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-2xl border",
              highlight
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.3)]"
                : "border-slate-700/50 bg-slate-800 text-slate-300",
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={2} />
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-slate-300 ring-1 ring-slate-600/60">
              {i + 1}
            </span>
            {highlight && !reduce ? (
              <motion.span
                className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400"
                animate={{ opacity: [0, 0.8, 0], scale: [1, 1.18, 1.3] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
              />
            ) : null}
          </div>
          <span className="text-xs font-semibold leading-tight text-slate-200">
            {label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

interface Step {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  extra?: React.ReactNode;
  visual: (reduce: boolean) => React.ReactNode;
}

const STEPS: Step[] = [
  {
    eyebrow: "Welcome to Cultist Circle",
    title: "Five items, one total",
    body: "Put up to 5 items in the circle. Their base values add up, and that total decides your reward. We find the cheapest combo from live flea and trader prices.",
    extra: "Base value = trader sell price ÷ that trader's multiplier.",
    visual: (reduce) => <SacrificeVisual reduce={reduce} />,
  },
  {
    eyebrow: "Reward tiers",
    title: "Aim for 350k or 400k",
    body: (
      <>
        Above <strong className="text-white">₽350,000</strong> you get
        high‑value loot after 14h. At{" "}
        <strong className="text-white">₽400,000</strong> there&apos;s also a 25%
        chance of quest or hideout items in just 6h.
      </>
    ),
    extra: (
      <span className="inline-flex items-center gap-1.5">
        <Gem className="h-3.5 w-3.5 text-sky-300" />A Sacred Amulet adds 15% to
        the total.
      </span>
    ),
    visual: (reduce) => <TiersVisual reduce={reduce} />,
  },
  {
    eyebrow: "Your workflow",
    title: "Three steps to a ritual",
    body: "Pick your mode and target, hit Auto Select for the cheapest combo, then start the ritual timer and share your build.",
    extra: (
      <span className="inline-flex items-center gap-1.5">
        <ScanLine className="h-3.5 w-3.5 text-emerald-300" />
        Scan your stash to only use items you already own.
      </span>
    ),
    visual: (reduce) => <WorkflowVisual reduce={reduce} />,
  },
];

function StepCopy({ step, live = false }: { step: Step; live?: boolean }) {
  const Title = live ? DialogTitle : "h2";
  const Description = live ? DialogDescription : "p";
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
        {step.eyebrow}
      </p>
      <Title className="text-2xl font-bold tracking-tight text-white sm:text-[26px]">
        {step.title}
      </Title>
      <Description className="text-[15px] leading-relaxed text-slate-300">
        {step.body}
      </Description>
      {step.extra ? (
        <p className="text-xs text-slate-400">{step.extra}</p>
      ) : null}
    </div>
  );
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -48, opacity: 0 }),
};

export function OnboardingDialog() {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = React.useState(false);

  // Only show once per browser. Wait for the page to finish loading (plus a
  // short settle) so the intro animations don't stutter during hydration.
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) != null) return;
    } catch {
      // ignore storage errors
      return;
    }
    let timer: number | undefined;
    const show = () => {
      timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    };
    if (document.readyState === "complete") show();
    else window.addEventListener("load", show, { once: true });
    return () => {
      window.removeEventListener("load", show);
      window.clearTimeout(timer);
    };
  }, []);
  const [[index, direction], setStep] = React.useState<[number, number]>([
    0, 1,
  ]);
  const step = STEPS[index];
  const primaryRef = React.useRef<HTMLButtonElement>(null);
  const isLast = index === STEPS.length - 1;

  function goTo(next: number) {
    if (next < 0 || next >= STEPS.length || next === index) return;
    setStep([next, next > index ? 1 : -1]);
  }

  function handleClose() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
      // Same-tab listeners (the home page alerts) wait for this flag.
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -400) goTo(index + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) goTo(index - 1);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          primaryRef.current?.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(index + 1);
          if (e.key === "ArrowLeft") goTo(index - 1);
        }}
        className="w-[calc(100vw-1.5rem)] max-w-[520px] gap-0 overflow-hidden rounded-[20px] border-slate-700/50 bg-slate-900 p-0 shadow-2xl shadow-black/60 sm:rounded-[20px] [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-20 [&>button:last-child]:bg-slate-900/50 [&>button:last-child]:text-slate-300 [&>button:last-child]:backdrop-blur"
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleDragEnd}
          className="touch-pan-y"
        >
          <div className="relative flex h-[220px] items-center justify-center overflow-hidden border-b border-slate-700/40 bg-slate-800/60 bg-[radial-gradient(ellipse_at_50%_130%,rgba(245,158,11,0.14),transparent_65%)] sm:h-[250px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.25 }}
              >
                {step.visual(reduce)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Every step's copy shares one grid cell so the dialog keeps the
              height of the longest step instead of jumping between steps. */}
          <div className="grid overflow-hidden px-6 pt-6 sm:px-8">
            {STEPS.map((s) => (
              <div
                key={s.eyebrow}
                aria-hidden
                className="invisible [grid-area:1/1]"
              >
                <StepCopy step={s} />
              </div>
            ))}
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
                className="[grid-area:1/1]"
              >
                <StepCopy step={step} live />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-5 sm:px-8">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.eyebrow}
                type="button"
                aria-label={`Go to step ${i + 1}: ${s.eyebrow}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => goTo(i)}
                className="group flex h-6 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    i === index
                      ? "w-6 bg-emerald-400"
                      : i < index
                        ? "w-1.5 bg-emerald-400/50 group-hover:bg-emerald-400/80"
                        : "w-1.5 bg-slate-600 group-hover:bg-slate-500",
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index === 0 ? (
              <button
                type="button"
                onClick={handleClose}
                className="h-10 rounded-xl px-4 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
              >
                Skip
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous step"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/40 bg-slate-800/40 text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <motion.button
              ref={primaryRef}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => (isLast ? handleClose() : goTo(index + 1))}
              className="group flex h-10 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 pl-4 pr-3.5 text-sm font-semibold text-emerald-400 outline-none transition-all duration-200 hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              {isLast ? "Get started" : index === 0 ? "Show me how" : "Next"}
              {isLast ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
