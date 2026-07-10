"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface PriceRangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onReset: () => void;
  className?: string;
  label?: string;
}

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K`;
  }
  return price.toString();
}

export function PriceRangeFilter({
  min,
  max,
  value,
  onChange,
  onReset,
  className = "",
  label = "Price Range",
}: PriceRangeFilterProps) {
  const { t } = useLanguage();
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const [inputValues, setInputValues] = useState<[string, string]>([
    value[0].toString(),
    value[1].toString(),
  ]);

  // --- Log scale helpers (slider is 0..1000, values are real prices) ---
  const normMinMax = useMemo(() => {
    // Avoid log(0) by shifting when min <= 0
    const shift = min <= 0 ? 1 - min : 0;
    const a = min + shift;
    const b = max + shift;
    return { shift, a: Math.max(1, a), b: Math.max(1, b) };
  }, [min, max]);

  const toSlider = useCallback(
    (v: number) => {
      const { shift, a, b } = normMinMax;
      const nv = Math.max(1, v + shift);
      if (a === b) return 0; // degenerate case
      const t = (Math.log(nv) - Math.log(a)) / (Math.log(b) - Math.log(a));
      // clamp [0,1]
      const tc = Math.min(1, Math.max(0, t));
      return Math.round(tc * 1000);
    },
    [normMinMax],
  );

  const fromSlider = useCallback(
    (s: number) => {
      const { shift, a, b } = normMinMax;
      if (a === b) return Math.max(0, a - shift);
      const t = Math.min(1, Math.max(0, s / 1000));
      const nv = Math.exp(Math.log(a) + t * (Math.log(b) - Math.log(a)));
      // round to integer rubles
      const real = Math.round(nv - shift);
      return real;
    },
    [normMinMax],
  );

  // Keep a separate slider-value in 0..1000 that mirrors localValue
  const [sliderValue, setSliderValue] = useState<[number, number]>([
    toSlider(value[0]),
    toSlider(value[1]),
  ]);

  // Update local state when external value changes
  useEffect(() => {
    const sliderMin = toSlider(value[0]);
    const sliderMax = toSlider(value[1]);
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLocalValue(value);
      setInputValues([value[0].toString(), value[1].toString()]);
      setSliderValue([sliderMin, sliderMax]);
    });
    return () => {
      cancelled = true;
    };
  }, [value, toSlider]);

  const handleSliderChange = useCallback(
    (newValue: number[]) => {
      const s0 = Math.min(newValue[0], newValue[1]);
      const s1 = Math.max(newValue[0], newValue[1]);
      setSliderValue([s0, s1] as [number, number]);

      const v0 = fromSlider(s0);
      const v1 = fromSlider(s1);
      const range: [number, number] = [v0, v1];
      setLocalValue(range);
      setInputValues([range[0].toString(), range[1].toString()]);
      onChange(range);
    },
    [fromSlider, onChange],
  );

  const handleInputChange = useCallback(
    (index: 0 | 1, inputValue: string) => {
      const newInputValues: [string, string] = [...inputValues];
      newInputValues[index] = inputValue;
      setInputValues(newInputValues);

      const numValue = Number(inputValue);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        const newValue: [number, number] = [...localValue];
        newValue[index] = numValue;

        // Ensure min <= max
        if (index === 0 && numValue > newValue[1]) {
          newValue[1] = numValue;
        } else if (index === 1 && numValue < newValue[0]) {
          newValue[0] = numValue;
        }

        setLocalValue(newValue);
        setSliderValue([toSlider(newValue[0]), toSlider(newValue[1])]);
        onChange(newValue);
      }
    },
    [inputValues, localValue, min, max, onChange, toSlider],
  );

  const handleInputBlur = useCallback(
    (index: 0 | 1) => {
      // Reset input to current value if invalid
      const numValue = Number(inputValues[index]);
      if (isNaN(numValue) || numValue < min || numValue > max) {
        const newInputValues: [string, string] = [...inputValues];
        newInputValues[index] = localValue[index].toString();
        setInputValues(newInputValues);
      }
    },
    [inputValues, localValue, min, max],
  );

  const isAtDefaults = localValue[0] === min && localValue[1] === max;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Label className="whitespace-nowrap text-xs font-semibold">
            {label}
          </Label>
          <span className="truncate rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] font-medium tabular-nums text-primary">
            {formatPrice(localValue[0])} – {formatPrice(localValue[1])} ₽
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isAtDefaults}
          className="h-7 shrink-0 rounded-md px-2 text-[11px]"
          aria-label={t("Reset price range")}
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          {t("Reset")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[8.5rem_minmax(10rem,1fr)_8.5rem] sm:items-center">
        <div>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Min
            </span>
            <Input
              type="number"
              value={inputValues[0]}
              onChange={(e) => handleInputChange(0, e.target.value)}
              onBlur={() => handleInputBlur(0)}
              min={min}
              max={max}
              className="h-8 w-full rounded-lg bg-background pl-10 pr-6 font-mono text-xs tabular-nums"
              placeholder={t("Min")}
              aria-label={t("Minimum price")}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              ₽
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <Slider
            value={sliderValue}
            onValueChange={handleSliderChange}
            min={0}
            max={1000}
            step={1}
            className="h-6 w-full"
            trackClassName="h-1.5 bg-muted shadow-inner"
            rangeClassName="bg-primary"
            thumbClassName="h-4 w-4 border-2 border-primary bg-background shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`${label} slider`}
          />
          <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>{formatPrice(min)}</span>
            <span>{formatPrice(max)}</span>
          </div>
        </div>
        <div>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Max
            </span>
            <Input
              type="number"
              value={inputValues[1]}
              onChange={(e) => handleInputChange(1, e.target.value)}
              onBlur={() => handleInputBlur(1)}
              min={min}
              max={max}
              className="h-8 w-full rounded-lg bg-background pl-10 pr-6 font-mono text-xs tabular-nums"
              placeholder={t("Max")}
              aria-label={t("Maximum price")}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              ₽
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
