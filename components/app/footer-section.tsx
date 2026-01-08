/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ExternalLinkIcon = () => (
  <svg
    className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

interface FooterSectionProps {
  onFeedbackClick: () => void;
}

/**
 * Footer section with disclaimer, credits, buy-me-coffee, and feedback button.
 * Extracted from app.tsx for better organization.
 */
export function FooterSection({ onFeedbackClick }: FooterSectionProps) {
  return (
    <div className="text-center space-y-5 mt-12 pb-10">
      {/* Primary Attribution */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold opacity-70">
          Created By
        </span>
        <motion.a
          href="https://github.com/Wilsman/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl font-black text-white hover:text-blue-400 transition-all duration-300 flex items-center gap-2 group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Wilsman77
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-blue-400">
            <ExternalLinkIcon />
          </div>
        </motion.a>
      </div>

      {/* Secondary Credits */}
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Prices provided by</span>
          <a
            href="https://tarkov.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-bold"
          >
            Tarkov.dev
          </a>
        </div>
        <span className="text-slate-700 select-none hidden sm:inline">•</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Research provided by</span>
          <a
            href="https://bio.link/verybadscav"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-bold"
          >
            VeryBadSCAV
          </a>
        </div>
      </div>

      {/* Footer Utility & Disclaimer */}
      <div className="space-y-5 pt-5 border-t border-white/5 max-w-lg mx-auto">
        <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-medium opacity-60">
          Fan-made tool · Not affiliated with Battlestate Games
        </p>

        <div className="flex justify-center items-center gap-4">
          <motion.a
            href="https://www.buymeacoffee.com/wilsman77"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="block"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
              alt="Buy Me a Coffee"
              width="140"
              height="32"
              className="h-9 w-auto"
            />
          </motion.a>

          <Button
            onClick={onFeedbackClick}
            size="sm"
            className="h-10 px-6 bg-[#5f7fff73] hover:bg-[#4a6fff73] text-white rounded-xl transition-all text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-blue-500/10"
          >
            Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
