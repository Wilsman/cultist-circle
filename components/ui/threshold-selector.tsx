"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


interface ThresholdSelectorProps {
  value: number;
  onChange: (value: number) => void;
  embedded?: boolean;
}

export default function ThresholdSelector({
  value,
  onChange,
  embedded = false,
}: ThresholdSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [open, setOpen] = useState(false);
  // Buffer live slider/input changes locally to reduce re-layout churn
  const [tempValue, setTempValue] = useState<number>(value);

  useEffect(() => {
    if (value !== 350001 && value !== 400000) {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [value]);

  // Keep local buffer in sync when external value changes or popover opens
  useEffect(() => {
    setTempValue(value);
  }, [value, open]);

  // Initialize from localStorage only once to avoid re-triggering on changing onChange identity
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    const savedThreshold = localStorage.getItem("userThreshold");
    const parsed = Number(savedThreshold);
    if (savedThreshold && Number.isFinite(parsed) && parsed !== value) {
      onChange(parsed);
    }
    didInitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSliderChange = (newValue: number[]) => {
    // Update only the local buffer during drag
    const newThreshold = newValue[0];
    setTempValue(newThreshold);
  };

  const handleSliderCommit = (newValue: number[]) => {
    // Commit once on release to avoid ResizeObserver loops from rapid updates
    const newThreshold = newValue[0];
    onChange(newThreshold);
    localStorage.setItem("userThreshold", newThreshold.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newThreshold = isNaN(newValue) ? 0 : newValue;
    setTempValue(newThreshold);
  };

  const commitInput = () => {
    const newThreshold = Number.isFinite(tempValue) ? tempValue : 0;
    onChange(newThreshold);
    localStorage.setItem("userThreshold", newThreshold.toString());
  };

  const handlePresetClick = (preset: number) => {
    onChange(preset);
    setIsCustom(false);
    localStorage.setItem("userThreshold", preset.toString());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={embedded ? "ghost" : "outline"}
          size="sm"
          className={
            embedded
              ? "h-9 px-2 rounded-full text-gray-200 hover:bg-white/5"
              : "h-9 px-3 rounded-md bg-gray-800/50 border-gray-700 text-gray-200 hover:bg-gray-800"
          }
        >
          <span className="text-xs mr-1.5">Threshold:</span>
          <span className="text-sm font-medium">{formatValue(value)}</span>
          {open ? (
            <ChevronUpIcon className="ml-1 h-4 w-4" />
          ) : (
            <ChevronDownIcon className="ml-1 h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-gray-900/95 border-gray-700 text-gray-200">
        <Slider
          value={[tempValue]}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          max={1000000}
          step={1000}
          className="mb-3"
        />
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-1 gap-3">
            <Alert
              variant="default"
              className={`transition-all duration-300 hover:bg-gray-800/80 border-yellow-500/50 bg-gray-800/60 backdrop-blur-sm text-gray-200 rounded cursor-pointer ${value === 350001 ? 'ring-2 ring-yellow-500/50' : ''}`}
              onClick={() => handlePresetClick(350001)}
            >
              <AlertTitle className="flex items-center gap-2 text-yellow-500/90">
                <span className="text-sm font-bold">350,001+</span>
                <span className="text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
                  Guaranteed
                </span>
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500/90" />
                  <span>14h timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500/90" />
                  <span>High value item(s)</span>
                </div>
              </AlertDescription>
            </Alert>

            <Alert
              variant="default"
              className={`transition-all duration-300 hover:bg-gray-800/80 border-yellow-500/50 bg-gray-800/60 backdrop-blur-sm text-gray-200 rounded cursor-pointer ${value === 400000 ? 'ring-2 ring-yellow-500/50' : ''}`}
              onClick={() => handlePresetClick(400000)}
            >
              <AlertTitle className="flex items-center gap-2 text-yellow-500/90">
                <span className="text-sm font-bold">400,000+</span>
                <span className="text-[10px] bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
                  Mixed Chances
                </span>
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500/30" />
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500/90">25%</span> 6h
                    timer + Quest/Hideout items
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500/90" />
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500/90">75%</span> 14h
                    High value item(s)
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
        {isCustom && (
          <Input
            type="number"
            value={tempValue}
            onChange={handleInputChange}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInput();
            }}
            className="w-full mt-2 bg-primary text-secondary rounded h-8 text-sm"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
