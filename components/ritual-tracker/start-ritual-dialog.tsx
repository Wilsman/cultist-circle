"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock3, Flame, Loader2, TimerReset } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_MODE_LABELS, type GameMode } from "@/lib/game-mode";
import { useLanguage } from "@/contexts/language-context";
import { ActiveRitualExistsError, startRitual } from "@/lib/ritual-tracker-db";
import {
  applyTrackedItemLineCost,
  calculateItemTotal,
  formatDuration,
  getSuggestedRitualDurations,
  snapshotSelectedItems,
  RITUAL_DURATION_OPTIONS,
} from "@/lib/ritual-tracker";
import { requestPersistentTrackerStorage } from "@/lib/ritual-reminders";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import {
  RITUAL_TRACKER_SCHEMA_VERSION,
  type RitualInputPriceSource,
  type RitualRecord,
} from "@/types/ritual-tracker";

interface StartRitualDialogProps {
  mode: GameMode;
  selectedItems: Array<SimplifiedItem | null>;
  inputPrices: Array<number | null>;
  totalBaseValue: number;
  sacredBonus: number;
  inputPriceSource: RitualInputPriceSource;
}

function toDateTimeLocal(timestamp: number): string {
  const date = new Date(
    timestamp - new Date(timestamp).getTimezoneOffset() * 60_000,
  );
  return date.toISOString().slice(0, 16);
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ritual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function lineCostInput(item: ReturnType<typeof snapshotSelectedItems>[number]) {
  if (item.inputPrice === null) return "";
  return String(Number((item.inputPrice * item.quantity).toFixed(2)));
}

function parseLineCost(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function StartRitualDialog({
  mode,
  selectedItems,
  inputPrices,
  totalBaseValue,
  sacredBonus,
  inputPriceSource,
}: StartRitualDialogProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startedAtInput, setStartedAtInput] = useState(() =>
    toDateTimeLocal(Date.now()),
  );
  const suggestedDurations = useMemo(
    () => getSuggestedRitualDurations(totalBaseValue),
    [totalBaseValue],
  );
  const [durationMinutes, setDurationMinutes] = useState(
    suggestedDurations[0] ?? 120,
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const hasItems = selectedItems.some(Boolean);
  const baseSnapshots = useMemo(
    () => snapshotSelectedItems(selectedItems, inputPrices),
    [inputPrices, selectedItems],
  );
  const [lineCosts, setLineCosts] = useState<Record<string, string>>({});
  const [ownedItems, setOwnedItems] = useState<Record<string, boolean>>({});
  const snapshots = useMemo(
    () =>
      baseSnapshots.map((item) =>
        applyTrackedItemLineCost(
          item,
          parseLineCost(lineCosts[item.key] ?? lineCostInput(item)),
        ),
      ),
    [baseSnapshots, lineCosts],
  );
  const inputCost = useMemo(
    () => calculateItemTotal(snapshots, (item) => item.inputPrice),
    [snapshots],
  );
  const hasCustomInputCosts = baseSnapshots.some((item) => {
    const originalCost = parseLineCost(lineCostInput(item));
    const currentCost = parseLineCost(
      lineCosts[item.key] ?? lineCostInput(item),
    );
    return ownedItems[item.key] || currentCost !== originalCost;
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const nextSuggested = getSuggestedRitualDurations(totalBaseValue);
      setDurationMinutes(nextSuggested[0] ?? 120);
      setStartedAtInput(toDateTimeLocal(Date.now()));
      setLineCosts(
        Object.fromEntries(
          baseSnapshots.map((item) => [item.key, lineCostInput(item)]),
        ),
      );
      setOwnedItems({});
    }
    setOpen(nextOpen);
  };

  const handleStart = async () => {
    const startedAt = new Date(startedAtInput).getTime();
    if (!Number.isFinite(startedAt)) {
      sonnerToast.error(t("Choose a valid start time"));
      return;
    }

    const now = Date.now();
    const record: RitualRecord = {
      schemaVersion: RITUAL_TRACKER_SCHEMA_VERSION,
      id: createId(),
      mode,
      status: "active",
      startedAt,
      endsAt: startedAt + durationMinutes * 60_000,
      durationMinutes,
      completedAt: null,
      cancelledAt: null,
      notificationSentAt: null,
      sacredBonus,
      inputPriceSource: hasCustomInputCosts ? "manual" : inputPriceSource,
      sacrifices: snapshots,
      rewards: [],
      totals: {
        baseValue: Math.floor(totalBaseValue),
        inputCost,
        rewardFleaValue: null,
        rewardTraderValue: null,
      },
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      setSaving(true);
      await startRitual(record);
      await requestPersistentTrackerStorage();
      sonnerToast.success(t("{mode} ritual is being tracked", { mode: t(GAME_MODE_LABELS[mode]) }), {
        description: t("Ready at {time}", {
          time: new Date(record.endsAt).toLocaleString(),
        }),
        action: {
          label: t("Open tracker"),
          onClick: () => {
            router.push("/tracker");
          },
        },
      });
      setNotes("");
      setOpen(false);
    } catch (error) {
      if (error instanceof ActiveRitualExistsError) {
        sonnerToast.error(
          t("A {mode} ritual is already active", {
            mode: t(GAME_MODE_LABELS[mode]),
          }),
          {
            description: t(
              "Complete or cancel it in the Tracker before starting another.",
            ),
            action: {
              label: t("View"),
              onClick: () => {
                router.push("/tracker");
              },
            },
          },
        );
      } else {
        console.error(error);
        sonnerToast.error(t("Could not start ritual tracking"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={!hasItems}
          className="w-full rounded-none border border-amber-400/25 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 hover:text-amber-100"
        >
          <TimerReset className="mr-1.5 h-4 w-4" />
          {t("Track ritual")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#15181d] text-white sm:max-w-xl sm:rounded-3xl">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
            <Flame className="h-5 w-5 text-amber-300" />
          </div>
          <DialogTitle className="text-xl">{t("Track this ritual")}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {t(
              "Confirm the timer shown in-game. Your items and price estimates stay on this device.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {t("Mode")}
              </p>
              <p className="font-semibold text-slate-100">
                {t(GAME_MODE_LABELS[mode])}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {t("Estimated cost")}
              </p>
              <p className="font-semibold tabular-nums text-cyan-300">
                {inputCost === null
                  ? t("Incomplete")
                  : `₽${inputCost.toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {baseSnapshots.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl bg-black/20 px-3 py-2 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
              >
                {item.iconLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.iconLink}
                    alt=""
                    className="h-9 w-9 object-contain"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("{count} selected", { count: item.quantity })}
                  </p>
                </div>
                <div className="col-start-2 flex items-center justify-end gap-2 sm:col-start-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-pressed={Boolean(ownedItems[item.key])}
                    onClick={() => {
                      const nextOwned = !ownedItems[item.key];
                      setOwnedItems((current) => ({
                        ...current,
                        [item.key]: nextOwned,
                      }));
                      setLineCosts((current) => ({
                        ...current,
                        [item.key]: nextOwned ? "0" : lineCostInput(item),
                      }));
                    }}
                    className={`h-8 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${ownedItems[item.key] ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 hover:text-emerald-100" : "border-white/8 bg-white/[0.03] text-slate-500 hover:bg-white/[0.07] hover:text-slate-300"}`}
                  >
                    {ownedItems[item.key] && <Check className="mr-1 h-3 w-3" />}
                    {t("Owned")}
                  </Button>
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-slate-600">
                      ₽
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      aria-label={t("{name} total paid", { name: item.name })}
                      title={t("Total paid")}
                      value={lineCosts[item.key] ?? lineCostInput(item)}
                      disabled={Boolean(ownedItems[item.key])}
                      onChange={(event) => {
                        setLineCosts((current) => ({
                          ...current,
                          [item.key]: event.target.value,
                        }));
                        setOwnedItems((current) => ({
                          ...current,
                          [item.key]: false,
                        }));
                      }}
                      placeholder={t("No price")}
                      className="h-8 border-white/8 bg-black/25 pl-6 pr-2 text-right text-xs tabular-nums text-slate-300 disabled:cursor-default disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>
            ))}
            <p className="px-1 text-[11px] leading-relaxed text-slate-600">
              {t(
                "Edit the total paid for any item, or mark stock you already owned.",
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ritual-start-time" className="text-slate-300">
                {t("Start time")}
              </Label>
              <Input
                id="ritual-start-time"
                type="datetime-local"
                value={startedAtInput}
                onChange={(event) => setStartedAtInput(event.target.value)}
                className="border-white/10 bg-black/25 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ritual-duration" className="text-slate-300">
                {t("Actual in-game timer")}
              </Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(value) => setDurationMinutes(Number(value))}
              >
                <SelectTrigger
                  id="ritual-duration"
                  className="border-white/10 bg-black/25"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1b1e24] text-white">
                  {RITUAL_DURATION_OPTIONS.map((duration) => (
                    <SelectItem key={duration} value={String(duration)}>
                      {formatDuration(duration)}
                      {suggestedDurations.includes(duration)
                        ? ` · ${t("suggested")}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalBaseValue >= 400_000 && (
            <div className="flex gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 text-xs leading-relaxed text-emerald-100/80">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              {t(
                "400k+ rituals can show either 6h or 14h. Confirm the timer visible in-game before saving.",
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ritual-notes" className="text-slate-300">
              {t("Note")} <span className="text-slate-600">{t("(optional)")}</span>
            </Label>
            <Input
              id="ritual-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={240}
              placeholder={t("Anything worth remembering about this run")}
              className="border-white/10 bg-black/25 text-white"
            />
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <Button
            variant="ghost"
            asChild
            className="text-slate-400 hover:text-white"
          >
            <Link href="/tracker">{t("Open tracker")}</Link>
          </Button>
          <Button
            onClick={handleStart}
            disabled={saving}
            className="bg-amber-500 font-semibold text-black hover:bg-amber-400"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TimerReset className="mr-2 h-4 w-4" />
            )}
            {t("Start countdown")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
