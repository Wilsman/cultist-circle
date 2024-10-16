import React from 'react'
import { Button } from "@/components/ui/button"
import { Dices } from "lucide-react"
import Link from "next/link"
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
      <div className="text-center">
        <p className="text-gray-300 mb-2">
          Calculating best combination...
        </p>
        <div className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col justify-center items-center">
        <div className="flex justify-center mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id="auto-select"
                onClick={handleAutoPick}
                disabled={isCalculating}
                className="bg-blue-500 hover:bg-blue-700 md:min-w-[300px] sm:min-w-[300px] mr-2"
              >
                {hasAutoSelected ? (
                  <>
                    <Dices className="mr-1 h-5 w-5" />
                    Reroll
                  </>
                ) : (
                  "AUTO SELECT"
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasAutoSelected
                ? "Reroll to find a new combination"
                : "Automatically select best items"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/recipes" prefetch={false}>
                <Button className="bg-red-500 hover:bg-red-700">
                  Recipes
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>View recipes</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
