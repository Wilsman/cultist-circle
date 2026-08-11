"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getActiveRituals } from "@/lib/ritual-tracker-db";
import { showRitualNotification } from "@/lib/ritual-reminders";

export function RitualReminderWatcher() {
  const active = useLiveQuery(() => getActiveRituals(), [], []);

  useEffect(() => {
    if (!active.length) return;

    const check = () => {
      const now = Date.now();
      active
        .filter((ritual) => ritual.endsAt <= now && !ritual.notificationSentAt)
        .forEach((ritual) => void showRitualNotification(ritual));
    };

    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, [active]);

  return null;
}
