"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  advanceKonamiBuffer,
  isEditableTarget,
  KONAMI_SESSION_KEY,
} from "@/lib/konami-code";

const ScavInvadersGame = dynamic(
  () => import("./scav-invaders-game.component"),
  {
    ssr: false,
    loading: () => (
      <div className="font-arcade text-[10px] text-[#9dff2e]" role="status">
        LOADING RAID...
      </div>
    ),
  },
);

function readUnlockedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KONAMI_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function ScavInvadersEasterEgg() {
  const [unlocked, setUnlocked] = useState(readUnlockedSession);
  const [open, setOpen] = useState(false);
  const inputBuffer = useRef<string[]>([]);

  useEffect(() => {
    if (unlocked) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || isEditableTarget(event.target)) return;

      const result = advanceKonamiBuffer(inputBuffer.current, event.key);
      inputBuffer.current = result.buffer;
      if (!result.matched) return;

      setUnlocked(true);
      try {
        window.sessionStorage.setItem(KONAMI_SESSION_KEY, "true");
      } catch {
        // The unlock still works for this render if storage is unavailable.
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [unlocked]);

  if (!unlocked) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="scav-invaders-unlock font-arcade inline-flex items-center gap-2 border border-[#9dff2e]/70 bg-black/80 px-3 py-2 text-[9px] leading-none tracking-[0.16em] text-[#9dff2e] shadow-[0_0_16px_rgba(157,255,46,0.18)] transition-colors hover:bg-[#9dff2e] hover:text-black focus-visible:ring-[#9dff2e] sm:text-[10px]"
        aria-label="Play Scav Invaders"
      >
        <span aria-hidden="true" className="text-[#ffd928]">
          ▶
        </span>
        PLAY RAID
      </button>
      {open ? <ScavInvadersGame open={open} onOpenChange={setOpen} /> : null}
    </div>
  );
}
