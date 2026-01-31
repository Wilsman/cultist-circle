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
    id: "new-sas-thor-combo",
    type: "hot-sacrifice",
    title: "🔥 Sacrifice: THOR Armor",
    description: (notification: Notification) => (
      <div className="mt-4 space-y-4">
        {/* Main Content - THOR IC Armor Section */}
        <div className="flex gap-4 items-start">
          {/* Left: Item Info */}
          <div className="flex-1">
            {/* Item Header */}
            <div className="flex gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative cursor-help flex-shrink-0 group">
                      <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/30 to-purple-500/20 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
                      <img
                        src="https://assets.tarkov.dev/60a283193cb70855c43a381d-icon.webp"
                        alt="THOR IC Armor"
                        className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl relative z-10 shadow-xl ring-1 ring-white/10"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-slate-950 border border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[280px] z-[100]"
                  >
                    <p className="font-bold text-sm text-slate-100">
                      NFM THOR Integrated Carrier body armor
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Heavy armor with integrated plate carrier system
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg font-bold text-white">
                    THOR IC Armor
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                    New
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Sacrifice this armor in the Cultist Circle ritual
                </p>
              </div>
            </div>
          </div>

          {/* Right: Stats - Combined Triggers & Cost */}
          <div className="flex flex-col gap-3 flex-shrink-0 min-w-0">
            {/* Combined Stats Row */}
            <div className="bg-slate-800/40 rounded-lg px-4 py-2.5 border border-white/5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Triggers
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-300">
                      6H
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-300">
                      14H
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Est. Cost
                  </span>
                </div>
                <span className="text-sm font-bold text-cyan-400 tabular-nums">
                  ₽
                  {notification.estimatedCost?.toLocaleString() || "Loading..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* How to Obtain Section - Single Line */}
        <div className="bg-slate-800/30 rounded-xl px-6 py-3 border border-white/5">
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Header */}
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest whitespace-nowrap">
              How to Obtain
            </span>

            {/* Trade Flow */}
            <div className="flex items-center gap-4 flex-1 justify-center">
              {/* Input Item */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative cursor-help flex-shrink-0 group">
                        <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img
                          src="https://assets.tarkov.dev/590c37d286f77443be3d7827-icon.webp"
                          alt="SAS drive"
                          className="w-8 h-8 rounded-lg relative z-10 shadow-md bg-slate-900/50"
                        />
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-slate-900 flex items-center justify-center z-20">
                          <span className="text-[9px] font-bold text-white">
                            1
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-slate-950 border border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[320px] z-[100]"
                    >
                      <p className="font-bold text-sm text-slate-100">
                        SAS drive
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Solid-state drive used for data storage
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                    SAS drive
                  </span>
                  <div className="flex items-center gap-1 bg-slate-800/40 rounded-md px-1.5 py-0.5 border border-white/5">
                    <div className="w-1 h-1 rounded-full bg-cyan-400/60" />
                    <span className="text-[10px] font-bold text-cyan-400 tabular-nums">
                      ₽
                      {notification.estimatedCost?.toLocaleString() ||
                        "Loading..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="text-indigo-400/70">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>

              {/* Output Item */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative cursor-help flex-shrink-0 group">
                        <div className="absolute -inset-0.5 bg-emerald-500/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img
                          src="https://assets.tarkov.dev/60a283193cb70855c43a381d-icon.webp"
                          alt="THOR"
                          className="w-8 h-8 rounded-lg relative z-10 shadow-md ring-1 ring-emerald-500/30"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-slate-950 border border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[320px] z-[100]"
                    >
                      <p className="font-bold text-sm text-slate-100">
                        NFM THOR Integrated Carrier body armor
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Heavy armor with integrated plate carrier system
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-[10px] font-medium text-emerald-300 whitespace-nowrap">
                  THOR
                </span>
              </div>
            </div>

            {/* Trader Badge */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative cursor-help flex-shrink-0 group">
                      <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img
                        src="https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
                        alt="Peacekeeper"
                        className="w-5 h-5 rounded-full relative z-10 ring-1 ring-indigo-500/30"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-slate-950 border border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[320px] z-[100]"
                  >
                    <p className="font-bold text-sm text-slate-100">
                      Peacekeeper
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      UN peacekeeper trader - offers military gear and weapons
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div>
                <span className="text-[10px] font-semibold text-indigo-300">
                  Peacekeeper
                </span>
                <span className="text-[9px] text-slate-500 ml-1">LL4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
            {typeof notification.description === "function"
              ? notification.description(notification)
              : notification.description}
          </div>

          {notification.estimatedCost !== undefined && (
            <div className="flex items-center justify-between gap-4 bg-slate-800/40 rounded-lg px-4 py-2.5 border border-white/5 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Est. Cost
                </span>
              </div>
              <span className="text-sm font-bold text-cyan-400 tabular-nums">
                ₽{notification.estimatedCost?.toLocaleString() || "Loading..."}
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
