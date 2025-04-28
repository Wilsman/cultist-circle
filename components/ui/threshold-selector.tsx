"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ChevronUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";


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
    const savedThreshold = localStorage.getItem("userThreshold");
    const parsed = Number(savedThreshold);
    if (savedThreshold && Number.isFinite(parsed)) {
      onChange(parsed);
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
    localStorage.setItem("userThreshold", newThreshold.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newThreshold = isNaN(newValue) ? 0 : newValue;
    onChange(newThreshold);
    localStorage.setItem("userThreshold", newThreshold.toString());
  };

  const handlePresetClick = (preset: number) => {
    onChange(preset);
    setIsCustom(false);
    localStorage.setItem("userThreshold", preset.toString());
  };

  return (
    <div
      ref={ref}
      className="w-68 bg-gray-700 text-white rounded shadow-md transition-colors duration-200"
    >
      <div
        id="threshold"
        className="flex items-center justify-between p-3 cursor-pointer border-b border-border"
        onClick={handleToggle}
      >
        <Label className="text-sm font-semibold">Threshold:</Label>
        <div className="flex items-center">
          <span className="m-1">{formatValue(value)}</span>
          {isOpen ? <ChevronUpIcon className="h-4 w-4 text-muted-secondary" /> : <ChevronDownIcon className="h-4 w-4 text-muted-secondary" />}
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
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Alert
                variant="default"
                className={`transition-all duration-300 hover:bg-gray-800/80 border-yellow-500/50 bg-gray-800/60 backdrop-blur-sm text-gray-200 rounded cursor-pointer ${value === 350001 ? 'ring-2 ring-yellow-500/50' : ''}`}
                onClick={() => handlePresetClick(350001)}
              >
                <AlertTitle className="flex items-center gap-2 text-yellow-500/90">
                  <span className="text-base font-bold">350,001+</span>
                  <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    Guaranteed
                  </span>
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm">
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
                  <span className="text-base font-bold">400,000+</span>
                  <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    Mixed Chances
                  </span>
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm space-y-2">
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
