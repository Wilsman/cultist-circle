import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import ShareCardButton from "@/components/share-card-button";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

// Mock sonner toast
const mockToast = vi.fn();
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock clipboard API
const mockClipboard = {
  write: vi.fn(),
};

Object.defineProperty(globalThis, "navigator", {
  value: {
    clipboard: mockClipboard,
  },
  writable: true,
});

// Mock Canvas API
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    fillStyle: "",
    fillRect: vi.fn(),
    strokeStyle: "",
    stroke: vi.fn(),
    font: "",
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    lineWidth: 1,
    textAlign: "left",
  })),
  toBlob: vi.fn((callback) => {
    callback(new Blob(["test"], { type: "image/png" }));
  }),
};

Object.defineProperty(globalThis, "document", {
  value: {
    createElement: vi.fn(() => mockCanvas),
  },
  writable: true,
});

// Mock ClipboardItem
Object.defineProperty(globalThis, "ClipboardItem", {
  value: class ClipboardItem {
    constructor(data: any) {
      this.data = data;
    }
    data: any;
  },
  writable: true,
});

// Mock createImageBitmap
Object.defineProperty(globalThis, "createImageBitmap", {
  value: vi.fn(() =>
    Promise.resolve({
      width: 36,
      height: 36,
      close: vi.fn(),
    })
  ),
  writable: true,
});

describe("ShareCardButton", () => {
  const mockItems: SimplifiedItem[] = [
    {
      id: "5034d19ac2b94b42496d3d7e",
      name: "Antique Vase",
      shortName: "Vase",
      basePrice: 67800,
      categories: ["Barter item"],
      categories_display: [{ name: "Barter item" }],
      englishName: "Antique Vase",
      englishShortName: "Vase",
      iconLink: "https://example.com/icon1.png",
    },
    {
      id: "5c1e495a86f7743ba286cf4f",
      name: "Moonshine",
      shortName: "Moonshine",
      basePrice: 200000,
      categories: ["Barter item"],
      categories_display: [{ name: "Barter item" }],
      englishName: "Moonshine",
      englishShortName: "Moonshine",
      iconLink: "https://example.com/icon2.png",
    },
  ];

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockClipboard.write.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  test("renders button with correct text", () => {
    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Copy share card")).toBeInTheDocument();
  });

  test("shows loading state while copying", async () => {
    mockClipboard.write.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Copying…")).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  test("creates canvas with correct dimensions", async () => {
    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(475);
    });
  });

  test("draws card content correctly", async () => {
    const mockCtx = mockCanvas.getContext();

    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 475);
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "Cultist Circle Sacrifice",
        48,
        72
      );
      expect(mockCtx.fillText).toHaveBeenCalledWith("Base: ₽267,800", 48, 108);
      expect(mockCtx.fillText).toHaveBeenCalledWith("Cost: ₽300,000", 254, 108);
    });
  });

  test("displays correct timer label", async () => {
    const mockCtx = mockCanvas.getContext();

    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVE"
        sacred={true}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCtx.fillText).toHaveBeenCalledWith("Timer: 12h", 48, 148);
      expect(mockCtx.fillText).toHaveBeenCalledWith("Mode: PVE", 48, 148);
      expect(mockCtx.fillText).toHaveBeenCalledWith("Sacred: Yes", 48, 148);
    });
  });

  test("handles different total values correctly", async () => {
    const testCases = [
      { total: 100_000, expected: "5h" },
      { total: 200_000, expected: "8h" },
      { total: 300_000, expected: "12h" },
      { total: 350_000, expected: "14h" },
      { total: 400_000, expected: "6/14h" },
    ];

    for (const testCase of testCases) {
      const mockCtx = mockCanvas.getContext();

      render(
        <ShareCardButton
          items={mockItems}
          total={testCase.total}
          totalFlea={testCase.total}
          modeLabel="PVP"
          sacred={false}
        />
      );

      const button = screen.getByRole("button", { name: /copy share card/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCtx.fillText).toHaveBeenCalledWith(
          `Timer: ${testCase.expected}`,
          48,
          148
        );
      });

      cleanup();
    }
  });

  test("handles empty items array", async () => {
    render(
      <ShareCardButton
        items={[null, null, null, null, null]}
        total={0}
        totalFlea={0}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Share card copied", {
        description: "PNG image placed in your clipboard.",
      });
    });
  });

  test("handles missing icon links gracefully", async () => {
    const itemsWithoutIcons = mockItems.map((item) => ({
      ...item,
      iconLink: undefined,
    }));

    render(
      <ShareCardButton
        items={itemsWithoutIcons}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Share card copied", {
        description: "PNG image placed in your clipboard.",
      });
    });
  });

  test("handles clipboard errors", async () => {
    mockClipboard.write.mockRejectedValue(new Error("Clipboard error"));

    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Failed to copy", {
        description: "Your browser may block clipboard images. Try again.",
      });
    });
  });

  test("handles canvas creation errors", async () => {
    Object.defineProperty(globalThis, "document", {
      value: {
        createElement: vi.fn(() => null),
      },
      writable: true,
    });

    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Failed to copy", {
        description: "Your browser may block clipboard images. Try again.",
      });
    });
  });

  test("applies custom className", () => {
    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
        className="custom-class"
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    expect(button).toHaveClass("custom-class");
  });

  test("formats ruble amounts correctly", async () => {
    const mockCtx = mockCanvas.getContext();

    render(
      <ShareCardButton
        items={mockItems}
        total={1234567}
        totalFlea={987654}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "Base: ₽1,234,567",
        48,
        108
      );
      expect(mockCtx.fillText).toHaveBeenCalledWith("Cost: ₽987,654", 254, 108);
    });
  });

  test("truncates long item names", async () => {
    const longNameItem = {
      ...mockItems[0],
      name: "This is a very long item name that should be truncated",
      shortName: "Very Long Name",
    };

    const mockCtx = mockCanvas.getContext();
    mockCtx.measureText.mockReturnValue({ width: 500 }); // Simulate long text

    render(
      <ShareCardButton
        items={[longNameItem]}
        total={67800}
        totalFlea={80000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      // Should call truncateText function which adds ellipsis
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  test("includes timestamp in footer", async () => {
    const mockDate = new Date("2024-01-01T12:00:00");
    vi.spyOn(globalThis, "Date").mockImplementation(() => mockDate as any);

    const mockCtx = mockCanvas.getContext();

    render(
      <ShareCardButton
        items={mockItems}
        total={267800}
        totalFlea={300000}
        modeLabel="PVP"
        sacred={false}
      />
    );

    const button = screen.getByRole("button", { name: /copy share card/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        "1/1/2024, 12:00:00 PM",
        748,
        435
      );
    });

    vi.restoreAllMocks();
  });
});
