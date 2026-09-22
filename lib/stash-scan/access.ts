import { scanEnabled } from "./enabled";

export function scanAccessStatus(): 200 | 503 {
  return scanEnabled() ? 200 : 503;
}
