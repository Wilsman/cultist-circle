"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Copy, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface NextItemHintsProps {
  items: SimplifiedItem[];
  onPick: (item: SimplifiedItem) => void;
  prevItem?: SimplifiedItem | null;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

export function NextItemHints({
  items,
  onPick,
  prevItem,
  className,
}: NextItemHintsProps) {
  const { t } = useLanguage();
  if (!items || items.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label={t("Recommended items for this slot")}
      className={cn(
        "-mt-px mb-3 overflow-hidden rounded-b-xl border border-t-0 border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
        className,
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-3 border-b border-white/[0.07] px-2.5 py-1.5">
        <div className="flex min-w-0 items-baseline gap-2 border-l-2 border-amber-400/60 pl-2">
          <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-200 sm:hidden">
            {t("Picks for this slot")}
          </span>
          <span className="hidden truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-200 sm:inline">
            {t("Recommended for this slot")}
          </span>
          <span className="hidden text-[9px] font-medium text-slate-500 sm:inline">
            {t("Choose one to add it")}
          </span>
        </div>
        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-600">
          {t("{count} quick picks", {
            count: Math.min(items.length, 3) + (prevItem ? 1 : 0),
          })}
        </span>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-2",
          prevItem ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <AnimatePresence mode="popLayout">
          {prevItem && (
            <motion.button
              key={`prev-${prevItem.id}`}
              variants={itemVariants}
              layout
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => onPick(prevItem)}
              className="group relative flex min-w-0 items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-2 text-left transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10"
              title={prevItem.name}
              aria-label={t("Add previous item {name}", {
                name: prevItem.name,
              })}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[8px] font-extrabold uppercase tracking-[0.16em] text-emerald-400/70">
                  {t("Repeat previous")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-bold leading-none text-slate-100">
                  {prevItem.shortName || prevItem.name}
                </span>
                <span className="mt-1 block text-[9px] font-semibold tabular-nums text-slate-500">
                  {t("Base value")} ₽{prevItem.basePrice.toLocaleString()}
                </span>
              </span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-emerald-400/40 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300"
                aria-hidden
              />
            </motion.button>
          )}

          {items.slice(0, 3).map((it, i) => (
            <motion.button
              key={it.id}
              variants={itemVariants}
              layout
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => onPick(it)}
              className={cn(
                "group relative flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors",
                i === 0
                  ? "border-amber-400/35 bg-gradient-to-r from-amber-400/[0.11] to-amber-400/[0.035] shadow-[inset_2px_0_0_rgba(251,191,36,0.75)] hover:border-amber-300/55 hover:from-amber-400/[0.16]"
                  : "border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.055]",
              )}
              title={it.name}
              aria-label={t("Add {label} {name}, base value ₽{value}", {
                label:
                  i === 0
                    ? t("recommended item")
                    : t("alternative {number}", { number: i }),
                name: it.name,
                value: it.basePrice.toLocaleString(),
              })}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border",
                  i === 0
                    ? "border-amber-400/20 bg-amber-400/10"
                    : "border-white/[0.08] bg-black/20",
                )}
              >
                {it.iconLink ? (
                  <Image
                    src={it.iconLink}
                    alt=""
                    aria-hidden
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <Package
                    className={cn(
                      "h-3.5 w-3.5",
                      i === 0 ? "text-amber-300" : "text-slate-500",
                    )}
                    aria-hidden
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[8px] font-extrabold uppercase tracking-[0.16em]",
                    i === 0 ? "text-amber-300" : "text-slate-500",
                  )}
                >
                  {i === 0
                    ? t("Recommended")
                    : t("Alternative {number}", { number: i })}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-bold leading-none text-slate-100">
                  {it.shortName || it.name}
                </span>
                <span className="mt-1 block text-[9px] font-semibold tabular-nums text-slate-500">
                  {t("Base value")} ₽{it.basePrice.toLocaleString()}
                </span>
              </span>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-0.5 text-[8px] font-extrabold uppercase tracking-wider opacity-60 transition-opacity group-hover:opacity-100",
                  i === 0 ? "text-amber-300" : "text-slate-400",
                )}
                aria-hidden
              >
                <span className="hidden xl:inline">{t("Add")}</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default NextItemHints;
