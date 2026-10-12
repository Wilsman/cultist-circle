"use client";

import { useState } from "react";
import { Minus, Plus, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

const MIN_LEVEL = 1;
const MAX_LEVEL = 79;

interface PlayerLevelChipProps {
  useLevelFilter: boolean;
  onUseLevelFilterChange: (value: boolean) => void;
  playerLevel: number;
  onPlayerLevelChange: (level: number) => void;
  filteredCount: number;
}

const clampLevel = (level: number) =>
  Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));

/**
 * Compact level control beside the item slots. Setting a level turns the flea
 * level filter on, so suggestions only use items the player can buy.
 */
export function PlayerLevelChip({
  useLevelFilter,
  onUseLevelFilterChange,
  playerLevel,
  onPlayerLevelChange,
  filteredCount,
}: PlayerLevelChipProps) {
  const { t } = useLanguage();
  const level = clampLevel(playerLevel);
  const [draft, setDraft] = useState<string | null>(null);

  const commitLevel = (next: number) => {
    onPlayerLevelChange(clampLevel(next));
    if (!useLevelFilter) onUseLevelFilterChange(true);
  };

  const handleInput = (value: string) => {
    setDraft(value);
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_LEVEL) commitLevel(parsed);
  };

  return (
    <Popover onOpenChange={() => setDraft(null)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Set your player level")}
          title={
            useLevelFilter
              ? t("Only items available at level {level}", { level })
              : t("Set your level to hide items you cannot buy yet")
          }
          className={cn(
            "flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
            useLevelFilter
              ? "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
              : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200",
          )}
        >
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {useLevelFilter ? t("Lvl {level}", { level }) : t("Any lvl")}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 border-slate-700 bg-slate-900 p-3 text-slate-200"
      >
        <p className="text-[11px] text-slate-300">{t("Your Current Level")}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => commitLevel(level - 1)}
            disabled={useLevelFilter && level <= MIN_LEVEL}
            aria-label={t("Decrease level")}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            aria-label={t("Your Current Level")}
            value={draft ?? String(level)}
            onChange={(event) => handleInput(event.target.value)}
            onBlur={() => setDraft(null)}
            className="h-8 flex-1 border-slate-700 bg-slate-950/70 px-2 text-center font-mono text-sm text-amber-300"
          />
          <button
            type="button"
            onClick={() => commitLevel(level + 1)}
            disabled={useLevelFilter && level >= MAX_LEVEL}
            aria-label={t("Increase level")}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          {useLevelFilter
            ? filteredCount > 0
              ? t("Filtered {count} inaccessible items", {
                  count: filteredCount.toLocaleString(),
                })
              : t("All items are available at this level")
            : t("Set your level to hide items you cannot buy yet")}
        </p>
        {useLevelFilter && (
          <button
            type="button"
            onClick={() => onUseLevelFilterChange(false)}
            className="mt-2 text-[11px] text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {t("Show items for any level")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
