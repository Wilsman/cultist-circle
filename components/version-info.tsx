"use client";

import { LAST_UPDATED } from "@/config/changelog";

interface VersionInfoProps {
  version: string;
}

// Format date from YYYY-MM-DD to a readable format
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

// Minimal inline badge with version and last updated date
export function VersionInfo({ version }: VersionInfoProps) {
  return (
    <div className="inline-flex items-center gap-3 justify-center">
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-200 shadow-sm">
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        v{version}
      </span>
      <span className="text-xs text-slate-400">
        Last updated: {formatDate(LAST_UPDATED)}
      </span>
    </div>
  );
}
