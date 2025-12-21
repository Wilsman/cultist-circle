"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Copy, ChevronRight } from "lucide-react";

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
  if (!items || items.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("mt-2 pb-3 flex flex-wrap gap-2 items-center", className)}
    >
      <AnimatePresence mode="popLayout">
        {prevItem && (
          <motion.button
            key={`prev-${prevItem.id}`}
            variants={itemVariants}
            layout
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onPick(prevItem)}
            className={cn(
              "group relative flex items-center gap-2 rounded-full border px-3 py-1.5",
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
              "hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 shadow-sm shadow-emerald-500/5"
            )}
            title={`Copy the same item from the slot above: ${prevItem.name}`}
          >
            <div className="p-1 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
              <Copy className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[9px] uppercase tracking-wider font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                Duplicate
              </span>
              <span className="font-semibold text-[11px] truncate max-w-[120px]">
                {prevItem.shortName || prevItem.name}
              </span>
            </div>
          </motion.button>
        )}

        {items.slice(0, 3).map((it, i) => (
          <motion.button
            key={it.id}
            variants={itemVariants}
            layout
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onPick(it)}
            className={cn(
              "group relative flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md transition-all duration-300",
              i === 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/5"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
            )}
            title={`${it.name} — Base: ₽${it.basePrice.toLocaleString()}`}
          >
            {i === 0 && (
              <div className="p-1 rounded-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                <Sparkles className="h-3 w-3 text-amber-400" />
              </div>
            )}
            <div className="flex flex-col items-start leading-none">
              <span className="text-[9px] uppercase tracking-wider font-bold opacity-40 group-hover:opacity-100 transition-opacity">
                {i === 0 ? "Top Pick" : "Suggest"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[11px] truncate max-w-[120px] text-slate-100">
                  {it.shortName || it.name}
                </span>
                <span className="text-[10px] opacity-40 group-hover:opacity-60 tabular-nums">
                  ₽{(it.basePrice / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
            {i === 0 && (
              <ChevronRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        className="flex items-center gap-1.5 ml-1 select-none pointer-events-none"
      >
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Press
        </span>
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white/5 border border-white/10 rounded text-[10px] font-black text-white/50 font-mono shadow-sm">
          /
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          to focus
        </span>
      </motion.div>
    </motion.div>
  );
}

export default NextItemHints;
