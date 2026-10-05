"use client";

import React from "react";
import Link from "next/link";

export interface Notification {
  id: string;
  type:
    | "success"
    | "warning"
    | "info"
    | "halloween"
    | "hot-sacrifice"
    | "weapon-warning";
  icon?: string;
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  description:
    | string
    | React.ReactNode
    | ((notification: Notification) => React.ReactNode);
  actions?: NotificationAction[];
  priority?: number;
  estimatedCost?: number;
  /** Posted date (YYYY-MM-DD), shown with the details. */
  date?: string;
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export const NOTIFICATIONS: Notification[] = [
  {
    id: "sas-thor-hot-sacrifice-disabled",
    type: "warning",
    imageUrl: "https://assets.tarkov.dev/60a283193cb70855c43a381d-icon.webp",
    imageAlt: "NFM THOR Integrated Carrier body armor",
    title: "SAS drive ➡️ THOR IC no longer works",
    priority: 0,
    date: "2026-09-29",
    description: (
      <>
        After the THOR IC base value change, the SAS drive ➡️ THOR IC hot
        sacrifice no longer works in <strong>PVP or PVE</strong>. It has been
        disabled in Hot Sacrifices.
      </>
    ),
  },
  {
    id: "black-division-dogtag-recipe",
    type: "warning",
    imageUrl: "/images/recipes/bd-dogtag-ferrum.png",
    imageAlt: "Black Division dogtag",
    title: "Black Division ritual may no longer work",
    priority: 0,
    date: "2026-09-09",
    description: (
      <>
        Many users report these launcher codes and this recipe might not work
        anymore. If you try it, please report{" "}
        <strong>Worked or Didn&apos;t work</strong> on the{" "}
        <Link
          href="/recipes"
          className="font-semibold underline transition-colors hover:text-amber-200"
        >
          recipes page
        </Link>{" "}
        - thank you.{" "}
        <Link
          href="/recipes"
          className="font-semibold underline transition-colors hover:text-amber-200"
        >
          View the special recipe →
        </Link>
      </>
    ),
  },
];

export const UPDATE_IDS = NOTIFICATIONS.map((notification) => notification.id);

/** Formats a YYYY-MM-DD posted date, e.g. "29 Sep 2026" ("29 Sep" if short). */
export function formatPostedDate(date: string, short = false): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        ...(short ? {} : { year: "numeric" }),
      });
}

/** A notification's description and action buttons. */
export function NotificationDetails({
  notification,
  showDate = true,
}: {
  notification: Notification;
  showDate?: boolean;
}) {
  return (
    <>
      {showDate && notification.date && (
        <time
          dateTime={notification.date}
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
        >
          {formatPostedDate(notification.date)}
        </time>
      )}
      <div className="text-xs leading-relaxed text-slate-300 marker:text-slate-400 [&_a]:text-slate-100 [&_a]:underline [&_a]:decoration-slate-500 [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-slate-100">
        {typeof notification.description === "function"
          ? notification.description(notification)
          : notification.description}
      </div>

      {notification.actions && notification.actions.length > 0 && (
        <div className="flex gap-2 mt-3 pt-2 border-t border-slate-700/60">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                action.action();
              }}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                notification.type === "hot-sacrifice"
                  ? "bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                  : notification.type === "weapon-warning"
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "bg-slate-500/20 text-slate-300 hover:bg-slate-500/30"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
