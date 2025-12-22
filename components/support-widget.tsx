"use client";

import { useState } from "react";
import { Coffee, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKofiClick = () => {
    window.open("https://ko-fi.com/wilsman77", "_blank");
    setIsOpen(false);
  };

  const handleBmcClick = () => {
    window.open("https://www.buymeacoffee.com/wilsman77", "_blank");
    setIsOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-3">
        {/* Support Options Panel */}
        {isOpen && (
          <div
            className={cn(
              "flex flex-col gap-2 rounded-2xl border border-slate-800/50 bg-slate-900/80 p-3 backdrop-blur shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
              "w-64"
            )}
          >
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-sm font-semibold text-slate-200">
                Support the Project
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-100"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <button
              onClick={handleKofiClick}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-950/50 p-3 text-left transition-all hover:bg-slate-800/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00b9fe]/10 text-[#00b9fe]">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-100">
                  Ko-fi
                </span>
                <span className="text-xs text-slate-400">
                  Support via Ko-fi
                </span>
              </div>
            </button>

            <button
              onClick={handleBmcClick}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-950/50 p-3 text-left transition-all hover:bg-slate-800/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFDD00]/10 text-[#FFDD00]">
                <Coffee className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-100">
                  Buy Me a Coffee
                </span>
                <span className="text-xs text-slate-400">Support via BMC</span>
              </div>
            </button>
          </div>
        )}

        {/* Floating Trigger Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "group relative flex items-center gap-2 rounded-full border border-slate-800/50",
                "bg-slate-900/80 text-slate-100 backdrop-blur px-4 py-2 shadow-lg transition-all duration-300",
                "hover:bg-slate-900/90 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400/60",
                isOpen &&
                  "bg-slate-800 border-slate-700 ring-2 ring-slate-400/30"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  isOpen
                    ? "text-red-500 fill-red-500"
                    : "text-slate-400 group-hover:text-red-400"
                )}
              />
              <span className="text-sm font-medium">Support Me</span>
              {!isOpen && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Support my work</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
