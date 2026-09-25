import React from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanWithCommit } from "@/components/stash-scan/scan-with-commit";
import { StashScanStoreProvider, useSharedStashScanStore } from "@/hooks/use-stash-scan-store";
import { SELECTED_ITEM_IDS_STORAGE_KEY } from "@/lib/persisted-selected-items";

const { push, warning } = vi.hoisted(() => ({ push: vi.fn(), warning: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning, error: vi.fn() } }));
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ t: (s: string) => s }) }));
vi.mock("@/hooks/use-items-data", () => ({ useItemsData: () => ({ data: [
  { id: "test-item", name: "Test item", shortName: "Test", basePrice: 250000, lastLowPrice: 10000, sellFor: [] },
] }) }));
vi.mock("@/components/item-socket", () => ({ default: () => null }));
vi.mock("@/components/mode-threshold", () => ({ ModeThreshold: () => null }));
vi.mock("@/components/stash-scan/screenshot-overlay", () => ({ ScreenshotOverlay: () => null, OverlayLegend: () => null, CellPreview: () => null }));

function SeedScan({ confidence = "high" }: { confidence?: "high" | "low" }) {
  const store = useSharedStashScanStore();
  return <button onClick={() => {
    store.setSession({ images: [{ id: "test", url: "/test.png" }], results: [{
      width: 100, height: 50, pitch: 50,
      cells: [0, 1].map((x) => ({ x: x * 50, y: 0, width: 50, height: 50, slotsWide: 1, slotsHigh: 1,
        empty: false, confidence, matches: [{ itemId: "test-item", shortName: "Test", rotated: false, score: 1 }] })),
    }] });
    store.setAssignments({ "0:0": "test-item", "0:1": "test-item" });
  }}>Seed scan</button>;
}
function renderScan(confidence?: "high" | "low") {
  render(<StashScanStoreProvider><SeedScan confidence={confidence} /><ScanWithCommit /></StashScanStoreProvider>);
  fireEvent.click(screen.getByText("Seed scan"));
}
Element.prototype.scrollIntoView = vi.fn();
afterEach(cleanup);

describe("route stash handoff", () => {
  it.each([
    ["review panel", 0],
    ["sacrifice plan", 1],
  ])("saves inventory and source before navigating from the %s button", (_, index) => {
    push.mockImplementation(() => {
      expect(JSON.parse(localStorage.getItem("stashInventory")!).items["test-item"].count).toBe(2);
      expect(localStorage.getItem("autoSelectSource")).toBe("stash");
      expect(JSON.parse(localStorage.getItem(SELECTED_ITEM_IDS_STORAGE_KEY)!)).toEqual(["test-item", "test-item", null, null, null]);
    });
    renderScan();
    const commits = screen.getAllByRole("button", { name: "Save stash and load plan" });
    expect(commits).toHaveLength(2);
    fireEvent.click(commits[index]);
    expect(push).toHaveBeenCalledWith("/");
  });
  it("holds the plan until flagged matches are reviewed", () => {
    renderScan("low");
    expect(screen.queryByRole("button", { name: "Save stash and load plan" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review {count} matches" }));
    expect(push).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("stashInventory") ?? "null")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mark all reviewed" }));
    expect(screen.getAllByRole("button", { name: "Save stash and load plan" })).toHaveLength(2);
  });
  it("updates an existing stash and switches back from market to stash", () => {
    localStorage.setItem("stashInventory", JSON.stringify({ version: 1, gameMode: "pvp", scannedAt: 1, screenshots: 1, items: {} }));
    localStorage.setItem("autoSelectSource", "market");
    renderScan();
    fireEvent.click(screen.getAllByRole("button", { name: "Update stash and load plan" })[0]);
    expect(localStorage.getItem("autoSelectSource")).toBe("stash");
    expect(push).toHaveBeenCalledWith("/");
  });
  it("saves an unreachable stash, warns and preserves the current calculator slots", () => {
    localStorage.setItem("userThreshold", "900000");
    localStorage.setItem(SELECTED_ITEM_IDS_STORAGE_KEY, JSON.stringify(["existing", null, null, null, null]));
    renderScan();
    fireEvent.click(screen.getByRole("button", { name: "Save stash and load plan" }));
    expect(JSON.parse(localStorage.getItem("stashInventory")!).items["test-item"].count).toBe(2);
    expect(JSON.parse(localStorage.getItem(SELECTED_ITEM_IDS_STORAGE_KEY)!)[0]).toBe("existing");
    expect(warning).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });
});
