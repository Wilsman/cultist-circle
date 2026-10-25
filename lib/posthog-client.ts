import type { PostHog, Properties } from "posthog-js";

import { APP_BUILD, APP_VERSION } from "@/lib/app-version";
import {
  getStoredCookiePreferences,
  type CookiePreferences,
} from "@/lib/cookie-consent";

// Events go straight from the browser to PostHog. Do not route them through a
// Next.js rewrite or API route: that would bill every event to Vercel.
const POSTHOG_DEFAULT_HOST = "https://eu.i.posthog.com";
const MAX_QUEUED_CALLS = 100;

// Vercel stores the project key as NEXT_PUBLIC_POSTHOG_KEY.
export const posthogToken = (
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN ||
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  ""
).trim();
export const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST;
// Only needed when posthogHost is a proxy, so toolbar and replay links still
// open the PostHog app.
const posthogUiHost =
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || undefined;

type PostHogConsentClient = Pick<
  PostHog,
  "opt_in_capturing" | "opt_out_capturing"
>;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: Array<(posthog: PostHog) => void> = [];

export function isPostHogConfigured(): boolean {
  return posthogToken.length > 0;
}

function hasAnalyticsConsent(): boolean {
  return Boolean(getStoredCookiePreferences()?.analytics);
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 3000 });
    } else {
      setTimeout(resolve, 1);
    }
  });
}

function applyConsent(target: PostHogConsentClient, granted: boolean): void {
  if (granted) {
    target.opt_in_capturing({ captureEventName: false });
  } else {
    target.opt_out_capturing();
  }
}

/**
 * Downloads and starts PostHog once the browser is idle. posthog-js stays out
 * of the startup bundle, and visitors without analytics consent never load it.
 */
export function loadPostHog(): Promise<PostHog | null> {
  if (typeof window === "undefined" || !isPostHogConfigured()) {
    return Promise.resolve(null);
  }

  loading ??= whenIdle()
    .then(() => import("posthog-js"))
    .then(({ default: posthog }) => {
      posthog.init(posthogToken, {
        api_host: posthogHost,
        ...(posthogUiHost ? { ui_host: posthogUiHost } : {}),
        defaults: "2026-08-30",
        person_profiles: "identified_only",
        capture_pageview: "history_change",
        capture_pageleave: true,
        autocapture: true,
        capture_dead_clicks: true,
        capture_heatmaps: true,
        capture_exceptions: true,
        capture_performance: { web_vitals: true, network_timing: true },
        // Replay on/off and its sample rate are set in the PostHog project.
        session_recording: { maskAllInputs: true },
        opt_out_capturing_by_default: true,
        loaded: (instance) => {
          instance.register({
            app_version: APP_VERSION,
            app_build: APP_BUILD,
            language: window.localStorage.getItem("language") ?? "en",
          });
          // Runs before the first page view, so that view is kept.
          applyConsent(instance, hasAnalyticsConsent());
        },
      });

      client = posthog;
      for (const call of queue.splice(0)) {
        call(posthog);
      }
      return posthog;
    })
    .catch((error: unknown) => {
      console.warn("PostHog failed to load", error);
      loading = null;
      queue.length = 0;
      return null;
    });

  return loading;
}

/** Starts PostHog on page load for visitors who already allowed analytics. */
export function startPostHogIfAllowed(): void {
  if (isPostHogConfigured() && hasAnalyticsConsent()) {
    void loadPostHog();
  }
}

function withPostHog(call: (posthog: PostHog) => void): void {
  if (client) {
    call(client);
    return;
  }

  if (!isPostHogConfigured() || !hasAnalyticsConsent()) {
    return;
  }

  if (queue.length < MAX_QUEUED_CALLS) {
    queue.push(call);
  }
  void loadPostHog();
}

/** Records a product event. Does nothing without analytics consent. */
export function captureEvent(event: string, properties?: Properties): void {
  withPostHog((posthog) => posthog.capture(event, properties));
}

/** Sends an error caught by a React error boundary to PostHog error tracking. */
export function captureError(error: unknown, properties?: Properties): void {
  withPostHog((posthog) => posthog.captureException(error, properties));
}

export function setAnalyticsProperties(properties: Properties): void {
  withPostHog((posthog) => posthog.register(properties));
}

export function syncPostHogConsentFromPreferences(
  preferences: CookiePreferences | null,
  target?: PostHogConsentClient
): boolean {
  if (!isPostHogConfigured()) {
    return false;
  }

  const granted = Boolean(preferences?.analytics);

  if (target) {
    applyConsent(target, granted);
  } else if (granted) {
    void loadPostHog().then((posthog) => {
      if (posthog) applyConsent(posthog, true);
    });
  } else {
    queue.length = 0;
    if (client) applyConsent(client, false);
  }

  return granted;
}

export function syncPostHogConsentFromStorage(
  target?: PostHogConsentClient
): boolean {
  return syncPostHogConsentFromPreferences(
    getStoredCookiePreferences(),
    target
  );
}
