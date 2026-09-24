import { MAX_UI_SCALE, targetSize } from "@/lib/stash-scan/prepare-screenshot";
import { describe, expect, it } from "vitest";

describe("targetSize", () => {
  it("keeps 1080p and 1440p screenshots as they are", () => {
    expect(targetSize(1920, 1080)).toEqual({ width: 1920, height: 1080, resized: false });
    expect(targetSize(2560, 1440)).toEqual({ width: 2560, height: 1440, resized: false });
  });

  it("keeps crops, whose UI scale cannot be told from their size", () => {
    expect(targetSize(711, 1080)).toEqual({ width: 711, height: 1080, resized: false });
  });

  it("downscales 4K to 1440p-sized slots", () => {
    expect(targetSize(3840, 2160)).toEqual({ width: 2560, height: 1440, resized: true });
  });

  it("uses the smaller axis for ultrawide screens, like the game UI", () => {
    // 3440x1440 already has 1440p slots; 5120x2160 has 4K slots.
    expect(targetSize(3440, 1440).resized).toBe(false);
    const superUltrawide = targetSize(5120, 2160);
    expect(superUltrawide.height).toBe(1440);
    expect(Math.min(superUltrawide.width / 1920, superUltrawide.height / 1080)).toBeCloseTo(MAX_UI_SCALE, 2);
  });
});
