
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

interface CustomSwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  labelLeft?: React.ReactNode
  labelRight?: React.ReactNode
  thumbClassName?: string
  rootClassName?: string
}

const TextSwitch = React.forwardRef< // Renamed here
  React.ElementRef<typeof SwitchPrimitives.Root>,
  CustomSwitchProps
>(({ className, labelLeft, labelRight, thumbClassName, rootClassName, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-10 w-28 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:bg-gray-700 data-[state=checked]:bg-gray-700", // Consistent track background
      className,
      rootClassName
    )}
    {...props}
    ref={ref}
  >
    {/* Labels Container - positioned behind the thumb */}
    <div className="absolute inset-0 flex items-center justify-around w-full px-2 z-0">
      <span className="text-xs font-medium select-none">
        {labelLeft}
      </span>
      <span className="text-xs font-medium select-none">
        {labelRight}
      </span>
    </div>
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute block h-8 w-12 rounded-full bg-blue-500/75 shadow-lg ring-0 transition-transform duration-200 ease-in-out z-10",
        // Using bg-blue-500/75 for 75% opacity. Adjust as needed (e.g., bg-blue-500/50 for 50%).
        "data-[state=unchecked]:translate-x-1", // 0.25rem from left
        "data-[state=checked]:translate-x-[3.75rem]", // Approx. 7rem (track) - 3rem (thumb) - 0.25rem (offset)
        thumbClassName
      )}
    />
  </SwitchPrimitives.Root>
))
TextSwitch.displayName = SwitchPrimitives.Root.displayName // Renamed here

export { TextSwitch } // Renamed here
