// Fallback display version, used only when the build had no git history to
// derive one from (see scripts/generate-changelog.ts and lib/app-version.ts).
export const CURRENT_VERSION = "2.1.2";
export const LAST_UPDATED = "2026-10-12";

// Version of the data the app keeps in localStorage. Bump this ONLY when a
// stored format changes in a way old data would break: on the next visit the
// app clears non-preserved localStorage keys and reloads once. Ordinary
// releases must not bump it. (Item data has its own automatic cache key.)
export const STORAGE_SCHEMA_VERSION = 1;
