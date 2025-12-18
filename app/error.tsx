"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
     
    console.error("App Router error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur text-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-400 mb-4">
          An unexpected error occurred. Try reloading this section. If the
          problem persists, please refresh the page.
        </p>
        {error?.message ? (
          <pre className="text-xs whitespace-pre-wrap break-words text-slate-400/80 mb-4 bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
            {error.message}
          </pre>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full px-4 py-2 bg-slate-200 text-slate-900 hover:bg-white transition"
          >
            Reload section
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full px-4 py-2 border border-slate-600/60 text-slate-200 hover:bg-slate-800/60 transition"
          >
            Full refresh
          </button>
        </div>
      </div>
    </div>
  );
}
