"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import { useItemsData } from "@/hooks/use-items-data";
import {
  calculateItemTotal,
  getBestTraderSellPrice,
} from "@/lib/ritual-tracker";
import { updateRitual } from "@/lib/ritual-tracker-db";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { RitualRecord, TrackedItemSnapshot } from "@/types/ritual-tracker";

interface CompleteRitualDialogProps {
  ritual: RitualRecord;
  editing?: boolean;
}

function createRewardSnapshot(item: SimplifiedItem): TrackedItemSnapshot {
  return {
    key: item.id,
    itemId: item.id,
    name: item.name,
    shortName: item.shortName,
    iconLink: item.iconLink,
    quantity: 1,
    basePrice: Number.isFinite(item.basePrice) ? item.basePrice : null,
    lastLowPrice:
      typeof item.lastLowPrice === "number" ? item.lastLowPrice : null,
    avg24hPrice: typeof item.avg24hPrice === "number" ? item.avg24hPrice : null,
    traderSellPrice: getBestTraderSellPrice(item),
    inputPrice: null,
    isManual: false,
  };
}

function createManualReward(): TrackedItemSnapshot {
  return {
    key: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    itemId: null,
    name: "Custom reward",
    shortName: "Custom reward",
    quantity: 1,
    basePrice: null,
    lastLowPrice: null,
    avg24hPrice: null,
    traderSellPrice: null,
    inputPrice: null,
    isManual: true,
  };
}

export function CompleteRitualDialog({
  ritual,
  editing = false,
}: CompleteRitualDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rewards, setRewards] = useState<TrackedItemSnapshot[]>([]);
  const [notes, setNotes] = useState(ritual.notes);
  const [saving, setSaving] = useState(false);
  const { data: items = [], isLoading } = useItemsData(ritual.mode);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setRewards(ritual.rewards.map((reward) => ({ ...reward })));
      setNotes(ritual.notes);
      setSearch("");
    }
    setOpen(nextOpen);
  };

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return items
      .filter((item) =>
        [item.name, item.shortName, item.englishName, item.englishShortName]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [items, search]);

  const addCatalogItem = (item: SimplifiedItem) => {
    setRewards((current) => {
      const existing = current.find((reward) => reward.itemId === item.id);
      if (existing) {
        return current.map((reward) =>
          reward.key === existing.key
            ? { ...reward, quantity: reward.quantity + 1 }
            : reward,
        );
      }
      return [...current, createRewardSnapshot(item)];
    });
    setSearch("");
  };

  const patchReward = (key: string, patch: Partial<TrackedItemSnapshot>) => {
    setRewards((current) =>
      current.map((reward) =>
        reward.key === key ? { ...reward, ...patch } : reward,
      ),
    );
  };

  const save = async () => {
    if (rewards.length === 0) {
      sonnerToast.error("Add at least one returned reward");
      return;
    }
    if (rewards.some((reward) => !reward.name.trim() || reward.quantity < 1)) {
      sonnerToast.error("Every reward needs a name and quantity");
      return;
    }

    const normalized = rewards.map((reward) => ({
      ...reward,
      name: reward.name.trim(),
      shortName: reward.shortName.trim() || reward.name.trim(),
    }));
    const fleaValue = calculateItemTotal(
      normalized,
      (reward) => reward.lastLowPrice,
    );
    const traderValue = calculateItemTotal(
      normalized,
      (reward) => reward.traderSellPrice,
    );

    try {
      setSaving(true);
      await updateRitual(ritual.id, {
        status: "completed",
        rewards: normalized,
        completedAt: editing ? ritual.completedAt : Date.now(),
        cancelledAt: null,
        totals: {
          ...ritual.totals,
          rewardFleaValue: fleaValue,
          rewardTraderValue: traderValue,
        },
        notes: notes.trim(),
      });
      sonnerToast.success(editing ? "Ritual updated" : "Rewards recorded", {
        description:
          fleaValue === null || traderValue === null
            ? "Some values are missing; ROI will be marked incomplete."
            : "Your personal insights have been refreshed.",
      });
      setOpen(false);
    } catch (error) {
      console.error(error);
      sonnerToast.error("Could not save rewards");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={
            editing
              ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              : "bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300"
          }
        >
          {editing ? (
            <PackagePlus className="mr-2 h-4 w-4" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {editing ? "Edit rewards" : "Add rewards"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#15181d] text-white sm:max-w-2xl sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit returned rewards" : "What came back?"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Search the {ritual.mode.toUpperCase()} catalogue or add a custom
            reward. Prices are captured now and will not drift later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isLoading ? "Loading item catalogue…" : "Search returned items"
              }
              className="border-white/10 bg-black/25 pl-9 text-white"
            />
            {results.length > 0 && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#1c2026] p-1 shadow-2xl">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addCatalogItem(item)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-100">
                        {item.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {item.shortName}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 text-amber-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRewards((current) => [...current, createManualReward()])
            }
            className="border-dashed border-white/15 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add custom reward
          </Button>

          <div className="space-y-3">
            {rewards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-slate-500">
                Add every item returned by the ritual.
              </div>
            ) : (
              rewards.map((reward) => (
                <div
                  key={reward.key}
                  className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"
                >
                  <div className="flex items-start gap-3">
                    {reward.iconLink ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reward.iconLink}
                        alt=""
                        className="h-11 w-11 object-contain"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10">
                        <PackagePlus className="h-5 w-5 text-amber-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-3">
                      {reward.isManual ? (
                        <Input
                          aria-label="Custom reward name"
                          value={reward.name}
                          onChange={(event) =>
                            patchReward(reward.key, {
                              name: event.target.value,
                              shortName: event.target.value,
                            })
                          }
                          className="h-9 border-white/10 bg-black/25"
                        />
                      ) : (
                        <div>
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {reward.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Prices captured from Tarkov.dev
                          </p>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="space-y-1 text-[10px] uppercase tracking-wider text-slate-500">
                          Quantity
                          <Input
                            aria-label={`${reward.name} quantity`}
                            type="number"
                            min={1}
                            max={99}
                            value={reward.quantity}
                            onChange={(event) =>
                              patchReward(reward.key, {
                                quantity: Math.max(
                                  1,
                                  Number(event.target.value) || 1,
                                ),
                              })
                            }
                            className="h-9 border-white/10 bg-black/25 text-slate-100"
                          />
                        </label>
                        <label className="space-y-1 text-[10px] uppercase tracking-wider text-slate-500">
                          Flea value / item
                          <Input
                            aria-label={`${reward.name} flea value`}
                            type="number"
                            min={0}
                            value={reward.lastLowPrice ?? ""}
                            placeholder="Missing"
                            onChange={(event) =>
                              patchReward(reward.key, {
                                lastLowPrice:
                                  event.target.value === ""
                                    ? null
                                    : Math.max(0, Number(event.target.value)),
                              })
                            }
                            className="h-9 border-white/10 bg-black/25 text-slate-100"
                          />
                        </label>
                        <label className="space-y-1 text-[10px] uppercase tracking-wider text-slate-500">
                          Trader value / item
                          <Input
                            aria-label={`${reward.name} trader value`}
                            type="number"
                            min={0}
                            value={reward.traderSellPrice ?? ""}
                            placeholder="Missing"
                            onChange={(event) =>
                              patchReward(reward.key, {
                                traderSellPrice:
                                  event.target.value === ""
                                    ? null
                                    : Math.max(0, Number(event.target.value)),
                              })
                            }
                            className="h-9 border-white/10 bg-black/25 text-slate-100"
                          />
                        </label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${reward.name}`}
                      onClick={() =>
                        setRewards((current) =>
                          current.filter((item) => item.key !== reward.key),
                        )
                      }
                      className="text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`ritual-notes-${ritual.id}`}
              className="text-slate-300"
            >
              Notes
            </Label>
            <Input
              id={`ritual-notes-${ritual.id}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={240}
              className="border-white/10 bg-black/25 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {editing ? "Save changes" : "Complete ritual"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
