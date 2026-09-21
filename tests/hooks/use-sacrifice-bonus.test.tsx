import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSacrificeBonus } from "@/hooks/use-sacrifice-bonus";

describe("sacrifice bonus transfer", () => {
  it("restores the chosen item and hideout level on the calculator after navigation", () => {
    const scan = renderHook(useSacrificeBonus);
    act(() => scan.result.current.setItemId("sacred-amulet"));
    act(() => scan.result.current.setHideoutLevel(51));
    scan.unmount();
    const calculator = renderHook(useSacrificeBonus);
    expect(calculator.result.current.itemId).toBe("sacred-amulet");
    expect(calculator.result.current.hideoutLevel).toBe(51);
  });
  it("rejects invalid stored settings", () => {
    localStorage.setItem(
      "sacrificeBonusSettings",
      '{"itemId":"sacred-amulet","hideoutLevel":999}',
    );
    expect(renderHook(useSacrificeBonus).result.current.itemId).toBe("none");
  });
});
