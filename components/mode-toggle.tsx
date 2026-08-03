"use client";

import { useId } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { GAME_MODE_LABELS, GAME_MODES, type GameMode } from "@/lib/game-mode";

interface ModeToggleProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  embedded?: boolean;
}

export function ModeToggle({
  mode,
  onModeChange,
  embedded = false,
}: ModeToggleProps) {
  const layoutId = useId();

  return (
    <div
      id="mode-toggle-container"
      className={embedded ? "" : "flex items-center justify-center"}
    >
      <div
        className={
          embedded
            ? ""
            : "rounded-full border border-slate-600/30 bg-slate-800/70 p-1 shadow-lg shadow-black/15 backdrop-blur-sm"
        }
      >
        <LayoutGroup id={layoutId}>
          <div
            className="grid w-[216px] grid-cols-3 gap-0.5 sm:w-[228px]"
            role="radiogroup"
            aria-label="Game mode"
          >
            {GAME_MODES.map((gameMode) => {
              const isActive = mode === gameMode;
              return (
                <button
                  key={gameMode}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onModeChange(gameMode)}
                  className={`relative isolate flex h-9 items-center justify-center rounded-full px-2 text-[13px] font-semibold leading-none tracking-[0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-game-mode"
                      className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 shadow-[0_4px_14px_rgba(79,70,229,0.28)] ring-1 ring-white/15"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <span className="relative">{GAME_MODE_LABELS[gameMode]}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}
