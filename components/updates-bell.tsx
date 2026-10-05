/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  NOTIFICATIONS,
  NotificationDetails,
  UPDATE_IDS,
} from "@/components/notification-panel";
import { useLanguage } from "@/contexts/language-context";
import { useSeenUpdates } from "@/hooks/use-seen-updates";

/** Nav bell listing every current update; the count shows unseen ones. */
export function UpdatesBell() {
  const { t } = useLanguage();
  const { ready, unseenIds, dismiss } = useSeenUpdates(UPDATE_IDS);
  // Opening the bell marks everything seen, so remember what was new.
  const [newWhenOpened, setNewWhenOpened] = useState<Set<string>>(
    () => new Set(),
  );
  const unseenCount = ready ? unseenIds.size : 0;

  const handleOpenChange = (open: boolean) => {
    if (!open) return;
    setNewWhenOpened(new Set(unseenIds));
    if (unseenCount > 0) dismiss();
  };

  const label =
    unseenCount > 0
      ? t("Updates ({count} new)", { count: unseenCount })
      : t("Updates");

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={label}
        title={label}
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.035] hover:text-slate-100 data-[state=open]:bg-white/[0.05] data-[state=open]:text-slate-100"
      >
        <Bell className="h-4 w-4" strokeWidth={1.8} />
        {unseenCount > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-slate-950"
          >
            {unseenCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto border-white/10 bg-[#0d1620]/95 p-0 text-slate-200 backdrop-blur-xl"
      >
        <h2 className="border-b border-white/[0.06] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("Updates")}
        </h2>
        {NOTIFICATIONS.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">
            {t("No updates right now.")}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {NOTIFICATIONS.map((notification) => (
              <li key={notification.id} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700/80 bg-slate-950/45 text-amber-300">
                  {notification.imageUrl ? (
                    <img
                      src={notification.imageUrl}
                      alt=""
                      width={28}
                      height={28}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <AlertTriangle aria-hidden className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-0.5 flex items-start gap-2 text-[13px] font-semibold leading-5 text-slate-100">
                    <span className="min-w-0 flex-1">{notification.title}</span>
                    {newWhenOpened.has(notification.id) && (
                      <span className="mt-0.5 shrink-0 rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wide text-amber-200">
                        {t("New")}
                      </span>
                    )}
                  </h3>
                  <NotificationDetails notification={notification} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
