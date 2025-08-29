"use client";

import Link from "next/link";

interface VersionInfoProps {
  version: string;
}

// Minimal inline badge + link to the full updates page
export function VersionInfo({ version }: VersionInfoProps) {
  return (
    <div className="inline-flex items-center gap-3 justify-center">
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-200 shadow-sm">
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        v{version}
      </span>
      <Link
        href="/updates"
        className="text-xs text-sky-300 hover:text-sky-200 underline underline-offset-4 decoration-dotted"
      >
        Changelog
      </Link>
    </div>
  );
}
