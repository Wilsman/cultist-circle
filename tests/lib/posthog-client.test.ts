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
