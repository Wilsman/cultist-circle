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
  if (isCalculating) {
    return (
      <TooltipProvider>
        <div className="flex flex-col justify-center items-center">
          <Button
            id="auto-select"
            disabled
            className="w-full md:max-w-[300px] lg:max-w-[300px] text-white bg-blue-500">
            <div className="lds-ellipsis inline-flex items-center">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </Button>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col justify-center items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="auto-select"
              onClick={handleAutoPick}
              disabled={isCalculating}
              className="w-full md:max-w-[300px] lg:max-w-[300px] text-white bg-blue-500 hover:bg-blue-700"
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
