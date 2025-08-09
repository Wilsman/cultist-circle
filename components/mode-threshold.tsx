"use client"

import React from "react"
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
  return (
    <div
      className={`flex items-stretch ${className ?? ""}`}
    >
      <div
        className="flex items-center gap-2 rounded-full bg-slate-700/50 border border-slate-600/30 backdrop-blur-sm px-1.5 py-0.5"
      >
        <ModeToggle isPVE={isPVE} onToggle={onModeToggle} embedded />
        <div className="w-px h-6 bg-white/10 mx-1.5" />
        <ThresholdSelector value={threshold} onChange={onThresholdChange} embedded />
      </div>
    </div>
  )
}
