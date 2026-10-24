import { CURRENT_VERSION, LAST_UPDATED } from "@/config/changelog";
import { itemCacheKey } from "@/config/generated/build-info";
import { latestRelease } from "@/config/generated/latest";

/** Display version, derived from git history at build time (e.g. "6.42.3"). */
export const APP_VERSION = latestRelease?.version ?? CURRENT_VERSION;

/** Version plus commit hash, for feedback reports (e.g. "6.42.3+782e2a0"). */
export const APP_BUILD = latestRelease
  ? `${latestRelease.version}+${latestRelease.hash}`
  : CURRENT_VERSION;

/** Date of the latest commit, as YYYY-MM-DD. */
export const APP_RELEASE_DATE = latestRelease?.date ?? LAST_UPDATED;

/**
 * Cache key for persisted item data. Changes only when the code that shapes
 * cached items changes, not on every release.
 */
export const ITEM_CACHE_KEY = itemCacheKey;
