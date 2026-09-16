"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useItemsData } from "@/hooks/use-items-data";
import { GAME_MODES, GAME_MODE_LABELS, type GameMode } from "@/lib/game-mode";
import {
  recipeSubmissionSchema,
  SPECIAL_RECIPE_TIMERS,
  type RecipeSubmissionItem,
} from "@/lib/recipe-submission";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const ENDPOINT = `${process.env.NODE_ENV === "development" ? "" : "https://cultist-circle-feedback.cultistcircle.workers.dev"}/api/recipe-submissions`;

function ItemList({
  label,
  items,
  selected,
  onChange,
  sacrifice,
  disabled,
}: {
  label: string;
  items: SimplifiedItem[];
  selected: RecipeSubmissionItem[];
  onChange: (items: RecipeSubmissionItem[]) => void;
  sacrifice?: boolean;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const total = selected.reduce((sum, item) => sum + item.quantity, 0);
  const full = selected.length >= 5 || (sacrifice && total >= 5);
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter(
        (item) =>
          !selected.some((entry) => entry.id === item.id) &&
          `${item.name} ${item.shortName} ${item.englishName ?? ""}`
            .toLowerCase()
            .includes(query),
      )
      .slice(0, 40);
  }, [items, selected, search]);

  return (
    <section
      className="min-w-0 space-y-3 rounded-xl border border-gray-700/70 bg-gray-800/40 p-4"
      aria-label={label}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-gray-100">{label}</h3>
        <span className="text-xs text-gray-400">
          {sacrifice
            ? `${total} / 5 items`
            : `${selected.length} / 5 item types`}
        </span>
      </div>
      {selected.map((item) => (
        <div key={item.id} className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 break-words text-sm text-gray-200">
            {items.find((entry) => entry.id === item.id)?.name ?? item.name}
          </span>
          <Input
            aria-label={`Quantity of ${item.name}`}
            type="number"
            min={1}
            max={sacrifice ? 5 - total + item.quantity : 999}
            value={item.quantity}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                selected.map((entry) =>
                  entry.id === item.id
                    ? { ...entry, quantity: Number(event.target.value) }
                    : entry,
                ),
              )
            }
            className="h-9 w-16 shrink-0 bg-gray-900"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={`Remove ${item.name}`}
            className="h-9 w-9 shrink-0 text-gray-400"
            onClick={() =>
              onChange(selected.filter((entry) => entry.id !== item.id))
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {!full && (
        <Popover
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            setSearch("");
          }}
          modal
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || items.length === 0}
              className="w-full border-dashed border-gray-600 bg-transparent"
            >
              <Plus className="mr-2 h-4 w-4" />
              {sacrifice ? "Add sacrificed item" : "Add reward item"}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-3rem)] p-0"
          >
            <Command shouldFilter={false}>
              <CommandInput
                aria-label={`Search ${label.toLowerCase()}`}
                placeholder="Search items…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-56">
                <CommandEmpty>No items found. Try another name.</CommandEmpty>
                {matches.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onChange([
                        ...selected,
                        {
                          id: item.id,
                          name: item.englishName || item.name,
                          quantity: 1,
                        },
                      ]);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="min-h-10 cursor-pointer break-words"
                  >
                    {item.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </section>
  );
}

function SubmissionDialog({
  initialMode,
  open,
  onOpenChange,
}: {
  initialMode: GameMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [gameMode, setGameMode] = useState(initialMode);
  const {
    data: items,
    isLoading,
    hasError,
    mutate,
    resetRetryCount,
  } = useItemsData(gameMode);
  const [sacrifices, setSacrifices] = useState<RecipeSubmissionItem[]>([]);
  const [rewards, setRewards] = useState<RecipeSubmissionItem[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [otherTimer, setOtherTimer] = useState(false);
  const [customTime, setCustomTime] = useState({
    hours: "0",
    minutes: "0",
    seconds: "0",
  });
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ body: string; id: string } | null>(null);
  const submitting = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const chosenSeconds = otherTimer
      ? Number(customTime.hours) * 3600 +
        Number(customTime.minutes) * 60 +
        Number(customTime.seconds)
      : timerSeconds;
    const body = JSON.stringify({
      gameMode,
      sacrifices,
      rewards,
      timerSeconds: chosenSeconds,
    });
    if (attempt.current?.body !== body)
      attempt.current = { body, id: crypto.randomUUID() };
    const parsed = recipeSubmissionSchema.safeParse({
      gameMode,
      sacrifices,
      rewards,
      timerSeconds: chosenSeconds,
      submissionId: attempt.current.id,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues.find((issue) => issue.path[0] === "timerSeconds")
          ?.message ??
          "Add 1–5 sacrificed items, at least one reward and valid quantities.",
      );
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429)
        throw new Error(
          "Too many submissions. Please wait a minute and try again.",
        );
      const result = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("success" in result) ||
        result.success !== true ||
        !("id" in result) ||
        result.id !== parsed.data.submissionId ||
        !("status" in result) ||
        result.status !== "pending"
      ) {
        throw new Error("Could not submit your recipe. Please try again.");
      }
      setSuccess(true);
      setSacrifices([]);
      setRewards([]);
      setTimerSeconds(null);
      setOtherTimer(false);
      setCustomTime({ hours: "0", minutes: "0", seconds: "0" });
      attempt.current = null;
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message.startsWith("Too many")
          ? cause.message
          : "Could not submit your recipe. Your selections are saved here — please try again.",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!submitting.current) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-2xl border-gray-700 bg-gray-900 p-4 text-gray-100 sm:p-6">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-xl">Submit a special recipe</DialogTitle>
          <DialogDescription className="text-gray-400">
            Found a special timer? Share exactly what you sacrificed and
            received. Submissions are reviewed before being added.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="space-y-4 py-5 text-center" role="status">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h3 className="text-lg font-semibold">Recipe submitted</h3>
            <p className="text-sm text-gray-400">
              Thanks for sharing your find! It’s now waiting for review.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setSuccess(false)}>
                Submit another
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  setSuccess(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="min-w-0 space-y-4">
            <fieldset disabled={pending} className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Game mode</legend>
              <div className="flex flex-wrap gap-2">
                {GAME_MODES.map((mode) => (
                  <label
                    key={mode}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${gameMode === mode ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-gray-700 text-gray-400"}`}
                  >
                    <input
                      type="radio"
                      name="submission-mode"
                      value={mode}
                      checked={mode === gameMode}
                      onChange={() => setGameMode(mode)}
                      className="accent-amber-400"
                    />
                    {GAME_MODE_LABELS[mode]}
                  </label>
                ))}
              </div>
            </fieldset>
            {isLoading && (
              <p role="status" className="text-sm text-gray-400">
                Loading item list…
              </p>
            )}
            {hasError && (
              <div role="alert" className="text-sm text-amber-200">
                Could not refresh the item list.{" "}
                <Button
                  type="button"
                  variant="link"
                  disabled={pending}
                  onClick={() => {
                    resetRetryCount();
                    void mutate();
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
            <ItemList
              label="Items sacrificed"
              items={items}
              selected={sacrifices}
              onChange={setSacrifices}
              sacrifice
              disabled={pending}
            />
            <ItemList
              label="Rewards received"
              items={items}
              selected={rewards}
              onChange={setRewards}
              disabled={pending}
            />
            <fieldset disabled={pending}>
              <legend className="mb-2 text-sm font-medium">
                Which timer did you get?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {SPECIAL_RECIPE_TIMERS.map((timer) => (
                  <label
                    key={timer.seconds}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm ${!otherTimer && timerSeconds === timer.seconds ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-gray-700 text-gray-400"}`}
                  >
                    <input
                      type="radio"
                      name="submission-timer"
                      checked={!otherTimer && timerSeconds === timer.seconds}
                      onChange={() => {
                        setOtherTimer(false);
                        setTimerSeconds(timer.seconds);
                      }}
                      className="accent-amber-400"
                    />
                    {timer.label}
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm ${otherTimer ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-gray-700 text-gray-400"}`}
                >
                  <input
                    type="radio"
                    name="submission-timer"
                    checked={otherTimer}
                    onChange={() => setOtherTimer(true)}
                    className="accent-amber-400"
                  />
                  Other special timer
                </label>
              </div>
              {otherTimer && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["hours", "minutes", "seconds"] as const).map((unit) => (
                    <label
                      key={unit}
                      className="space-y-1 text-xs capitalize text-gray-400"
                    >
                      <span>{unit}</span>
                      <Input
                        type="number"
                        min={0}
                        max={unit === "hours" ? 99 : 59}
                        required
                        value={customTime[unit]}
                        onChange={(event) =>
                          setCustomTime({
                            ...customTime,
                            [unit]: event.target.value,
                          })
                        }
                        className="bg-gray-800"
                      />
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Use the original timer, before it counted down. Regular
                sacrifice timers aren’t recipes.
              </p>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={
                pending ||
                sacrifices.length === 0 ||
                rewards.length === 0 ||
                (!otherTimer && timerSeconds === null)
              }
              className="w-full bg-amber-400 text-gray-950 hover:bg-amber-300"
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {pending ? "Submitting…" : "Submit recipe for review"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RecipeSubmissionButton({ mode }: { mode: GameMode }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setStarted(true);
          setOpen(true);
        }}
        className="border-amber-400/30 bg-amber-400/5 text-amber-200 hover:bg-amber-400/10 hover:text-amber-100"
      >
        <Plus className="mr-2 h-4 w-4" />
        Submit a recipe
      </Button>
      {started && (
        <SubmissionDialog
          initialMode={mode}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
