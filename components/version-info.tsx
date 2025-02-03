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
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(!isOpen);
            }
          }}
        >
          Current Version:{" "}
          <span className="font-semibold text-blue-400 ml-1 
            underline decoration-dotted sm:no-underline">
            {version}
          </span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="lg:w-auto bg-gray-800 border-gray-700 text-gray-200"
        // Add touch-specific styles
        style={{
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-yellow-500">
              🔄 Recent Updates
            </h4>
            <ul className="text-sm list-disc list-inside">
              <li>Switched to tarkov.dev API for faster price updates</li>
              <li>New Excluded Categories & Items settings | Allows more control</li>
              <li>Corrected recipes: Secure container Kappa (Desecrated)</li>
              <li>Improved server and local caching system</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-blue-500">
              🚀 Upcoming Features
            </h4>
            <ul className="text-sm list-disc list-inside">
              <li>Enhanced filtering and sorting capabilities</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-red-500">
              🚨 Known Issues
            </h4>
            <ul className="text-sm list-disc list-inside">
              <li>Cache optimization in progress</li>
              <li>
                <span className="font-semibold">
                  Pinned item combinations may result in suboptimal pricing
                </span>
              </li>
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
