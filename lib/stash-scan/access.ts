import { createHash, timingSafeEqual } from "node:crypto";

import { scanTrialEnabled } from "./enabled";

export function scanAccessStatus(request: Request): 200 | 401 | 503 {
  if (!scanTrialEnabled()) return 503;
  const supplied = request.headers.get("x-stash-scan-token") ?? "";
  if (supplied.length > 256) return 401;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(
    hash(supplied),
    hash(process.env.STASH_SCAN_TRIAL_TOKEN!),
  )
    ? 200
    : 401;
}
