import {
  DEFAULT_COOKIE_PREFERENCES,
  parseCookieConsent,
} from "@/lib/cookie-consent";
import { describe, expect, it } from "vitest";

describe("cookie consent helpers", () => {
  it("parses saved JSON cookie preferences", () => {
    expect(
      parseCookieConsent(
        JSON.stringify({
          necessary: true,
          analytics: false,
          advertising: true,
        })
      )
    ).toEqual({
      necessary: true,
      analytics: false,
      advertising: true,
    });
  });

  it("supports legacy boolean consent values", () => {
    expect(parseCookieConsent("true")).toEqual({
      necessary: true,
      analytics: true,
      advertising: true,
    });

    expect(parseCookieConsent("false")).toEqual({
      ...DEFAULT_COOKIE_PREFERENCES,
      analytics: false,
      advertising: false,
    });
  });

  it("returns null for missing or invalid values", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent("not-json")).toBeNull();
  });
});
