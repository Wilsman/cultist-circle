import { describe, expect, it } from "vitest";
import {
  UNKNOWN_ITEM_ICON,
  isMissingItemIcon,
  resolveItemIcon,
} from "@/lib/item-icon";

describe("resolveItemIcon", () => {
  it("keeps real tarkov.dev icons", () => {
    const url = "https://assets.tarkov.dev/5c0e874186f7745dc7616606-icon.webp";
    expect(resolveItemIcon(url)).toBe(url);
  });

  it("replaces missing and tarkov.dev placeholder icons", () => {
    expect(resolveItemIcon(undefined)).toBe(UNKNOWN_ITEM_ICON);
    expect(resolveItemIcon("")).toBe(UNKNOWN_ITEM_ICON);
    expect(
      resolveItemIcon("https://assets.tarkov.dev/unknown-item-512.webp"),
    ).toBe(UNKNOWN_ITEM_ICON);
    expect(
      resolveItemIcon("https://assets.tarkov.dev/unknown-item-icon.webp"),
    ).toBe(UNKNOWN_ITEM_ICON);
  });

  it("treats the local fallback as missing so better icons can win", () => {
    expect(isMissingItemIcon(UNKNOWN_ITEM_ICON)).toBe(true);
  });
});
