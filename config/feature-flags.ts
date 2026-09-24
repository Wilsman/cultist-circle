// config/feature-flags.ts
// Centralized feature flags for the app. Keep simple booleans for now.

export const ENABLE_LANGUAGE_FEATURE = true;

// Compile-time UI switch; the API also enforces its own expiring access gate.
export const ENABLE_STASH_SCAN = process.env.NEXT_PUBLIC_STASH_SCAN_ENABLED === "true";
