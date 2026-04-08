import posthog from "posthog-js";

import {
  getStoredCookiePreferences,
  type CookiePreferences,
} from "@/lib/cookie-consent";

const POSTHOG_DEFAULT_HOST = "https://eu.i.posthog.com";

export const posthogToken =
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim() ?? "";
export const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST;

type PostHogConsentClient = Pick<
  typeof posthog,
  "opt_in_capturing" | "opt_out_capturing"
>;

export function isPostHogConfigured(): boolean {
  return posthogToken.length > 0;
}

export function syncPostHogConsentFromPreferences(
  preferences: CookiePreferences | null,
  client: PostHogConsentClient = posthog
): boolean {
  if (!isPostHogConfigured()) {
    return false;
  }

  if (preferences?.analytics) {
    client.opt_in_capturing({ captureEventName: false });
    return true;
  }

  client.opt_out_capturing();
  return false;
}

export function syncPostHogConsentFromStorage(
  client: PostHogConsentClient = posthog
): boolean {
  return syncPostHogConsentFromPreferences(
    getStoredCookiePreferences(),
    client
  );
}
