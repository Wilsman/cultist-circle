// Server-side instrumentation hook (reserved for future analytics/error tracking)
export async function register() {
  // Load or build the stash scan icon index in the background, so the first
  // screenshot upload after a deploy does not wait for it.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.STASH_SCAN_WARM !== "0"
  ) {
    const { warmIconIndex } = await import("@/lib/stash-scan/index-store");
    warmIconIndex();
  }
}

export const onRequestError = async (err: unknown, request: Request) => {
  void err;
  void request;
};
