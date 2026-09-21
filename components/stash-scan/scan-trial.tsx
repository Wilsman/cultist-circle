"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCAN_TOKEN_KEY, scanFetch } from "@/lib/stash-scan/client";
import { StashScan } from "./stash-scan";

export function ScanTrial({ demo = false }: { demo?: boolean }) {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sessionStorage.getItem(SCAN_TOKEN_KEY)) return;
    let cancelled = false;
    scanFetch()
      .then((response) => {
        if (!cancelled) setReady(response.ok);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (ready) return <StashScan demo={demo} />;
  return (
    <main className="mx-auto my-10 max-w-md rounded-xl border border-gray-800 bg-gray-900/80 p-6 text-white">
      <h1 className="text-2xl font-semibold">Stash Scan beta</h1>
      <p className="mt-3 text-sm text-slate-400">
        This limited trial requires an access code.
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            sessionStorage.setItem(SCAN_TOKEN_KEY, code.trim());
            const response = await scanFetch();
            if (response.ok) setReady(true);
            else {
              sessionStorage.removeItem(SCAN_TOKEN_KEY);
              setError(
                response.status === 401
                  ? "That access code was not recognised."
                  : "The trial is currently unavailable or has ended.",
              );
            }
          } catch {
            setError("Could not reach the scanner. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm" htmlFor="scan-access-code">
          Access code
        </label>
        <Input
          id="scan-access-code"
          type="password"
          autoComplete="off"
          required
          maxLength={256}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-amber-200">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Open Stash Scan"}
        </Button>
      </form>
    </main>
  );
}
