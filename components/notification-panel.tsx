"use client";

import { useState } from "react";
import { ChevronDown, Bell, AlertTriangle } from "lucide-react";
import Link from "next/link";

export interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "halloween";
  icon?: string;
  title: string;
  description: string | React.ReactNode;
}

export const NOTIFICATIONS: Notification[] = [
  {
    id: "recipe-research",
    type: "info",
    icon: "🍳",
    title: "Cooking Updates",
    description: (
      <>
        New recipes are being researched. Once confirmed they will be listed on
        the{" "}
        <Link
          href="/recipes"
          className="underline hover:text-blue-300 transition-colors font-semibold"
        >
          Recipes page
        </Link>
        . Latest: 1x Augmentin
      </>
    ),
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
}: {
  notification: Notification;
}) {
  return (
    <div
      className={`
        rounded-xl px-4 py-3 backdrop-blur-sm
        border transition-all duration-200
        ${
          notification.type === "success"
            ? "bg-emerald-950/30 border-emerald-500/20"
            : notification.type === "warning"
            ? "bg-red-950/30 border-red-500/20"
            : notification.type === "halloween"
            ? "bg-orange-950/30 border-orange-500/20"
            : "bg-slate-800/40 border-slate-700/30"
        }
      `}
    >
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
          <h3
            className={`text-sm font-semibold mb-1 ${
              notification.type === "success"
                ? "text-emerald-200"
                : notification.type === "warning"
                ? "text-red-200"
                : notification.type === "halloween"
                ? "text-orange-200"
                : "text-slate-200"
            }`}
          >
            {notification.title}
          </h3>
          <div
            className={`text-xs leading-relaxed ${
              notification.type === "success"
                ? "text-emerald-300/90"
                : notification.type === "warning"
                ? "text-red-300/90"
                : notification.type === "halloween"
                ? "text-orange-300/90"
                : "text-slate-300/90"
            }`}
          >
            {notification.description}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto mb-3">
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
              ? "bg-slate-800/60 border-slate-600/40 rounded-2xl"
              : "bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/40"
          }
        `}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell className="h-4 w-4 text-slate-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 text-[8px] items-center justify-center text-white font-bold">
                  {NOTIFICATIONS.length}
                </span>
              </span>
            </div>
            <span className="text-sm font-medium text-slate-200">
              {isExpanded ? "Notifications" : `${NOTIFICATIONS.length} Updates`}
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
          {NOTIFICATIONS.map((notification) => (
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
