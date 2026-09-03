"use client";

import React from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRecipeFeedback } from "@/hooks/use-recipe-feedback";

interface RecipeFeedbackProps {
  recipeId: string;
}

export const RecipeFeedback = React.memo(function RecipeFeedback({
  recipeId,
}: RecipeFeedbackProps) {
  const {
    stats,
    userVote,
    castVote,
    formattedRecency,
    isRecentlyActive,
    isLoading,
    isPending,
    error,
  } = useRecipeFeedback(recipeId);

  const controlsDisabled = isLoading || isPending;

  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-700/40 pt-2.5 text-xs">
      {/* Activity and Recency Status */}
      <div className="flex items-center gap-1.5 text-gray-400">
        {error ? (
          <span className="inline-flex items-center text-rose-300">
            <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span>{error}</span>
          </span>
        ) : isLoading ? (
          <span className="inline-flex items-center text-gray-400">
            <span className="mr-1.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500" />
            <span>Loading community reports…</span>
          </span>
        ) : isRecentlyActive ? (
          <span className="inline-flex items-center">
            <span className="relative mr-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-emerald-400">Active</span>
            <span className="mx-1 text-gray-500">·</span>
            <span className="text-gray-300">{formattedRecency}</span>
          </span>
        ) : (
          <span className="inline-flex items-center text-gray-400">
            <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-gray-500" />
            <span>{formattedRecency}</span>
          </span>
        )}
      </div>

      {/* Verification Voting Buttons */}
      <div className="flex items-center gap-1.5">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={userVote === "worked"}
                aria-label={`Mark as worked (currently ${stats.workedCount})`}
                onClick={() => void castVote("worked")}
                disabled={controlsDisabled}
                className={`h-7 gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  userVote === "worked"
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-400 hover:bg-emerald-500/25"
                    : "border-gray-700/70 bg-gray-800/50 text-gray-300 hover:border-emerald-500/40 hover:bg-emerald-950/25 hover:text-emerald-300"
                }`}
              >
                <ThumbsUp className="h-3 w-3" />
                <span>Worked</span>
                <span
                  className={`ml-0.5 rounded px-1 py-0.2 text-[10px] font-semibold ${
                    userVote === "worked"
                      ? "bg-emerald-500/30 text-emerald-200"
                      : "bg-gray-700/60 text-gray-300"
                  }`}
                >
                  {isLoading ? "–" : stats.workedCount}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {userVote === "worked"
                ? "Click to remove your vote"
                : "Vote that this recipe worked for you"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={userVote === "didnt_work"}
                aria-label={`Mark as didn't work (currently ${stats.didntWorkCount})`}
                onClick={() => void castVote("didnt_work")}
                disabled={controlsDisabled}
                className={`h-7 gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  userVote === "didnt_work"
                    ? "border-rose-500/60 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:border-rose-400 hover:bg-rose-500/25"
                    : "border-gray-700/70 bg-gray-800/50 text-gray-300 hover:border-rose-500/40 hover:bg-rose-950/25 hover:text-rose-300"
                }`}
              >
                <ThumbsDown className="h-3 w-3" />
                <span>Didn&apos;t work</span>
                <span
                  className={`ml-0.5 rounded px-1 py-0.2 text-[10px] font-semibold ${
                    userVote === "didnt_work"
                      ? "bg-rose-500/30 text-rose-200"
                      : "bg-gray-700/60 text-gray-300"
                  }`}
                >
                  {isLoading ? "–" : stats.didntWorkCount}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {userVote === "didnt_work"
                ? "Click to remove your vote"
                : "Vote that this recipe did not produce the expected result"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});
