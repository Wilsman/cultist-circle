import posthog from "posthog-js";

import {
  isPostHogConfigured,
  posthogHost,
  posthogToken,
  syncPostHogConsentFromStorage,
} from "@/lib/posthog-client";

if (typeof window !== "undefined" && isPostHogConfigured()) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    capture_pageview: "history_change",
    defaults: "2026-01-30",
    opt_out_capturing_by_default: true,
    person_profiles: "identified_only",
    loaded: () => {
      syncPostHogConsentFromStorage();
    },
  });
}

// Optional client hook – keep exported to satisfy Next.js optional imports
export const onRouterTransitionStart = () => {};
