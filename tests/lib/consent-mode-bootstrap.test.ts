import {
  CONSENT_REQUIRED_REGIONS,
  COOKIE_CONSENT_STORAGE_KEY,
  getConsentModeBootstrapScript,
} from "@/lib/cookie-consent";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type ConsentCall = [string, string, Record<string, unknown>];

function runBootstrap(): ConsentCall[] {
  new Function(getConsentModeBootstrapScript())();
  return (window.dataLayer ?? []).map(
    (args) => Array.from(args as unknown as ArrayLike<unknown>) as ConsentCall
  );
}

describe("consent mode bootstrap script", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    window.localStorage.clear();
    delete window.dataLayer;
    delete window.gtag;
  });

  afterEach(() => {
    window.localStorage.clear();
    delete window.dataLayer;
    delete window.gtag;
  });

  it("denies ad and analytics storage in consent regions until a choice is saved", () => {
    const calls = runBootstrap();

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([
      "consent",
      "default",
      expect.objectContaining({ ad_storage: "granted" }),
    ]);
    expect(calls[1]).toEqual([
      "consent",
      "default",
      expect.objectContaining({
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        region: CONSENT_REQUIRED_REGIONS,
      }),
    ]);
  });

  it("applies a saved choice immediately", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ necessary: true, analytics: true, advertising: false })
    );

    expect(runBootstrap()[2]).toEqual([
      "consent",
      "update",
      {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "granted",
      },
    ]);
  });

  it("supports the legacy accept-all value", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "true");

    expect(runBootstrap()[2]?.[2]).toMatchObject({
      ad_storage: "granted",
      analytics_storage: "granted",
    });
  });

  it("ignores a corrupt saved value", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "{oops");

    expect(runBootstrap()).toHaveLength(2);
  });
});
