import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("posthog consent bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_POSTHOG_TOKEN: "ph_test_token",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("opts into PostHog only when analytics consent is granted", async () => {
    const { syncPostHogConsentFromPreferences } = await import(
      "@/lib/posthog-client"
    );
    const client = {
      opt_in_capturing: vi.fn(),
      opt_out_capturing: vi.fn(),
    };

    const analyticsEnabled = syncPostHogConsentFromPreferences(
      {
        necessary: true,
        analytics: true,
        advertising: false,
      },
      client
    );

    expect(analyticsEnabled).toBe(true);
    expect(client.opt_in_capturing).toHaveBeenCalledWith({
      captureEventName: false,
    });
    expect(client.opt_out_capturing).not.toHaveBeenCalled();
  });

  it("never loads PostHog or sends events without analytics consent", async () => {
    const init = vi.fn();
    vi.doMock("posthog-js", () => ({ default: { init } }));
    window.localStorage.removeItem("cookieConsent");
    const { captureEvent, startPostHogIfAllowed } = await import(
      "@/lib/posthog-client"
    );

    startPostHogIfAllowed();
    captureEvent("auto_select_clicked");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(init).not.toHaveBeenCalled();
  });

  it("loads PostHog lazily and sends events queued before it loaded", async () => {
    const capture = vi.fn();
    const posthog = {
      init: vi.fn(),
      capture,
      captureException: vi.fn(),
      register: vi.fn(),
      opt_in_capturing: vi.fn(),
      opt_out_capturing: vi.fn(),
    };
    vi.doMock("posthog-js", () => ({ default: posthog }));
    window.localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ analytics: true, advertising: false })
    );
    const { captureEvent, loadPostHog } = await import("@/lib/posthog-client");

    captureEvent("auto_select_clicked", { threshold: 400000 });
    expect(capture).not.toHaveBeenCalled();
    await loadPostHog();

    expect(posthog.init).toHaveBeenCalledWith(
      "ph_test_token",
      expect.objectContaining({ api_host: "https://us.i.posthog.com" })
    );
    expect(capture).toHaveBeenCalledWith("auto_select_clicked", {
      threshold: 400000,
    });
    window.localStorage.removeItem("cookieConsent");
  });

  it("opts out when analytics consent is denied or unavailable", async () => {
    const { syncPostHogConsentFromPreferences } = await import(
      "@/lib/posthog-client"
    );
    const client = {
      opt_in_capturing: vi.fn(),
      opt_out_capturing: vi.fn(),
    };

    expect(
      syncPostHogConsentFromPreferences(
        {
          necessary: true,
          analytics: false,
          advertising: false,
        },
        client
      )
    ).toBe(false);
    expect(syncPostHogConsentFromPreferences(null, client)).toBe(false);
    expect(client.opt_in_capturing).not.toHaveBeenCalled();
    expect(client.opt_out_capturing).toHaveBeenCalledTimes(2);
  });
});
