"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  Bell,
  AlertTriangle,
  Info,
  RefreshCw,
} from "lucide-react";
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
  title: string;
  description:
    | string
    | React.ReactNode
    | ((notification: Notification) => React.ReactNode);
  actions?: NotificationAction[];
  priority?: number;
  estimatedCost?: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export const NOTIFICATIONS: Notification[] = [
  {
    id: "new-figurine-recipes-round",
    type: "hot-sacrifice",
    title: "Ded Moroz Ornament Recipe Updated",
    description: (
      <>
        The three-ornament recipe has been updated and now rewards{" "}
        <strong>2x Ded Moroz figurine</strong>. Check the{" "}
        <Link
          href="/recipes"
          className="underline hover:text-indigo-200 transition-colors font-semibold"
        >
          Recipes page
        </Link>{" "}
        for the latest info.
        <div className="mt-2 rounded-md border border-slate-600/50 bg-slate-950/30 px-2.5 py-2">
          <span className="block text-[12px] leading-relaxed text-slate-300">
            Thanks to the person who submitted feedback and helped us update
            this for everyone.
          </span>
        </div>
      </>
    ),
    priority: 0,
  },
  {
    id: "thor-hot-sacrifice-pvp-warning",
    type: "warning",
    title: "THOR Hot Sacrifice No Longer Works in PVP",
    description: (
      <>
        <span className="block text-[13px] leading-6">
          The <strong>NFM THOR Integrated Carrier body armor</strong> no longer
          hits the target value in <strong>PVP</strong> because its{" "}
          <strong>PVP base value changed</strong>. <strong>PVE</strong> still
          works as expected.
        </span>
        <div className="mt-2 rounded-md border border-slate-600/50 bg-slate-950/30 px-2.5 py-2">
          <span className="block text-[12px] font-medium leading-relaxed text-slate-300">
            Big love to everyone testing this in <strong>Discord</strong> and
            people sending reports through the <strong>feedback form</strong>.
            You lot find stuff fast. 💖
          </span>
        </div>
      </>
    ),
    priority: 0,
  },
  {
    id: "six-hour-timer-warning",
    type: "warning",
    title: "6h Timer Rewards Are Not Guaranteed",
    description: (
      <>
        Recent reports show more low-value drops from the{" "}
        <strong>6h timer</strong>. At the moment, <strong>6h timers</strong> are
        not a 100% chance for quest/hideout items. It is unclear if this is a
        bug or intended behavior, so treat 6h rewards as inconsistent for
        quest/hideout progress.
      </>
    ),
    priority: 1,
  },
  {
    id: "weapon-values-warning",
    type: "warning",
    title: "Weapon Base Values - Work in Progress",
    description: (
      <>
        We are still working on finding the correct multiplier for Weapon base
        values, please use the{" "}
        <Link
          href="/base-values"
          className="underline hover:text-amber-300 transition-colors font-semibold"
        >
          Base Values lookup
        </Link>{" "}
        page. To display weapons in the calculator, go to Settings → Excluded
        Categories and uncheck &quot;Weapon&quot;.
        <span className="block text-xs mt-1 text-red-400">
          Caution: Weapon base values are higher than shown in the app.
        </span>
      </>
    ),
  },
];

export function NotificationCard({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick?: () => void;
}) {
  const isPriority = notification.priority === 0;
  const isInteractive = Boolean(onClick);
  const styles =
    notification.type === "success"
      ? {
          marker: "bg-emerald-300",
          icon: "text-emerald-300",
          title: "text-emerald-100",
          badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
        }
      : notification.type === "warning"
        ? {
            marker: "bg-red-300",
            icon: "text-red-300",
            title: "text-red-100",
            badge: "border-red-300/25 bg-red-300/10 text-red-200",
          }
        : notification.type === "hot-sacrifice"
          ? {
              marker: "bg-cyan-300",
              icon: "text-cyan-300",
              title: "text-cyan-100",
              badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
            }
          : notification.type === "weapon-warning"
            ? {
                marker: "bg-amber-300",
                icon: "text-amber-300",
                title: "text-amber-100",
                badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
              }
            : {
                marker: "bg-slate-400",
                icon: "text-slate-300",
                title: "text-slate-100",
                badge: "border-slate-500/50 bg-slate-800 text-slate-300",
              };
  const Icon =
    notification.type === "warning" || notification.type === "weapon-warning"
      ? AlertTriangle
      : notification.type === "hot-sacrifice" || notification.type === "success"
        ? RefreshCw
        : Info;

  return (
    <div
      className={`
        group relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/55
        px-3.5 py-3 backdrop-blur-sm transition-all duration-200
        ${isPriority ? "border-slate-600/80 bg-slate-900/75" : ""}
        ${isInteractive ? "cursor-pointer hover:border-slate-500/80 hover:bg-slate-900/80" : ""}
      `}
      onClick={onClick}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-1 ${styles.marker} opacity-70`}
      />
      <div className="flex items-start gap-3 pl-1">
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700/80 bg-slate-950/45 ${styles.icon}`}
        >
          {notification.icon ? (
            <span className="text-sm" aria-hidden="true">
              {notification.icon}
            </span>
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        {notification.icon && (
          <span className="sr-only mt-0.5 flex-shrink-0">
            {notification.icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className={`text-sm font-semibold leading-5 ${styles.title}`}>
              {notification.title}
            </h3>
            {isPriority && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
              >
                NEW
              </span>
            )}
          </div>
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
        </div>
      </div>
    </div>
  );
}

export function NotificationPanel({
  dynamicNotifications = [],
  totalNotifications,
}: {
  dynamicNotifications?: Notification[];
  totalNotifications?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine static and dynamic notifications
  const allNotifications = [...NOTIFICATIONS, ...dynamicNotifications];
  const notificationCount = totalNotifications ?? allNotifications.length;

  return (
    <div className="w-full max-w-3xl mx-auto mb-3 z-10">
      {/* Collapsed state - compact pill */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full group"
        aria-expanded={isExpanded}
        aria-label={
          isExpanded ? "Collapse notifications" : "Expand notifications"
        }
      >
        <div
          className={`
          flex items-center justify-between gap-3 px-4 py-2.5
          rounded-full border backdrop-blur-sm
          transition-all duration-300 ease-out
          ${
            isExpanded
              ? "bg-slate-800 border-slate-600/40 rounded-2xl"
              : "bg-slate-800 border-slate-700/30 hover:bg-slate-700 hover:border-slate-600/40"
          }
        `}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell className="h-4 w-4 text-slate-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 text-[8px] items-center justify-center text-white font-bold">
                  {notificationCount}
                </span>
              </span>
            </div>
            <span className="text-sm font-medium text-slate-200">
              {isExpanded ? "Notifications" : `${notificationCount} Updates`}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded state - notification cards */}
      <div
        className={`
        overflow-hidden transition-all duration-300 ease-out
        ${isExpanded ? "max-h-[600px] opacity-100 mt-2" : "max-h-0 opacity-0"}
      `}
      >
        <div className="space-y-2">
          {allNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
