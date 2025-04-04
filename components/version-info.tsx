"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface VersionInfoProps {
  version: string;
}

export function VersionInfo({ version }: VersionInfoProps) {
  return (
    <Accordion type="single" collapsible className="max-w-md mx-auto">
      <AccordionItem value="version-info" className="border-gray-700">
        <AccordionTrigger className="hover:no-underline py-2 justify-center">
          <div className="inline-flex items-center gap-1.5 text-sm">
            <span className="text-gray-400">Current Version:</span>
            <span className="font-medium text-blue-400">{version}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 bg-gray-800/50 rounded-lg p-3">
          {/* Recent Updates */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-yellow-500 flex items-center gap-2">
              <span>🔄</span>
              <span>Recent Updates</span>
            </h4>
            <ul className="text-sm text-gray-200">
              <li className="flex gap-2">
                <span className="text-yellow-500">•</span>
                <span className="text-left">
                  Switched to tarkov.dev API for faster price updates
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-500">•</span>
                <span className="text-left">
                  NEW recipes: added new Labyrinth Figurine recipes
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-500">•</span>
                <span className="text-left">
                  New Excluded Categories & Items settings | Allows more control
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-500">•</span>
                <span className="text-left">
                  Improved server and local caching system
                </span>
              </li>
            </ul>
          </div>

          {/* Upcoming Features */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-blue-500 flex items-center gap-2">
              <span>🚀</span>
              <span>Upcoming Features</span>
            </h4>
            <ul className="text-sm text-gray-200">
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span className="text-left">
                  Enhanced filtering and sorting capabilities
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span className="text-left">
                  Add 24h average flea price option
                </span>
              </li>
            </ul>
          </div>

          {/* Known Issues */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-500 flex items-center gap-2">
              <span>🚨</span>
              <span>Known Issues</span>
            </h4>
            <ul className="text-sm text-gray-200">
              <li className="flex gap-2">
                <span className="text-red-500">•</span>
                <span className="text-left">
                  Cache optimization in progress
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500">•</span>
                <span className="text-left">
                  Having 4/5 items pinned, may result in auto-selecting to fail
                </span>
              </li>
            </ul>
          </div>

          <div className="text-center text-sm text-pink-400 pt-2 border-t border-gray-700">
            Thank you for all your amazing feedback and continued support! ❤️
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
