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

// EEA, UK and Switzerland: ad and analytics cookies wait for an explicit
// choice there. Elsewhere Google may use them until the visitor opts out.
export const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
  "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MT",
  "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK",
];

/**
 * Inline script for <head>. It sets Google Consent Mode defaults and applies
 * a choice the visitor already saved, before any Google tag loads.
 */
export function getConsentModeBootstrapScript(): string {
  const key = JSON.stringify(COOKIE_CONSENT_STORAGE_KEY);
  const regions = JSON.stringify(CONSENT_REQUIRED_REGIONS);

  return `(function(){
window.dataLayer=window.dataLayer||[];
function gtag(){window.dataLayer.push(arguments);}
window.gtag=window.gtag||gtag;
var no="denied",yes="granted";
gtag("consent","default",{ad_storage:yes,ad_user_data:yes,ad_personalization:yes,analytics_storage:yes});
gtag("consent","default",{ad_storage:no,ad_user_data:no,ad_personalization:no,analytics_storage:no,region:${regions},wait_for_update:500});
try{
var raw=window.localStorage.getItem(${key});
if(raw){
var p=raw==="true"?{analytics:true,advertising:true}:raw==="false"?{}:JSON.parse(raw);
var ads=p&&p.advertising?yes:no;
gtag("consent","update",{ad_storage:ads,ad_user_data:ads,ad_personalization:ads,analytics_storage:p&&p.analytics?yes:no});
}
}catch(e){}
})();`;
}
