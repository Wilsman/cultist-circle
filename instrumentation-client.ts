import posthog from "posthog-js";

// Initialize PostHog on the client per Next.js 15.3+ instrumentation-client docs
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

// Optional client hook – keep exported to satisfy Next.js optional imports
export const onRouterTransitionStart = () => {};