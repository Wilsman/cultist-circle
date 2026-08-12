"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  BellOff,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coins,
  Download,
  FileJson,
  History,
  LineChart,
  PackageOpen,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompleteRitualDialog } from "@/components/ritual-tracker/complete-ritual-dialog";
import { GAME_MODE_LABELS, GAME_MODES, type GameMode } from "@/lib/game-mode";
import {
  deleteRitual,
  listRituals,
  updateRitual,
} from "@/lib/ritual-tracker-db";
import {
  calculateTrackerInsights,
  formatCountdown,
  formatDuration,
  getRitualRewardValue,
  isRitualReady,
  loadRitualCombinationIntoStorage,
} from "@/lib/ritual-tracker";
import {
  downloadRitualCalendar,
  downloadTrackerCsv,
  downloadTrackerJson,
} from "@/lib/ritual-tracker-export";
import {
  disableRitualNotifications,
  enableRitualNotifications,
  notificationsEnabled,
  notificationsSupported,
} from "@/lib/ritual-reminders";
import type {
  RewardValuation,
  RitualRecord,
  RitualStatus,
} from "@/types/ritual-tracker";

type ModeFilter = "all" | GameMode;
type StatusFilter = "all" | RitualStatus | "ready";
type DateFilter = "all" | "7" | "30" | "90";

function formatRubles(value: number | null): string {
  if (value === null) return "Incomplete";
  const rounded = Math.round(value);
  return `${rounded < 0 ? "-" : ""}₽${Math.abs(rounded).toLocaleString()}`;
}

function modeClasses(mode: GameMode): string {
  if (mode === "pve")
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (mode === "season")
    return "border-violet-400/25 bg-violet-400/10 text-violet-200";
  return "border-sky-400/25 bg-sky-400/10 text-sky-200";
}

function ModeBadge({ mode }: { mode: GameMode }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${modeClasses(mode)}`}
    >
      {GAME_MODE_LABELS[mode]}
    </span>
  );
}

function DeleteRitualButton({ ritual }: { ritual: RitualRecord }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete ritual"
          className="text-slate-500 hover:bg-red-400/10 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-white/10 bg-[#171a1f] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this ritual?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This removes its sacrifices, rewards, and contribution to your
            insights. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            Keep ritual
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void deleteRitual(ritual.id)}
            className="bg-red-500 text-white hover:bg-red-400"
          >
            Delete ritual
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AdjustTimerDialog({ ritual }: { ritual: RitualRecord }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(ritual.durationMinutes);

  const save = async () => {
    await updateRitual(ritual.id, {
      durationMinutes: duration,
      endsAt: ritual.startedAt + duration * 60_000,
      notificationSentAt: null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-400 hover:text-white"
        >
          <Clock3 className="mr-2 h-4 w-4" />
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#171a1f] text-white sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle>Adjust ritual timer</DialogTitle>
          <DialogDescription className="text-slate-400">
            Change this only to match the timer shown in-game.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm text-slate-300">
          Duration in minutes
          <Input
            type="number"
            min={1}
            max={24 * 60}
            value={duration}
            onChange={(event) =>
              setDuration(Math.max(1, Number(event.target.value) || 1))
            }
            className="border-white/10 bg-black/25 text-white"
          />
        </label>
        <DialogFooter>
          <Button
            onClick={save}
            className="bg-amber-500 text-black hover:bg-amber-400"
          >
            Save timer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActiveRitualCard({
  ritual,
  now,
}: {
  ritual: RitualRecord;
  now: number;
}) {
  const ready = isRitualReady(ritual, now);
  const elapsed = Math.max(0, now - ritual.startedAt);
  const duration = Math.max(1, ritual.endsAt - ritual.startedAt);
  const progress = Math.min(100, (elapsed / duration) * 100);

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-xl shadow-black/10 ${ready ? "border-emerald-400/30 bg-emerald-400/[0.07]" : "border-white/10 bg-[#171b21]/90"}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={ritual.mode} />
            <span
              aria-label={`Ritual duration ${formatDuration(ritual.durationMinutes)}`}
              title="Ritual duration"
              className="inline-flex h-6 items-center gap-1.5 rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/80"
            >
              <Clock3 className="h-3 w-3" />
              {formatDuration(ritual.durationMinutes)}
            </span>
          </div>
          <div>
            <p
              className={`font-mono text-3xl font-semibold tracking-tight ${ready ? "text-emerald-300" : "text-white"}`}
            >
              {formatCountdown(ritual.endsAt - now)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {ready
                ? "Ready for collection"
                : `Finishes ${new Date(ritual.endsAt).toLocaleString()}`}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-right">
          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">
            Input cost
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-cyan-300">
            {formatRubles(ritual.totals.inputCost)}
          </p>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ${ready ? "bg-emerald-400" : "bg-gradient-to-r from-amber-600 to-amber-300"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ritual.sacrifices.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-xs text-slate-300"
          >
            {item.iconLink && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.iconLink}
                alt=""
                className="h-5 w-5 object-contain"
              />
            )}
            {item.quantity > 1 ? `${item.quantity}× ` : ""}
            {item.shortName}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/7 pt-4">
        <CompleteRitualDialog ritual={ritual} />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => downloadRitualCalendar(ritual)}
          className="text-slate-400 hover:text-white"
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Calendar
        </Button>
        <AdjustTimerDialog ritual={ritual} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-slate-500 hover:bg-red-400/10 hover:text-red-300"
            >
              Cancel ritual
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-white/10 bg-[#171a1f] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel tracking?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                The ritual remains in history as cancelled and will not affect
                insights.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                Keep tracking
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void updateRitual(ritual.id, {
                    status: "cancelled",
                    cancelledAt: Date.now(),
                  })
                }
                className="bg-red-500 text-white hover:bg-red-400"
              >
                Cancel tracking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
  icon: typeof Coins;
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-red-300"
        : "text-slate-100";
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-amber-300/70" />
      </div>
      <p className={`mt-3 text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

export function TrackerDashboard() {
  const router = useRouter();
  const records = useLiveQuery(() => listRituals(), [], []);
  const [now, setNow] = useState(() => Date.now());
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [valuation, setValuation] = useState<RewardValuation>("flea");
  const [search, setSearch] = useState("");
  const [notificationOn, setNotificationOn] = useState(() =>
    typeof window === "undefined" ? false : notificationsEnabled(),
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const allRecords = useMemo(() => records ?? [], [records]);
  const dateCutoff =
    dateFilter === "all" ? 0 : now - Number(dateFilter) * 86_400_000;
  const analyticsRecords = useMemo(
    () =>
      allRecords.filter(
        (record) =>
          (modeFilter === "all" || record.mode === modeFilter) &&
          record.startedAt >= dateCutoff,
      ),
    [allRecords, dateCutoff, modeFilter],
  );
  const insights = useMemo(
    () => calculateTrackerInsights(analyticsRecords, valuation),
    [analyticsRecords, valuation],
  );
  const active = analyticsRecords.filter(
    (record) => record.status === "active",
  );
  const history = analyticsRecords.filter((record) => {
    const ready = isRitualReady(record, now);
    if (statusFilter === "ready" && !ready) return false;
    if (
      statusFilter !== "all" &&
      statusFilter !== "ready" &&
      record.status !== statusFilter
    )
      return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      record.notes,
      GAME_MODE_LABELS[record.mode],
      ...record.sacrifices.flatMap((item) => [item.name, item.shortName]),
      ...record.rewards.flatMap((item) => [item.name, item.shortName]),
    ].some((value) => value.toLowerCase().includes(query));
  });

  const loadCombination = (ritual: RitualRecord) => {
    loadRitualCombinationIntoStorage(ritual, localStorage);
    sonnerToast.success("Combination loaded", {
      description: `Opening the calculator in ${GAME_MODE_LABELS[ritual.mode]} mode.`,
    });
    router.push("/");
  };

  const toggleNotifications = async () => {
    if (notificationOn) {
      disableRitualNotifications();
      setNotificationOn(false);
      return;
    }
    const permission = await enableRitualNotifications();
    if (permission === "granted") {
      setNotificationOn(true);
      sonnerToast.success("Ritual reminders enabled");
    } else {
      sonnerToast.error("Notification permission was not granted", {
        description:
          "Calendar reminders remain available on every active ritual.",
      });
    }
  };

  const bestCombos = [...insights.combinations]
    .filter((combo) => combo.averageRoi !== null && combo.averageNet >= 0)
    .sort((a, b) => b.averageNet - a.averageNet)
    .slice(0, 3);
  const worstCombos = [...insights.combinations]
    .filter((combo) => combo.averageRoi !== null && combo.averageNet < 0)
    .sort((a, b) => a.averageNet - b.averageNet)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-my_bg_image bg-cover bg-fixed bg-no-repeat px-3 pb-20 pt-4 text-white sm:px-4 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 px-4 py-8 shadow-2xl backdrop-blur-md sm:px-6 lg:py-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ritual Tracker
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Countdown, record what returned, and learn which sacrifices are
              actually worth repeating. Everything stays in this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={toggleNotifications}
              disabled={!notificationsSupported()}
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              {notificationOn ? (
                <Bell className="mr-2 h-4 w-4 text-emerald-300" />
              ) : (
                <BellOff className="mr-2 h-4 w-4" />
              )}
              {notificationOn ? "Reminders on" : "Enable reminders"}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadTrackerJson(allRecords)}
              disabled={!allRecords.length}
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <FileJson className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadTrackerCsv(allRecords)}
              disabled={!allRecords.length}
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </header>

        <section className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/8 bg-black/20 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by game mode"
          >
            {(["all", ...GAME_MODES] as ModeFilter[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setModeFilter(mode)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${modeFilter === mode ? "bg-amber-400 text-black" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                {mode === "all" ? "All modes" : GAME_MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Select
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value as DateFilter)}
            >
              <SelectTrigger className="w-[130px] border-white/10 bg-white/5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1b1e24] text-white">
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(["flea", "trader"] as RewardValuation[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValuation(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${valuation === value ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Active rituals
              </h2>
              <p className="text-xs text-slate-500">
                One countdown per game mode.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="w-full bg-amber-500 font-semibold text-black hover:bg-amber-400 sm:w-auto"
            >
              <Link href="/">
                <Play className="mr-2 h-4 w-4" />
                Start from calculator
              </Link>
            </Button>
          </div>
          {active.length ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {active.map((ritual) => (
                <ActiveRitualCard key={ritual.id} ritual={ritual} now={now} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 font-medium text-slate-300">
                No active countdowns
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Build a sacrifice in the calculator and choose Track ritual.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Your return</h2>
              <p className="text-xs text-slate-500">
                Using captured {valuation} reward values.
              </p>
            </div>
            {insights.pricedCount !== insights.completedCount &&
              insights.completedCount > 0 && (
                <span className="rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-3 py-1 text-[10px] text-amber-200/80">
                  {insights.pricedCount}/{insights.completedCount} fully priced
                </span>
              )}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            <MetricCard
              label="Completed"
              value={String(insights.completedCount)}
              icon={CheckCircle2}
            />
            <MetricCard
              label="Total cost"
              value={formatRubles(insights.totalInputCost)}
              icon={Coins}
            />
            <MetricCard
              label="Avg cost"
              value={formatRubles(insights.averageInputCost)}
              icon={LineChart}
            />
            <MetricCard
              label="Rewards"
              value={formatRubles(insights.totalRewardValue)}
              icon={PackageOpen}
            />
            <MetricCard
              label="Net return"
              value={formatRubles(insights.netReturn)}
              tone={insights.netReturn >= 0 ? "positive" : "negative"}
              icon={insights.netReturn >= 0 ? TrendingUp : TrendingDown}
            />
            <MetricCard
              label="Avg ROI"
              value={
                insights.averageRoi === null
                  ? "Incomplete"
                  : `${insights.averageRoi.toFixed(1)}%`
              }
              tone={(insights.averageRoi ?? 0) >= 0 ? "positive" : "negative"}
              icon={TrendingUp}
            />
            <MetricCard
              label="Profitable"
              value={
                insights.profitableRate === null
                  ? "Incomplete"
                  : `${insights.profitableRate.toFixed(0)}%`
              }
              icon={ShieldCheck}
            />
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Most returned</h2>
                <p className="text-xs text-slate-500">
                  Ranked by item quantity.
                </p>
              </div>
              <PackageOpen className="h-5 w-5 text-amber-300/70" />
            </div>
            <div className="space-y-2">
              {insights.topRewards.length ? (
                insights.topRewards.map((reward, index) => (
                  <div
                    key={reward.key}
                    className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-2.5"
                  >
                    <span className="w-5 text-center text-xs font-semibold text-slate-600">
                      {index + 1}
                    </span>
                    {reward.iconLink ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reward.iconLink}
                        alt=""
                        className="h-9 w-9 object-contain"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-white/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {reward.name}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {formatRubles(reward.totalValue)} captured value
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-300">
                      ×{reward.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-600">
                  Complete a ritual to reveal your most common returns.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <div className="mb-5">
              <h2 className="font-semibold text-white">
                Combination performance
              </h2>
              <p className="text-xs text-slate-500">
                Exact item sets, mode, and sacred bonus are compared together.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { title: "Best return", data: bestCombos, positive: true },
                { title: "Worst return", data: worstCombos, positive: false },
              ].map((section) => (
                <div key={section.title}>
                  <p
                    className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${section.positive ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.data.length ? (
                      section.data.map((combo) => (
                        <button
                          key={combo.key}
                          type="button"
                          onClick={() => loadCombination(combo.ritual)}
                          className="group w-full rounded-2xl border border-white/7 bg-black/20 p-3 text-left transition-colors hover:border-amber-300/20 hover:bg-amber-300/[0.04]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <ModeBadge mode={combo.ritual.mode} />
                            <span className="text-[10px] text-slate-600">
                              n={combo.uses}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300">
                            {combo.ritual.sacrifices
                              .map(
                                (item) => `${item.quantity}× ${item.shortName}`,
                              )
                              .join(" · ")}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold tabular-nums ${combo.averageNet >= 0 ? "text-emerald-300" : "text-red-300"}`}
                            >
                              {combo.averageNet >= 0 ? "+" : ""}
                              {formatRubles(combo.averageNet)}
                            </span>
                            <span className="text-[10px] text-amber-200/70 opacity-0 transition-opacity group-hover:opacity-100">
                              Load combo
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/8 px-3 py-8 text-center text-xs text-slate-600">
                        {section.positive
                          ? "No profitable combinations yet."
                          : "No losing combinations yet."}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <History className="h-5 w-5 text-amber-300/70" />
                Ritual history
              </h2>
              <p className="text-xs text-slate-500">
                Review, edit, or reload any previous combination.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search items or notes"
                  className="h-9 border-white/10 bg-white/5 pl-9 text-sm"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as StatusFilter)
                }
              >
                <SelectTrigger className="w-[126px] border-white/10 bg-white/5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1b1e24] text-white">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {history.length ? (
              history.map((ritual) => {
                const reward = getRitualRewardValue(ritual, valuation);
                const net =
                  reward !== null && ritual.totals.inputCost !== null
                    ? reward - ritual.totals.inputCost
                    : null;
                const displayStatus = isRitualReady(ritual, now)
                  ? "ready"
                  : ritual.status;
                return (
                  <details
                    key={ritual.id}
                    className="group rounded-2xl border border-white/8 bg-white/[0.025] open:bg-white/[0.04]"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/70">
                      <ChevronDown className="h-4 w-4 text-slate-600 transition-transform group-open:rotate-180" />
                      <ModeBadge mode={ritual.mode} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-200">
                          {ritual.sacrifices
                            .map(
                              (item) => `${item.quantity}× ${item.shortName}`,
                            )
                            .join(" · ")}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {new Date(ritual.startedAt).toLocaleString()} ·{" "}
                          {formatDuration(ritual.durationMinutes)}
                        </p>
                      </div>
                      <span
                        className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize sm:inline-flex ${displayStatus === "completed" ? "bg-emerald-400/10 text-emerald-300" : displayStatus === "cancelled" ? "bg-red-400/10 text-red-300" : displayStatus === "ready" ? "bg-amber-400/10 text-amber-200" : "bg-sky-400/10 text-sky-300"}`}
                      >
                        {displayStatus}
                      </span>
                      <span
                        className={`w-24 text-right text-sm font-semibold tabular-nums ${net === null ? "text-slate-600" : net >= 0 ? "text-emerald-300" : "text-red-300"}`}
                      >
                        {net === null
                          ? "Incomplete"
                          : `${net >= 0 ? "+" : ""}${formatRubles(net)}`}
                      </span>
                    </summary>
                    <div className="border-t border-white/7 px-4 py-4 sm:pl-12">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            Sacrificed
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-slate-300">
                            {ritual.sacrifices.map((item) => (
                              <p key={item.key}>
                                {item.quantity}× {item.name}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            Returned
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-slate-300">
                            {ritual.rewards.length ? (
                              ritual.rewards.map((item) => (
                                <p key={item.key}>
                                  {item.quantity}× {item.name}
                                </p>
                              ))
                            ) : (
                              <p className="text-slate-600">Not recorded</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {ritual.notes && (
                        <p className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-400">
                          {ritual.notes}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadCombination(ritual)}
                          className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Load in calculator
                        </Button>
                        {ritual.status === "completed" && (
                          <CompleteRitualDialog ritual={ritual} editing />
                        )}
                        <DeleteRitualButton ritual={ritual} />
                      </div>
                    </div>
                  </details>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-600">
                No rituals match these filters.
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 flex items-start gap-3 rounded-2xl border border-white/7 bg-black/20 p-4 text-xs leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/70" />
          Ritual history is stored only in this browser. Export JSON for backup
          or moving devices. Browser reminders are best-effort when this site is
          open; use Calendar for a dependable closed-site reminder.
        </footer>
      </div>
    </div>
  );
}
