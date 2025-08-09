import React from 'react'
import { Button } from "@/components/ui/button"
import { Dices, RefreshCw } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface AutoSelectButtonProps {
  isCalculating: boolean
  hasAutoSelected: boolean
  handleAutoPick: () => void
}

export function AutoSelectButton({
  isCalculating,
  hasAutoSelected,
  handleAutoPick
}: AutoSelectButtonProps) {
  const baseClasses =
    "relative overflow-hidden w-full md:max-w-[320px] lg:max-w-[360px] h-11 px-5 rounded-full border border-slate-600/30 text-white shadow-lg";

  if (isCalculating) {
    return (
      <TooltipProvider>
        <div className="flex flex-col justify-center items-center w-full">
          <Button
            id="auto-select"
            disabled
            className={
              baseClasses +
              " bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 cursor-wait"
            }
          >
            {/* animated shimmer overlay */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[length:200%_100%] animate-[shimmer_2.2s_linear_infinite]"
            />
            {/* subtle pulsing glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-full bg-blue-500/20 blur-2xl animate-pulse"
            />
            <span className="relative z-10 inline-flex items-center">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              <span className="font-medium">Calculating</span>
              <span className="ml-1 flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" />
                <span
                  className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </span>
          </Button>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col justify-center items-center w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="auto-select"
              onClick={handleAutoPick}
              disabled={isCalculating}
              className={
                baseClasses +
                " bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-500/90 hover:to-indigo-600/90"
              }
            >
              {hasAutoSelected ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-roll
                </>
              ) : (
                <>
                  <Dices className="mr-2 h-4 w-4" />
                  Select Optimal
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Automatically select items to meet the threshold
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
