"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useState } from "react";

interface VersionInfoProps {
  version: string;
}

export function VersionInfo({ version }: VersionInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <span
          className="cursor-pointer hover:text-gray-300 inline-flex items-center 
            px-2 py-1 rounded-md border border-gray-600 
            hover:border-gray-500 active:bg-gray-700 
            transition-colors duration-200 
            sm:border-transparent sm:p-0"
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsOpen(!isOpen);
            }
          }}
        >
          Current Version:{" "}
          <span
            className="font-semibold text-blue-400 ml-1 
            underline decoration-dotted sm:no-underline"
          >
            {version}
          </span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-96 bg-gray-800 border-gray-700 text-gray-200"
        style={{
          touchAction: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div className="space-y-3">
          <div className="border-b border-gray-700 pb-2">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="text-emerald-500">v{version}</span>
              <span className="text-xs text-gray-400">
                Latest Release [13/02/2025]
              </span>
            </h4>
            <div className="space-y-2">
              <div>
                <h5 className="text-xs font-medium text-blue-400 mb-1">
                  New Features
                </h5>
                <ul className="text-xs space-y-1 text-gray-300">
                  <li>• Added sort by recent updated items</li>
                  <li>• Improved UI/UX for item selector</li>
                  <li>• Select ALL option for item filters in settings</li>
                  <li>• Keyboard navigation support:</li>
                  <li className="ml-4">
                    - TAB/ENTER: Confirm and navigate fields
                  </li>
                  <li className="ml-4">- UP/DOWN: Browse search results</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-700 pb-2">
            <h5 className="text-xs font-medium text-yellow-500 mb-1">
              In Progress
            </h5>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>• Enhanced filtering system</li>
              <li>• Faster price update integration</li>
              <li>• Market data refresh improvements</li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-medium text-red-400 mb-1">
              Known Issues
            </h5>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>• Cache optimization in progress</li>
              <li>• Pinned item pricing refinements needed</li>
              <li>• Recipe attempt system adjustments pending</li>
            </ul>
          </div>

          <div className="pt-2 text-center text-sm text-pink-400">
            Thank you for all your amazing feedback and continued support! ❤️ ❤️
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
