export const SCAN_TOKEN_KEY = "stashScanTrialToken";

export function scanFetch(init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set(
    "x-stash-scan-token",
    sessionStorage.getItem(SCAN_TOKEN_KEY) ?? "",
  );
  return fetch("/api/stash-scan", { ...init, headers });
}
