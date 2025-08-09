"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ModeToggleProps {
  isPVE: boolean
  onToggle: (isPVEActive: boolean) => void
  embedded?: boolean
}

export function ModeToggle({ isPVE, onToggle, embedded = false }: ModeToggleProps) {
  const [internalMode, setInternalMode] = useState<"PVP" | "PVE">(
    isPVE ? "PVE" : "PVP"
  )

  useEffect(() => {
    setInternalMode(isPVE ? "PVE" : "PVP")
  }, [isPVE])

  const handleModeChange = (newMode: "PVP" | "PVE") => {
    setInternalMode(newMode)
    onToggle(newMode === "PVE")
  }

  return (
    <div
      id="mode-toggle-container"
      className={embedded ? "" : "flex items-center justify-center"}
    >
      <div
        className={
          embedded
            ? "relative rounded-full p-0.5"
            : "relative bg-slate-700/50 backdrop-blur-sm rounded-full p-0.5 shadow-2xl border border-slate-600/30"
        }
      >
        <div className="flex relative">
          {/* Background slider */}
          <motion.div
            className="absolute inset-y-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg"
            initial={false}
            animate={{
              x: internalMode === "PVP" ? 4 : "calc(100% - 4px)",
              width: internalMode === "PVP" ? "calc(50% - 1px)" : "calc(50% - 1px)",
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />

          {/* PVP Button */}
          <button
            onClick={() => handleModeChange("PVP")}
            className={`relative z-10 px-4 py-1.5 rounded-full font-semibold text-xs sm:text-sm tracking-wide transition-all duration-200 min-w-[64px] sm:min-w-[80px] text-center ${ // compact
              internalMode === "PVP"
                ? "text-white shadow-lg"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <motion.span
              animate={{
                scale: internalMode === "PVP" ? 1.05 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              PVP
            </motion.span>
          </button>

          {/* PVE Button */}
          <button
            onClick={() => handleModeChange("PVE")}
            className={`relative z-10 px-4 py-1.5 rounded-full font-semibold text-xs sm:text-sm tracking-wide transition-all duration-200 min-w-[64px] sm:min-w-[80px] text-center ${ // compact
              internalMode === "PVE"
                ? "text-white shadow-lg"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            <motion.span
              animate={{
                scale: internalMode === "PVE" ? 1.05 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              PVE
            </motion.span>
          </button>
        </div>

        {/* Glow effect (only in standalone) */}
        {!embedded && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-full blur-lg pointer-events-none"
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity, // Changed from Number.POSITIVE_INFINITY
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  )
}
