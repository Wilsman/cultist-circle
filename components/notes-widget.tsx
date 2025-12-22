"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "taskTracker_notes";
const POS_KEY = "taskTracker_notes_pos";

export function NotesWidget(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<number | null>(null);
  const statusResetTimer = useRef<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    // default 16px from edges
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed === "object" &&
          parsed &&
          typeof parsed.x === "number" &&
          typeof parsed.y === "number"
        )
          return { x: parsed.x, y: parsed.y };
      }
    } catch {}
    // Now defaults to right side
    return { x: 16, y: 16 };
  });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const fromIconRef = useRef(false);
  const clickCancelledRef = useRef(false);

  // Load initial value from localStorage once on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached !== null) setValue(cached);
      } catch {
        // no-op
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Animate panel on open
  useEffect(() => {
    if (isOpen) {
      // next tick to allow transition
      const id = window.requestAnimationFrame(() => setPanelVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setPanelVisible(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setStatus("saving");
      }
    });
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // ignore quota errors
      }
      setStatus("saved");
      if (statusResetTimer.current)
        window.clearTimeout(statusResetTimer.current);
      statusResetTimer.current = window.setTimeout(
        () => setStatus("idle"),
        800
      );
    }, 400);

    return () => {
      cancelled = true;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [value]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (statusResetTimer.current)
        window.clearTimeout(statusResetTimer.current);
    },
    []
  );

  const charCount = useMemo(() => value.length, [value]);

  // Drag handlers
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startY = e.clientY;
      dragStartRef.current = { startX, startY, origX: pos.x, origY: pos.y };
      e.preventDefault();
    },
    [pos.x, pos.y]
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const next = {
        x: Math.max(8, dragStartRef.current.origX - dx),
        y: Math.max(8, dragStartRef.current.origY - dy),
      };
      // Constrain to viewport with some margin
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      next.x = Math.min(vw - 80, next.x);
      next.y = Math.min(vh - 80, next.y);
      setPos(next);
      // if dragging originated from icon and moved enough, cancel click toggle
      if (fromIconRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        clickCancelledRef.current = true;
      }
    }
    function onUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(pos));
        } catch {}
      }
      fromIconRef.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pos]);

  const onClear = useCallback(() => {
    setValue("");
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="pointer-events-none fixed right-0 bottom-0 z-50"
        style={{ right: pos.x, bottom: pos.y }}
      >
        {/* Floating trigger */}
        <div className="pointer-events-auto flex justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Toggle notes"
                className={cn(
                  "flex items-center gap-2 rounded-full border border-slate-800/50",
                  "bg-slate-900/80 text-slate-100 backdrop-blur px-4 py-2 shadow-lg",
                  "hover:bg-slate-900/90 transition focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                )}
                onMouseDown={(e) => {
                  fromIconRef.current = true;
                  clickCancelledRef.current = false;
                  onDragStart(e);
                }}
                onClick={() => {
                  // if we dragged, do not toggle
                  if (clickCancelledRef.current) {
                    clickCancelledRef.current = false;
                    return;
                  }
                  setIsOpen((v) => !v);
                }}
              >
                <StickyNote aria-hidden className="size-4" />
                <span className="text-sm font-medium hidden sm:inline">
                  Notes
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Sticky Notes</TooltipContent>
          </Tooltip>
        </div>

        {/* Panel */}
        {isOpen && (
          <div
            className={cn(
              "pointer-events-auto mt-3 w-[90vw] max-w-sm rounded-2xl",
              "border border-slate-800/50 bg-slate-900/80 text-slate-100 backdrop-blur",
              "p-3 shadow-xl transition-all duration-200 md:max-w-md",
              panelVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">Notes</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  {status === "saving" && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  )}
                  <span
                    className={status === "saved" ? "animate-pulse" : undefined}
                  >
                    {status === "saving"
                      ? "Saving…"
                      : status === "saved"
                      ? "Saved"
                      : ""}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="mx-1 text-xs tabular-nums text-slate-400">
                  {charCount}
                </span>
                <Button
                  aria-label="Clear notes"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={onClear}
                >
                  Clear
                </Button>
                <Button
                  aria-label="Close notes"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type your notes…"
              className="min-h-[140px] resize-y rounded-2xl bg-slate-900/70 text-slate-100 placeholder-slate-400 border-slate-800/50 focus-visible:ring-slate-400/60"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
