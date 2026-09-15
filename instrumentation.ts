// Server-side instrumentation hook (reserved for future analytics/error tracking)
export async function register() {
  // Self-hosted servers: load the stash scan icon index and keep it fresh in
  // the background. On Vercel every function instance would pay for loading
  // it, so the scan route loads it on first use instead.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL !== "1" &&
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
