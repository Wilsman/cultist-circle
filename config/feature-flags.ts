// config/feature-flags.ts
// Centralized feature flags for the app. Keep simple booleans for now.

// Toggle the language feature (UI + behavior)
// false => force English ("en"), hide language selector UI
// true  => enable language selector and localization
export const ENABLE_LANGUAGE_FEATURE = true;
