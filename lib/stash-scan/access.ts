import { scanTrialEnabled } from "./enabled";

export function scanAccessStatus(): 200 | 503 {
  return scanTrialEnabled() ? 200 : 503;
}
