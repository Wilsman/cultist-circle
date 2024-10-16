import React from 'react'
import { Switch } from "@/components/ui/switch"

interface ModeToggleProps {
  isPVE: boolean
  onToggle: (checked: boolean) => void
}

export function ModeToggle({ isPVE, onToggle }: ModeToggleProps) {
  return (
    <div
      id="pvp-toggle"
      className="flex items-center justify-center mb-6 w-full"
    >
      <span className="text-gray-300">PVP</span>
      <Switch
        checked={isPVE}
        onCheckedChange={onToggle}
        className="mx-2 data-[state=checked]:bg-white data-[state=unchecked]:bg-white"
      />
      <span className="text-gray-300">PVE</span>
    </div>
  )
}
