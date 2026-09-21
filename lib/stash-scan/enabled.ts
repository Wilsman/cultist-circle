/** Fail closed: enabling the UI alone cannot enable processing. */
export function scanTrialEnabled(now = Date.now()): boolean {
  const expires = Date.parse(process.env.STASH_SCAN_TRIAL_EXPIRES_AT ?? "");
  return (
    process.env.STASH_SCAN_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    !!process.env.STASH_SCAN_TRIAL_TOKEN &&
    Number.isFinite(expires) &&
    now < expires
  );
}

