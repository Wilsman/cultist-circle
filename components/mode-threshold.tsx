"use client"

import React, { useEffect, useRef, useCallback } from "react"
import posthog from "posthog-js"
import { ModeToggle } from "@/components/ModeToggle"
import ThresholdSelector from "@/components/ui/threshold-selector"

interface ModeThresholdProps {
  isPVE: boolean
  onModeToggle: (isPVE: boolean) => void
  threshold: number
  onThresholdChange: (newValue: number) => void
  className?: string
}

export function ModeThreshold({
  isPVE,
  onModeToggle,
  threshold,
  onThresholdChange,
  className,
}: ModeThresholdProps) {
  // Track dwell time between mode switches and on page hide
  const lastModeRef = useRef<"pve" | "pvp">(isPVE ? "pve" : "pvp")
  const lastTsRef = useRef<number>(performance.now())

  const captureModeSelected = useCallback(
    (mode: "pve" | "pvp") => {
      // Custom event with person property updates
      try {
        posthog.capture("mode_selected", {
          mode,
          source: "toggle",
          threshold,
          // Update person properties without requiring identify
          $set: { current_mode: mode },
          $set_once: { first_mode: mode },
        })
      } catch {
        // noop
      }
    },
    [threshold]
  )

  const captureDwell = useCallback(() => {
    const now = performance.now()
    const duration = Math.max(0, now - lastTsRef.current)
    const mode = lastModeRef.current
    if (duration > 0) {
      try {
        posthog.capture("mode_dwell", {
          mode,
          duration_ms: Math.round(duration),
          threshold,
        })
      } catch {
        // noop
      }
    }
    lastTsRef.current = now
  }, [threshold])

  // Flush dwell on visibility change (e.g., tab close or navigate)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") captureDwell()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [captureDwell])

  // When the mode prop changes, record dwell for the previous mode and update refs
  useEffect(() => {
    // Only act if mode actually changed
    const nextMode: "pve" | "pvp" = isPVE ? "pve" : "pvp"
    if (nextMode !== lastModeRef.current) {
      captureDwell()
      lastModeRef.current = nextMode
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPVE, captureDwell])

  const handleToggle = useCallback(
    (nextIsPVE: boolean) => {
      const mode: "pve" | "pvp" = nextIsPVE ? "pve" : "pvp"
      onModeToggle(nextIsPVE)
      captureModeSelected(mode)
      // lastModeRef is updated in the effect watching isPVE; we keep capture order here
    },
    [onModeToggle, captureModeSelected]
  )

  return (
    <div
      className={`flex items-stretch ${className ?? ""}`}
    >
      <div
        className="flex items-center gap-2 rounded-full bg-slate-700/50 border border-slate-600/30 backdrop-blur-sm px-1.5 py-0.5"
      >
        <ModeToggle isPVE={isPVE} onToggle={handleToggle} embedded />
        <div className="w-px h-6 bg-white/10 mx-1.5" />
        <ThresholdSelector value={threshold} onChange={onThresholdChange} embedded />
      </div>
    </div>
  )
}
