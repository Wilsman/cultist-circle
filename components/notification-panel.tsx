/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ChevronDown, Bell, AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  description: string | React.ReactNode;
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
    id: "new-sas-thor-combo",
    type: "hot-sacrifice",
    title: "🔥 New: SAS → THOR Armor",
    description: (
      <>
        <div className="flex items-center gap-4 mt-2">
          {/* Input */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative cursor-help">
                    <div className="absolute inset-0 bg-white/10 blur-md rounded-lg" />
                    <img
                      src="https://assets.tarkov.dev/590c37d286f77443be3d7827-icon.webp"
                      alt="SAS drive"
                      className="w-10 h-10 rounded-lg relative z-10 shadow-xl"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-slate-950 border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[260px] z-[100]"
                >
                  <p className="font-bold text-sm mb-1 text-slate-100 leading-snug">
                    SAS drive
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Barter
              </span>
              <span className="text-sm font-bold text-slate-100">
                SAS drive
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center text-indigo-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
              1×
            </span>
          </div>

          {/* Output */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative cursor-help">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-lg" />
                    <img
                      src="https://assets.tarkov.dev/60a283193cb70855c43a381d-icon.webp"
                      alt="THOR IC"
                      className="w-10 h-10 rounded-lg relative z-10 shadow-xl ring-2 ring-indigo-500/50"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-slate-950 border border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[260px] z-[100]"
                >
                  <p className="font-bold text-sm mb-1 text-slate-100 leading-snug">
                    NFM THOR Integrated Carrier body armor
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-white/5">
                    <span className="opacity-60">Buy from:</span>
                    <div className="flex items-center gap-1.5">
                      <img
                        src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                        alt="Peacekeeper"
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-indigo-300 font-semibold">
                        Peacekeeper{" "}
                        <span className="text-indigo-300/60 font-medium">
                          (LL4)
                        </span>
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">
                THOR IC Armor
              </span>
              <span className="text-[10px] text-slate-400">
                Peacekeeper LL4
              </span>
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="mt-3 flex items-center gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">
              400K+ Value
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              6H
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              14H
            </span>
          </div>
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

  return (
    <div
      className={`
        relative rounded-xl px-4 py-3 backdrop-blur-sm
        border transition-all duration-200
        ${
          notification.type === "success"
            ? "bg-emerald-950/30 border-emerald-500/20"
            : notification.type === "warning"
              ? "bg-red-950/30 border-red-500/20"
              : notification.type === "halloween"
                ? "bg-orange-950/30 border-orange-500/20"
                : notification.type === "hot-sacrifice"
                  ? "bg-indigo-950/60 border-indigo-500/20"
                  : notification.type === "weapon-warning"
                    ? "bg-amber-950/30 border-amber-500/20"
                    : "bg-slate-800/40 border-slate-700/30"
        }
        ${
          isPriority
            ? "ring-1 ring-amber-400/30 shadow-[0_0_24px_rgba(251,191,36,0.12)]"
            : ""
        }
        ${isInteractive ? "cursor-pointer hover:border-white/20" : ""}
      `}
      onClick={onClick}
    >
      {isPriority && (
        <div className="pointer-events-none absolute inset-0 rounded-xl border border-amber-400/30" />
      )}
      <div className="flex items-start gap-3">
        {notification.icon && (
          <span className="text-lg mt-0.5 flex-shrink-0">
            {notification.icon}
          </span>
        )}
        {notification.type === "warning" && !notification.icon && (
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={`text-sm font-semibold ${
                notification.type === "success"
                  ? "text-emerald-200"
                  : notification.type === "warning"
                    ? "text-red-200"
                    : notification.type === "halloween"
                      ? "text-orange-200"
                      : notification.type === "hot-sacrifice"
                        ? "text-indigo-200"
                        : notification.type === "weapon-warning"
                          ? "text-amber-200"
                          : "text-slate-200"
              }`}
            >
              {notification.title}
            </h3>
            {isPriority && (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/40">
                NEW
              </span>
            )}
          </div>
          <div
            className={`text-xs leading-relaxed ${
              notification.type === "success"
                ? "text-emerald-300/90"
                : notification.type === "warning"
                  ? "text-red-300/90"
                  : notification.type === "halloween"
                    ? "text-orange-300/90"
                    : notification.type === "hot-sacrifice"
                      ? "text-indigo-300/90"
                      : notification.type === "weapon-warning"
                        ? "text-amber-300/90"
                        : "text-slate-300/90"
            }`}
          >
            {notification.description}
          </div>

          {notification.estimatedCost !== undefined && (
            <div className="flex items-baseline gap-1.5 mt-2 opacity-80">
              <span className="text-[9px] uppercase tracking-tighter text-slate-500 font-bold whitespace-nowrap">
                Est. Cost:
              </span>
              <span className="text-[11px] font-black text-cyan-400/90 tabular-nums whitespace-nowrap">
                ₽{notification.estimatedCost.toLocaleString()}
              </span>
            </div>
          )}

          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3 pt-2 border-t border-current/10">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={(event) => {
                    event.stopPropagation();
                    action.action();
                  }}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    notification.type === "hot-sacrifice"
                      ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
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
