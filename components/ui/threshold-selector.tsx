"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronsUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import Cookies from "js-cookie";

interface ThresholdSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export default function ThresholdSelector({
  value,
  onChange,
}: ThresholdSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== 350001 && value !== 400000) {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [value]);

  useEffect(() => {
    const savedThreshold = Cookies.get("userThreshold");
    if (savedThreshold) {
      onChange(Number(savedThreshold));
    }
  }, [onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSliderChange = (newValue: number[]) => {
    const newThreshold = newValue[0];
    onChange(newThreshold);
    Cookies.set("userThreshold", newThreshold.toString(), { expires: 365 });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newThreshold = isNaN(newValue) ? 0 : newValue;
    onChange(newThreshold);
    Cookies.set("userThreshold", newThreshold.toString(), { expires: 365 });
  };

  const handlePresetClick = (preset: number) => {
    onChange(preset);
    setIsCustom(false);
    Cookies.set("userThreshold", preset.toString(), { expires: 365 });
  };

  return (
    <div
      ref={ref}
      className="w-64 bg-gray-700 text-white rounded shadow-md transition-colors duration-200"
    >
      <div
        id="threshold"
        className="flex items-center justify-between p-3 cursor-pointer border-b border-border"
        onClick={handleToggle}
      >
        <Label className="text-sm font-semibold">Threshold:</Label>
        <div className="flex items-center">
          <span className="mr-2">{formatValue(value)}</span>
          <ChevronsUpDown className="h-4 w-4 text-muted-secondary" />
        </div>
      </div>
      {isOpen && (
        <div className="p-3">
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            max={1000000}
            step={1000}
            className="mb-4"
          />
          <div className="flex justify-between mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={value === 350001 ? "outline" : "default"}
                    size="sm"
                    onClick={() => handlePresetClick(350001)}
                    className="text-sm text-primary bg-background hover:bg-background/80 rounded"
                  >
                    ₽350,001
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div>14 hours | High-value item reward</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={value === 400000 ? "outline" : "default"}
                    size="sm"
                    onClick={() => handlePresetClick(400000)}
                    className="text-sm text-primary bg-background hover:bg-background/80 rounded"
                  >
                    ₽400,000
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    6 hours (25% success chance) | Active tasks or hideout item
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isCustom && (
            <Input
              type="number"
              value={value}
              onChange={handleInputChange}
              className="w-full mt-2 bg-primary text-secondary rounded"
            />
          )}
        </div>
      )}
    </div>
  );
}
