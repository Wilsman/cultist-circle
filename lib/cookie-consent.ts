export const COOKIE_CONSENT_STORAGE_KEY = "cookieConsent";

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  advertising: boolean;
}

export const DEFAULT_COOKIE_PREFERENCES = {
  necessary: true,
  analytics: true,
  advertising: false,
} satisfies CookiePreferences;

export function parseCookieConsent(
  rawValue: string | null | undefined
): CookiePreferences | null {
  if (!rawValue) {
    return null;
  }

  if (rawValue === "true") {
    return {
      necessary: true,
      analytics: true,
      advertising: true,
    };
  }

  if (rawValue === "false") {
    return {
      ...DEFAULT_COOKIE_PREFERENCES,
      analytics: false,
      advertising: false,
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<CookiePreferences>;

    return {
      ...DEFAULT_COOKIE_PREFERENCES,
      necessary: true,
      analytics: Boolean(parsed.analytics),
      advertising: Boolean(parsed.advertising),
    };
  } catch {
    return null;
  }
}

export function getStoredCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseCookieConsent(
    window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
  );
}

export function saveCookiePreferences(preferences: CookiePreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(preferences)
  );
}
