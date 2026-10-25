import { startPostHogIfAllowed } from "@/lib/posthog-client";

// posthog-js is fetched later, when the browser is idle, and only for visitors
// who allowed analytics. Keep this file small: it runs before hydration.
startPostHogIfAllowed();

// Optional client hook – keep exported to satisfy Next.js optional imports
export const onRouterTransitionStart = () => {};
