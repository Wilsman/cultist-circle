"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { SimplifiedItem } from "@/types/SimplifiedItem";

interface NextItemHintsProps {
  items: SimplifiedItem[];
  onPick: (item: SimplifiedItem) => void;
  prevItem?: SimplifiedItem | null;
  className?: string;
}

export function NextItemHints({ items, onPick, prevItem, className }: NextItemHintsProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className={cn("mt-1.5 pb-2 flex flex-wrap gap-1.5", className)}>
      {prevItem ? (
        <button
          key={`prev-${prevItem.id}`}
          type="button"
          onClick={() => onPick(prevItem)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1",
            "text-xs bg-emerald-900/40 border-emerald-600/40 text-emerald-200",
            "hover:bg-emerald-900/60 hover:border-emerald-500/60 transition-colors"
          )}
          title={`Copy the same item from the slot above: ${prevItem.name}`}
        >
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 uppercase tracking-wide text-[10px]">Copy</span>
          <span className="font-medium truncate max-w-[140px]">{prevItem.shortName || prevItem.name}</span>
        </button>
      ) : null}
      {items.slice(0, 3).map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onPick(it)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1",
            "text-xs transition-colors",
            i === 0
              ? "bg-amber-900/30 border-amber-600/40 text-amber-200 hover:bg-amber-900/50 hover:border-amber-500/60"
              : "bg-slate-800/60 border-slate-600/40 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50"
          )}
          title={`Insert ${it.name}`}
        >
          <span className="font-medium truncate max-w-[160px]">{it.shortName || it.name}</span>
          <span className="opacity-80">·</span>
          <span className="tabular-nums">₽{it.basePrice.toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

export default NextItemHints;
