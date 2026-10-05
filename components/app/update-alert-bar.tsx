"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  NOTIFICATIONS,
  NotificationDetails,
  UPDATE_IDS,
  formatPostedDate,
} from "@/components/notification-panel";
import { useLanguage } from "@/contexts/language-context";
import { useSeenUpdates } from "@/hooks/use-seen-updates";

/**
 * How long the bar must stay on screen before its updates count as seen on
 * the next visit. Loads cut short (e.g. the version-change reload) mark
 * nothing.
 */
export const MARK_SEEN_DELAY_MS = 3000;

/**
 * One-line strip for updates this browser has not seen yet. It disappears
 * once they are dismissed or on the next visit; the nav bell keeps the full
 * list.
 */
export function UpdateAlertBar({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const { ready, unseenIds, markSeen, dismiss } = useSeenUpdates(UPDATE_IDS);
  const unseen = NOTIFICATIONS.filter((notification) =>
    unseenIds.has(notification.id),
  );
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const hasUnseen = ready && unseen.length > 0;

  useEffect(() => {
    if (!hasUnseen) return;
    const timer = window.setTimeout(markSeen, MARK_SEEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasUnseen, markSeen]);

  if (!hasUnseen) return null;

  const current = unseen[Math.min(index, unseen.length - 1)];
  const page = (step: number) =>
    setIndex((prev) => (prev + step + unseen.length) % unseen.length);

  return (
    <section
      aria-label={t("New updates")}
      className={`overflow-hidden rounded-lg border border-amber-400/25 bg-amber-950/25 text-left backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
        <AlertTriangle
          aria-hidden
          className="h-4 w-4 shrink-0 text-amber-300"
        />
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 flex-col items-start rounded py-1 text-left sm:flex-row sm:items-baseline sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
        >
          <span className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-5 text-amber-50 sm:truncate">
            {current.title}
          </span>
          {current.date && (
            <time
              dateTime={current.date}
              className="shrink-0 text-[11px] text-amber-200/60"
            >
              {formatPostedDate(current.date, true)}
            </time>
          )}
        </button>

        {unseen.length > 1 && (
          <div className="flex shrink-0 items-center text-amber-200/70">
            <span className="px-1 text-[11px] tabular-nums">
              {index + 1}/{unseen.length}
            </span>
            <button
              type="button"
              onClick={() => page(-1)}
              aria-label={t("Previous update")}
              className="rounded p-1 transition-colors hover:bg-amber-300/10 hover:text-amber-100"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => page(1)}
              aria-label={t("Next update")}
              className="rounded p-1 transition-colors hover:bg-amber-300/10 hover:text-amber-100"
            >
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label={t("Dismiss updates")}
          className="shrink-0 rounded p-1 text-amber-200/70 transition-colors hover:bg-amber-300/10 hover:text-amber-100"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div
        id={detailsId}
        hidden={!expanded}
        className="border-t border-amber-400/15 px-3 py-2.5 pl-9"
      >
        <NotificationDetails notification={current} showDate={false} />
      </div>
    </section>
  );
}
