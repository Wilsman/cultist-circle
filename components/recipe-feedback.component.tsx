"use client";

import React, { useState } from "react";
import { cva } from "class-variance-authority";
import {
  BarChart3,
  Check,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useRecipeFeedback,
  useRecipeFeedbackLifecycle,
} from "@/hooks/use-recipe-feedback";
import { GAME_MODE_LABELS, type GameMode } from "@/lib/game-mode";
import { getUnspecifiedModeCounts } from "@/lib/recipe-feedback";
import { cn } from "@/lib/utils";
import type { UserVote } from "@/types/recipe-feedback";

interface RecipeFeedbackProps {
  recipeId: string;
  modeRestriction?: "pvp-only";
}

const FEEDBACK_MODES: { value: GameMode; label: string; title: string }[] = [
  { value: "pvp", label: "PVP", title: "PVP" },
  { value: "pve", label: "PVE", title: "PVE" },
  { value: "season", label: "PVP-S", title: "PVP Season" },
];

export const RECIPE_FEEDBACK_MODES = FEEDBACK_MODES;

export function RecipeFeedbackProvider({ children }: React.PropsWithChildren) {
  useRecipeFeedbackLifecycle();
  return <>{children}</>;
}

const voteButtonVariants = cva(
  "h-10 gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all sm:h-7",
  {
    variants: {
      tone: {
        worked:
          "hover:border-emerald-500/40 hover:bg-emerald-950/25 hover:text-emerald-300",
        didnt_work:
          "hover:border-rose-500/40 hover:bg-rose-950/25 hover:text-rose-300",
      },
      selected: {
        false: "border-gray-700/70 bg-gray-800/50 text-gray-300",
        true: "",
      },
    },
    compoundVariants: [
      {
        tone: "worked",
        selected: true,
        className:
          "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
      },
      {
        tone: "didnt_work",
        selected: true,
        className:
          "border-rose-500/60 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
      },
    ],
  },
);

interface VoteButtonProps {
  vote: UserVote;
  count: number;
  selected: boolean;
  disabled: boolean;
  loading: boolean;
}

const VoteButton = React.forwardRef<
  HTMLButtonElement,
  VoteButtonProps & React.ComponentPropsWithoutRef<"button">
>(function VoteButton(
  { vote, count, selected, disabled, loading, ...triggerProps },
  ref,
) {
  const worked = vote === "worked";
  const label = worked ? "Worked" : "Didn't work";
  const Icon = worked ? ThumbsUp : ThumbsDown;
  return (
    <Button
      {...triggerProps}
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      aria-label={`Mark as ${label.toLowerCase()} (currently ${count})`}
      disabled={disabled}
      className={voteButtonVariants({ tone: vote, selected })}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span
        className={cn(
          "ml-0.5 rounded px-1 text-[10px] font-semibold",
          selected
            ? worked
              ? "bg-emerald-500/30 text-emerald-200"
              : "bg-rose-500/30 text-rose-200"
            : "bg-gray-700/60 text-gray-300",
        )}
      >
        {loading ? "–" : count}
      </span>
    </Button>
  );
});

interface VoteModePickerProps extends VoteButtonProps {
  userVote: UserVote | undefined;
  userMode: GameMode | undefined;
  modeRestriction?: "pvp-only";
  onSelect: (mode: GameMode) => void;
  onRemove: () => void;
}

function VoteModePicker({
  vote,
  count,
  selected,
  disabled,
  loading,
  userVote,
  userMode,
  modeRestriction,
  onSelect,
  onRemove,
}: VoteModePickerProps) {
  const [open, setOpen] = useState(false);
  const worked = vote === "worked";
  const label = worked ? "Worked" : "Didn't work";
  const isCurrentVote = userVote === vote;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <VoteButton
          vote={vote}
          count={count}
          selected={selected}
          disabled={disabled}
          loading={loading}
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-56 border-gray-700/60 bg-gray-900/95 p-3 text-gray-200 shadow-xl backdrop-blur-md"
      >
        <p className="text-xs font-semibold text-gray-100">
          Report as {label.toLowerCase()}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-500">Choose game mode</p>
        <div
          className="mt-2 grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-label={`Game mode for ${label.toLowerCase()} report`}
        >
          {FEEDBACK_MODES.map((mode) => {
            const restricted =
              modeRestriction === "pvp-only" && mode.value !== "pvp";
            const current = isCurrentVote && userMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                role="radio"
                title={
                  restricted
                    ? "This recipe is available in PVP only"
                    : mode.title
                }
                aria-checked={current}
                disabled={restricted || current}
                onClick={() => {
                  onSelect(mode.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-10 items-center justify-center gap-1 rounded-md border text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 sm:h-8",
                  current
                    ? "border-blue-400/40 bg-blue-500/20 text-blue-200"
                    : "border-gray-700/80 bg-gray-950/45 text-gray-400 hover:border-gray-600 hover:bg-gray-800 hover:text-gray-100",
                  restricted &&
                    "cursor-not-allowed border-gray-800 text-gray-700 opacity-60 hover:border-gray-800 hover:bg-gray-950/45 hover:text-gray-700",
                )}
              >
                {current && <Check className="h-3 w-3" />}
                {mode.label}
              </button>
            );
          })}
        </div>
        {modeRestriction === "pvp-only" && (
          <p className="mt-2 text-[10px] text-amber-300/90">
            This recipe can only be reported for PVP.
          </p>
        )}
        {isCurrentVote && userMode && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-[10px] font-semibold text-rose-300 transition-colors hover:bg-rose-950/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
          >
            <Trash2 className="h-3 w-3" />
            Remove my {GAME_MODE_LABELS[userMode]} report
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const RecipeFeedback = React.memo(function RecipeFeedback({
  recipeId,
  modeRestriction,
}: RecipeFeedbackProps) {
  const {
    stats,
    userVote,
    userMode,
    castVote,
    formattedRecency,
    formattedModeRecency,
    isRecentlyActive,
    isLoading,
    canVote,
    retry,
    isPending,
    loadError,
    voteError,
    message,
  } = useRecipeFeedback(recipeId);
  const controlsDisabled = !canVote || isPending;
  const unspecified = getUnspecifiedModeCounts(stats);

  return (
    <div className="mt-3.5 border-t border-gray-700/40 pt-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {loadError ? (
            <div className="flex flex-wrap items-center gap-2 text-rose-300">
              <span>{loadError}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void retry()}
                className="h-9 px-2 text-[11px] text-rose-200 hover:bg-rose-950/40 sm:h-7"
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Retry
              </Button>
            </div>
          ) : isLoading ? (
            <span className="inline-flex items-center text-gray-400">
              <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500" />
              Loading community reports…
            </span>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="View community report details"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-1 text-left text-gray-300 transition-colors hover:bg-gray-800/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 sm:h-7"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isRecentlyActive ? "bg-emerald-400" : "bg-gray-500",
                    )}
                  />
                  <span>{formattedRecency}</span>
                  <BarChart3 className="h-3 w-3 text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-52 border-gray-700/60 bg-gray-900/95 p-3 text-gray-200 shadow-xl backdrop-blur-md"
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Community reports
                </p>
                <div className="flex flex-col gap-1.5">
                  {FEEDBACK_MODES.map((mode) => {
                    const counts = stats.modes?.[mode.value] ?? {
                      worked: 0,
                      didntWork: 0,
                    };
                    return (
                      <ModeCountRow
                        key={mode.value}
                        label={mode.label}
                        worked={counts.worked}
                        didntWork={counts.didntWork}
                      />
                    );
                  })}
                  {(unspecified.worked > 0 || unspecified.didntWork > 0) && (
                    <ModeCountRow
                      label="Unspecified"
                      worked={unspecified.worked}
                      didntWork={unspecified.didntWork}
                    />
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {formattedModeRecency && !loadError && !isLoading && (
            <p className="mt-0.5 pl-3 text-[10px] text-gray-500">
              {formattedModeRecency}
            </p>
          )}
          {voteError && (
            <p className="mt-1 text-[11px] text-rose-300">{voteError}</p>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {voteError ?? message ?? ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <VoteModePicker
            vote="worked"
            count={stats.workedCount}
            selected={userVote === "worked"}
            disabled={controlsDisabled}
            loading={isLoading}
            userVote={userVote}
            userMode={userMode}
            modeRestriction={modeRestriction}
            onSelect={(mode) => void castVote("worked", mode)}
            onRemove={() => {
              if (userMode) void castVote("worked", userMode);
            }}
          />
          <VoteModePicker
            vote="didnt_work"
            count={stats.didntWorkCount}
            selected={userVote === "didnt_work"}
            disabled={controlsDisabled}
            loading={isLoading}
            userVote={userVote}
            userMode={userMode}
            modeRestriction={modeRestriction}
            onSelect={(mode) => void castVote("didnt_work", mode)}
            onRemove={() => {
              if (userMode) void castVote("didnt_work", userMode);
            }}
          />
        </div>
      </div>
    </div>
  );
});

function ModeCountRow({
  label,
  worked,
  didntWork,
}: {
  label: string;
  worked: number;
  didntWork: number;
}) {
  return (
    <div className="flex items-center justify-between gap-5 text-[11px]">
      <span className="font-semibold text-gray-400">{label}</span>
      <span className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
          <ThumbsUp className="h-3 w-3" />
          {worked}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-rose-300">
          <ThumbsDown className="h-3 w-3" />
          {didntWork}
        </span>
      </span>
    </div>
  );
}
