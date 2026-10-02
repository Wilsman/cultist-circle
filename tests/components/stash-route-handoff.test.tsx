import React from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanWithCommit } from "@/components/stash-scan/scan-with-commit";
import {
  StashScanStoreProvider,
  useSharedStashScanStore,
} from "@/hooks/use-stash-scan-store";
import { SELECTED_ITEM_IDS_STORAGE_KEY } from "@/lib/persisted-selected-items";

const { push, warning } = vi.hoisted(() => ({
  push: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning, error: vi.fn() },
}));
vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));
vi.mock("@/hooks/use-items-data", () => ({
  useItemsData: () => ({
    data: [
      {
        id: "test-item",
        name: "Test item",
        shortName: "Test",
        basePrice: 250000,
        lastLowPrice: 10000,
        sellFor: [],
      },
    ],
  }),
}));
vi.mock("@/components/item-socket", () => ({ default: () => null }));
vi.mock("@/components/mode-threshold", () => ({ ModeThreshold: () => null }));
vi.mock("@/components/stash-scan/screenshot-overlay", () => ({
  ScreenshotOverlay: () => null,
  OverlayLegend: () => null,
  CellPreview: () => null,
}));
vi.mock("@/lib/stash-scan/prepare-screenshot", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/stash-scan/prepare-screenshot")
  >()),
  prepareScreenshot: async (file: File) => file,
}));

function SeedScan({ confidence = "high" }: { confidence?: "high" | "low" }) {
  const store = useSharedStashScanStore();
  return (
    <button
      onClick={() => {
        store.setSession({
          images: [{ id: "test", url: "/test.png" }],
          results: [
            {
              width: 100,
              height: 50,
              pitch: 50,
              cells: [0, 1].map((x) => ({
                x: x * 50,
                y: 0,
                width: 50,
                height: 50,
                slotsWide: 1,
                slotsHigh: 1,
                empty: false,
                confidence,
                matches: [
                  {
                    itemId: "test-item",
                    shortName: "Test",
                    rotated: false,
                    score: 1,
                  },
                ],
              })),
            },
          ],
        });
        store.setAssignments({ "0:0": "test-item", "0:1": "test-item" });
      }}
    >
      Seed scan
    </button>
  );
}
function renderScan(confidence?: "high" | "low") {
  render(
    <StashScanStoreProvider>
      <SeedScan confidence={confidence} />
      <ScanWithCommit />
    </StashScanStoreProvider>,
  );
  fireEvent.click(screen.getByText("Seed scan"));
}
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("route stash handoff", () => {
  it("retries only failed screenshots without losing the successful scan", async () => {
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL() {
          return "blob:test";
        }
        static revokeObjectURL() {}
      },
    );
    const uploadedNames: string[] = [];
    const response = {
      images: [
        {
          width: 50,
          height: 50,
          pitch: 50,
          cells: [
            {
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              slotsWide: 1,
              slotsHigh: 1,
              empty: false,
              confidence: "high",
              matches: [
                {
                  itemId: "test-item",
                  shortName: "Test",
                  rotated: false,
                  score: 1,
                },
              ],
            },
          ],
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init: RequestInit) => {
        const file = (init.body as FormData).get("images") as File;
        uploadedNames.push(file.name);
        if (
          file.name === "retry.png" &&
          uploadedNames.filter((name) => name === file.name).length === 1
        ) {
          return new Response(
            JSON.stringify({ error: "Temporary scan failure" }),
            { status: 503 },
          );
        }
        return new Response(JSON.stringify(response));
      }),
    );
    const { container } = render(
      <StashScanStoreProvider>
        <ScanWithCommit />
      </StashScanStoreProvider>,
    );
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["test"], "success.png", { type: "image/png" }),
          new File(["test"], "retry.png", { type: "image/png" }),
        ],
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Scan {count} screenshots" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Retry failed screenshots" }),
    );
    await screen.findByRole("combobox", { name: "Choose screenshot" });
    expect(uploadedNames).toEqual(["success.png", "retry.png", "retry.png"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Save stash and load plan" }),
    );
    const inventory = JSON.parse(localStorage.getItem("stashInventory")!);
    expect(inventory.screenshots).toBe(2);
    expect(inventory.items["test-item"].count).toBe(2);
  });
  it("saves inventory and source before navigating from the single completion action", () => {
    push.mockImplementation(() => {
      expect(
        JSON.parse(localStorage.getItem("stashInventory")!).items["test-item"]
          .count,
      ).toBe(2);
      expect(localStorage.getItem("autoSelectSource")).toBe("stash");
      expect(
        JSON.parse(localStorage.getItem(SELECTED_ITEM_IDS_STORAGE_KEY)!),
      ).toEqual(["test-item", "test-item", null, null, null]);
    });
    renderScan();
    const commits = screen.getAllByRole("button", {
      name: "Save stash and load plan",
    });
    expect(commits).toHaveLength(1);
    fireEvent.click(commits[0]);
    expect(push).toHaveBeenCalledWith("/");
  });
  it("holds the plan until flagged matches are reviewed", () => {
    renderScan("low");
    expect(
      screen.queryByRole("button", { name: "Save stash and load plan" }),
    ).toBeNull();
    // A successful scan opens the first flagged match without another click.
    expect(
      screen.getByRole("combobox", { name: "Search all items" }),
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(
      JSON.parse(localStorage.getItem("stashInventory") ?? "null"),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Accept {count} remaining suggestions" }),
    );
    expect(
      screen.getAllByRole("button", { name: "Save stash and load plan" }),
    ).toHaveLength(1);
    // Accepting is not checking: the panel and plan say so.
    expect(screen.queryByText("Every match has been confirmed.")).toBeNull();
    expect(
      screen.getByText("{count} suggestions were accepted without checking."),
    ).toBeTruthy();
    expect(screen.getAllByText("Provisional").length).toBeGreaterThan(0);
  });
  it("keeps corrections when switching views and advances to completion", () => {
    renderScan("low");
    expect(
      screen.queryByRole("searchbox", { name: "Search detected items" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirm {item}" }));
    expect(screen.queryByText("Ready to save")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "All items" }));
    expect(
      screen.getByRole("searchbox", { name: "Search detected items" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review ({count})" }));
    // The last match still needs a decision; changing views did not accept it.
    expect(
      screen.getByRole("combobox", { name: "Search all items" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm {item}" }));
    expect(screen.getByText("Ready to save")).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Search all items" }),
    ).toBeNull();
    expect(
      screen.queryByText("{count} suggestions were accepted without checking."),
    ).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "Save stash and load plan" }),
    ).toHaveLength(1);
  });
  it("keeps a skipped final match unresolved and lets review resume", () => {
    renderScan("low");
    fireEvent.click(screen.getByRole("button", { name: "Confirm {item}" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip this cell" }));
    expect(screen.queryByText("Ready to save")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Resume review" }));
    expect(screen.getByRole("button", { name: "Confirm {item}" })).toBeTruthy();
  });
  it("updates an existing stash and switches back from market to stash", () => {
    localStorage.setItem(
      "stashInventory",
      JSON.stringify({
        version: 1,
        gameMode: "pvp",
        scannedAt: 1,
        screenshots: 1,
        items: {},
      }),
    );
    localStorage.setItem("autoSelectSource", "market");
    renderScan();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Update stash and load plan" })[0],
    );
    expect(localStorage.getItem("autoSelectSource")).toBe("stash");
    expect(push).toHaveBeenCalledWith("/");
  });
  it("saves an unreachable stash, warns and preserves the current calculator slots", () => {
    localStorage.setItem("userThreshold", "900000");
    localStorage.setItem(
      SELECTED_ITEM_IDS_STORAGE_KEY,
      JSON.stringify(["existing", null, null, null, null]),
    );
    renderScan();
    fireEvent.click(screen.getByRole("button", { name: "Save stash" }));
    expect(
      JSON.parse(localStorage.getItem("stashInventory")!).items["test-item"]
        .count,
    ).toBe(2);
    expect(
      JSON.parse(localStorage.getItem(SELECTED_ITEM_IDS_STORAGE_KEY)!)[0],
    ).toBe("existing");
    expect(warning).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });
  it("loads the demo plan into the calculator without saving a stash", async () => {
    localStorage.clear();
    const cells = [0, 1].map((x) => ({
      x: x * 50,
      y: 0,
      width: 50,
      height: 50,
      slotsWide: 1,
      slotsHigh: 1,
      empty: false,
      confidence: "high",
      matches: [
        { itemId: "test-item", shortName: "Test", rotated: false, score: 1 },
      ],
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              available: true,
              imageUrl: "/demo.png",
              images: [{ width: 100, height: 50, pitch: 50, cells }],
            }),
          ),
      ),
    );
    render(
      <StashScanStoreProvider>
        <ScanWithCommit demo />
      </StashScanStoreProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Load demo plan" }),
    );
    expect(
      JSON.parse(localStorage.getItem(SELECTED_ITEM_IDS_STORAGE_KEY)!),
    ).toEqual(["test-item", "test-item", null, null, null]);
    expect(
      JSON.parse(localStorage.getItem("stashInventory") ?? "null"),
    ).toBeNull();
    expect(push).toHaveBeenCalledWith("/");
    vi.unstubAllGlobals();
  });
});
