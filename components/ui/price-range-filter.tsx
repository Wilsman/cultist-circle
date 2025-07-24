"use client";

import { useState, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";

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
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const [inputValues, setInputValues] = useState<[string, string]>([
    value[0].toString(),
    value[1].toString(),
  ]);

  // Update local state when external value changes
  useEffect(() => {
    setLocalValue(value);
    setInputValues([value[0].toString(), value[1].toString()]);
  }, [value]);

  const handleSliderChange = useCallback(
    (newValue: number[]) => {
      const range: [number, number] = [newValue[0], newValue[1]];
      setLocalValue(range);
      setInputValues([range[0].toString(), range[1].toString()]);
      onChange(range);
    },
    [onChange]
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
        onChange(newValue);
      }
    },
    [inputValues, localValue, min, max, onChange]
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
    [inputValues, localValue, min, max]
  );

  const isAtDefaults = localValue[0] === min && localValue[1] === max;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isAtDefaults}
          className="h-6 px-2 text-xs"
          aria-label="Reset price range"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Slider */}
      <div className="px-2">
        <Slider
          value={localValue}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={Math.max(1, Math.floor((max - min) / 1000))}
          className="w-full"
          aria-label={`${label} slider`}
        />
      </div>

      {/* Range display and inputs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={inputValues[0]}
            onChange={(e) => handleInputChange(0, e.target.value)}
            onBlur={() => handleInputBlur(0)}
            min={min}
            max={max}
            className="h-7 w-20 text-xs"
            placeholder="Min"
            aria-label="Minimum price"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="number"
            value={inputValues[1]}
            onChange={(e) => handleInputChange(1, e.target.value)}
            onBlur={() => handleInputBlur(1)}
            min={min}
            max={max}
            className="h-7 w-20 text-xs"
            placeholder="Max"
            aria-label="Maximum price"
          />
        </div>
        
        {/* Range display */}
        <div className="text-xs text-muted-foreground font-mono">
          {formatPrice(localValue[0])} - {formatPrice(localValue[1])}
        </div>
      </div>
    </div>
  );
}
