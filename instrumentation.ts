// Server-side instrumentation for PostHog error tracking
export async function register() {}

export const onRequestError = async (err: unknown, request: Request) => {
  // Only run in Node.js runtime (PostHog Node SDK is not supported in edge runtime)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    // Lazy import to avoid bundling in edge
    const { getPostHogServer } = await import("./lib/posthog-server");
    const posthog = getPostHogServer();
    type PostHogLike = {
      captureException?: (error: unknown, distinctId?: string) => Promise<void> | void;
      capture?: (payload: {
        distinctId?: string;
        event: string;
        properties?: Record<string, unknown>;
      }) => Promise<void> | void;
    };
    const client = posthog as unknown as PostHogLike;

    // Try to associate error with user from PostHog cookie
    let distinctId: string | undefined;
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/ph_phc_.*?_posthog=([^;]+)/);
    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const data: unknown = JSON.parse(decoded);
        if (data && typeof data === "object" && "distinct_id" in data) {
          distinctId = (data as { distinct_id?: string }).distinct_id;
        }
      } catch {
        // ignore cookie parse errors
      }
    }

    // Capture exception with optional distinct_id
    if (client.captureException) {
      await client.captureException(err, distinctId);
    } else if (client.capture) {
      const error = err as Error;
      await client.capture({
        distinctId,
        event: "$exception",
        properties: {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          runtime: "nodejs",
        },
      });
    }
  } catch {
    // Swallow errors in error handler
  }
};
