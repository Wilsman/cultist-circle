# Edge Mitigation Changes (2025-02-14)

## Why

- Reduce Vercel Edge Requests by preventing middleware from running on normal app routes.
- Stop the /404 redirect loop that doubled edge hits for bot traffic.

## What Changed

### 1) middleware behavior

- Previously: middleware ran on almost all paths and redirected unknown paths to `/404`.
- Now: middleware only matches common bot/scanner paths and returns a minimal cached 404 response.

### 2) middleware matcher

- Previously: broad matcher with negative lookahead (most routes hit Edge).
- Now: allowlist of known scanner paths only.

## Files Updated

- `middleware.ts`

## How to Revert

- Restore the previous broad matcher and whitelist/redirect logic in `middleware.ts`.
- Or delete `middleware.ts` entirely if you want no middleware at all.

## Notes

- Normal user routes (`/`, `/faq`, `/recipes`, `/base-values`, etc.) now bypass middleware completely.
- Scanner paths return `404 Not Found` with long-lived caching headers.
