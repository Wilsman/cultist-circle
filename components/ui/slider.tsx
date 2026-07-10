"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<
  typeof SliderPrimitive.Root
> {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    { className, trackClassName, rangeClassName, thumbClassName, ...props },
    ref,
  ) => {
    // Determine number of thumbs based on value array length
    const value = props.value ?? props.defaultValue ?? [0];
    const thumbCount = Array.isArray(value) ? Math.max(1, value.length) : 1;
    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20",
            trackClassName,
          )}
        >
          <SliderPrimitive.Range
            className={cn("absolute h-full bg-primary", rangeClassName)}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className={cn(
              "block h-4 w-4 rounded-full border border-primary/50 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
              thumbClassName,
            )}
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
