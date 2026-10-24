"use client";

import Link from "next/link";
import { APP_RELEASE_DATE, APP_VERSION } from "@/lib/app-version";
import { useLanguage } from "@/contexts/language-context";

function formatDate(dateString: string): string {
  try {
    // Parse YYYY-MM-DD as a local date; `new Date(string)` is UTC midnight
    // and shows the previous day in negative-offset timezones.
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function UpdatesContent() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-white to-slate-100">
          {t("Version Info")}
        </h1>
        <Link
          href="/"
          className="text-sm text-slate-300 hover:text-slate-100 underline underline-offset-4 decoration-dotted"
        >
          {t("← Back")}
        </Link>
      </header>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-sm p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-lg text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {t("Current Version: v{version}", { version: APP_VERSION })}
          </div>
        </div>

        <p className="text-slate-400 mb-6" suppressHydrationWarning>
          {t("Last updated: {date}", { date: formatDate(APP_RELEASE_DATE) })}
        </p>

        <div className="text-sm text-slate-500">
          <p>
            {t(
              "This application is actively maintained and updated regularly.",
            )}
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-pink-300/90">
          {t("Thanks for all the feedback and support! ❤️")}
        </p>
      </div>
    </div>
  );
}
