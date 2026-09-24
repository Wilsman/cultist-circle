/** The server flag controls processing; preview trials also have an expiry. */
export function scanEnabled(now = Date.now()): boolean {
  if (process.env.STASH_SCAN_ENABLED !== "true") return false;
  if (process.env.VERCEL_ENV === "production") return true;

  const expires = Date.parse(process.env.STASH_SCAN_TRIAL_EXPIRES_AT ?? "");
  return Number.isFinite(expires) && now < expires;
}
