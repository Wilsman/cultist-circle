import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  generateShareableCode,
  parseShareableCode,
  loadItemsFromCode,
  copyShareableCode,
} from "@/lib/share-utils";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

import { toast as mockToast } from "sonner";
const mockedToast = vi.mocked(mockToast);

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

Object.defineProperty(globalThis, "navigator", {
  value: {
    clipboard: mockClipboard,
  },
  writable: true,
});

describe("share-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
    mockedToast.mockClear();
  });

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
    },
    {
      id: "5d1b376e86f774252519444e",
      name: "LEDX",
      shortName: "LEDX",
      basePrice: 450000,
      categories: ["Medical item"],
      categories_display: [{ name: "Medical item" }],
      englishName: "LEDX",
      englishShortName: "LEDX",
    },
  ];

  describe("generateShareableCode", () => {
    test("generates empty code for no items", () => {
      const code = generateShareableCode([], false);
      expect(code).toBe("");
    });

    test("generates empty code for all null items", () => {
      const code = generateShareableCode([null, null, null, null, null], false);
      expect(code).toBe("");
    });

    test("generates code for PVP mode with single item", () => {
      const code = generateShareableCode(
        [mockItems[0], null, null, null, null],
        false
      );
      expect(code).toBe("djo1MDM0ZDE5YQ==");
    });

    test("generates code for PVE mode with multiple items", () => {
      const code = generateShareableCode(
        [mockItems[0], mockItems[1], null, null, null],
        true
      );
      expect(code).toBe("cDo1MDM0ZDE5YSw1YzFlNDk1YQ==");
    });

    test("generates code with all 5 items", () => {
      const code = generateShareableCode(mockItems, true);
      expect(code).toBe("cDo1MDM0ZDE5YSw1YzFlNDk1YSw1ZDFiMzc2ZQ==");
    });

    test("filters out null items correctly", () => {
      const code = generateShareableCode(
        [null, mockItems[1], null, mockItems[0], null],
        false
      );
      expect(code).toBe("djo1YzFlNDk1YSw1MDM0ZDE5YQ==");
    });
  });

  describe("parseShareableCode", () => {
    test("parses valid PVP code", () => {
      const result = parseShareableCode("djo1MDM0ZDE5YQ==");
      expect(result.itemIds).toEqual(["5034d19a"]);
      expect(result.isPVE).toBe(false);
      expect(result.error).toBeUndefined();
    });

    test("parses valid PVE code", () => {
      const result = parseShareableCode("cDo1MDM0ZDE5YSxjMWU0OTVhOA==");
      expect(result.itemIds).toEqual(["5034d19a", "c1e495a8"]);
      expect(result.isPVE).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("handles empty code", () => {
      const result = parseShareableCode("");
      expect(result.itemIds).toEqual([]);
      expect(result.isPVE).toBe(null);
      expect(result.error).toBe("Invalid code structure");
    });

    test("handles invalid Base64", () => {
      const result = parseShareableCode("invalid!@#$");
      expect(result.itemIds).toEqual([]);
      expect(result.isPVE).toBe(null);
      expect(result.error).toBe("Invalid code format");
    });

    test("handles invalid code structure", () => {
      const result = parseShareableCode("bm9jb2xvbg"); // 'nocolon' in base64
      expect(result.itemIds).toEqual([]);
      expect(result.isPVE).toBe(null);
      expect(result.error).toBe("Invalid code structure");
    });

    test("handles invalid game mode", () => {
      const result = parseShareableCode("eTo1MDM0ZDE5YSxjMWU0OTVhOA"); // 'x:5034d19a,c1e495a8'
      expect(result.itemIds).toEqual([]);
      expect(result.isPVE).toBe(null);
      expect(result.error).toBe("Invalid game mode");
    });

    test("handles code with no items", () => {
      const result = parseShareableCode("cDo="); // 'p:' in base64
      expect(result.itemIds).toEqual([]);
      expect(result.isPVE).toBe(true); // Valid game mode 'p' parsed successfully
      expect(result.error).toBeUndefined();
    });
  });

  describe("loadItemsFromCode", () => {
    test("loads items from valid PVP code", () => {
      const code = generateShareableCode([mockItems[0], mockItems[1]], false);
      const result = loadItemsFromCode(code, mockItems);

      expect(result.items).toHaveLength(5);
      expect(result.items![0]).toEqual({
        ...mockItems[0],
        lastLowPrice: 0,
      });
      expect(result.items![1]).toEqual({
        ...mockItems[1],
        lastLowPrice: 0,
      });
      expect(result.items![2]).toBeNull();
      expect(result.items![3]).toBeNull();
      expect(result.items![4]).toBeNull();
      expect(result.isPVE).toBe(false);
    });

    test("loads items from valid PVE code", () => {
      const code = generateShareableCode([mockItems[2]], true);
      const result = loadItemsFromCode(code, mockItems);

      expect(result.items![0]).toEqual({
        ...mockItems[2],
        lastLowPrice: 0,
      });
      expect(result.isPVE).toBe(true);
    });

    test("handles empty code", () => {
      const result = loadItemsFromCode("", mockItems);
      expect(result.items).toBeNull();
      expect(result.isPVE).toBeNull();
    });

    test("handles invalid code", () => {
      const result = loadItemsFromCode("invalid!@#$", mockItems);
      expect(result.items).toBeNull();
      expect(result.isPVE).toBeNull();
      expect(mockedToast).toHaveBeenCalledWith("Invalid Code", {
        description: "The code format is invalid. Please check and try again.",
      });
    });

    test("handles empty items data", () => {
      const code = generateShareableCode([mockItems[0]], false);
      const result = loadItemsFromCode(code, []);
      expect(result.items).toBeNull();
      expect(result.isPVE).toBeNull();
    });

    test("handles item not found in data", () => {
      const code = generateShareableCode([mockItems[0]], false);
      const result = loadItemsFromCode(code, [mockItems[1]]);

      expect(result.items).toHaveLength(5);
      expect(result.items![0]).toBeNull();
      expect(result.isPVE).toBe(false);
    });

    test("handles malformed item data", () => {
      const malformedItems = [
        {
          id: "5034d19ac2b94b42496d3d7e",
          name: "Test",
          basePrice: "invalid" as any,
          lastLowPrice: null,
        },
      ] as any;

      const code = generateShareableCode([malformedItems[0]], false);
      const result = loadItemsFromCode(code, malformedItems);

      expect(result.items![0]).toBeDefined();
      expect(typeof result.items![0]!.basePrice).toBe("number");
    });

    test("limits to 5 items", () => {
      const code = generateShareableCode(mockItems, false);
      const result = loadItemsFromCode(code, mockItems);

      expect(result.items).toHaveLength(5);
      // Should only load first 3 items since we only have 3 in the code
      expect(result.items![0]).toEqual({
        ...mockItems[0],
        lastLowPrice: 0,
      });
      expect(result.items![1]).toEqual({
        ...mockItems[1],
        lastLowPrice: 0,
      });
      expect(result.items![2]).toEqual({
        ...mockItems[2],
        lastLowPrice: 0,
      });
      expect(result.items![3]).toBeNull();
      expect(result.items![4]).toBeNull();
    });
  });

  describe("copyShareableCode", () => {
    test("copies valid code to clipboard", async () => {
      const code = generateShareableCode([mockItems[0]], false);
      copyShareableCode([mockItems[0]], false);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(code);
      await vi.waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith("Code Copied!", {
          description: "Shareable code copied to clipboard. 1 item included.",
        });
      });
    });

    test("shows error for no items", () => {
      copyShareableCode([], false);

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(mockedToast).toHaveBeenCalledWith("No Items Selected", {
        description: "Please select at least one item to share.",
      });
    });

    test("handles clipboard error", async () => {
      mockClipboard.writeText.mockRejectedValue(new Error("Clipboard error"));

      copyShareableCode([mockItems[0]], false);

      // Wait for the promise to resolve
      await vi.waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith("Failed to Copy Code", {
          description: "Please try again or manually copy the code.",
        });
      });
    });

    test("shows plural for multiple items", async () => {
      copyShareableCode([mockItems[0], mockItems[1]], false);

      await vi.waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith("Code Copied!", {
          description: "Shareable code copied to clipboard. 2 items included.",
        });
      });
    });
  });

  describe("integration tests", () => {
    test("full round-trip: generate -> parse -> load", () => {
      const originalItems = [mockItems[0], mockItems[1], null, null, null];
      const isPVE = true;

      // Generate code
      const code = generateShareableCode(originalItems, isPVE);
      expect(code).toBeTruthy();

      // Parse code
      const parsed = parseShareableCode(code);
      expect(parsed.itemIds).toHaveLength(2);
      expect(parsed.isPVE).toBe(true);

      // Load items from code
      const loaded = loadItemsFromCode(code, mockItems);
      expect(loaded.items).toHaveLength(5);
      expect(loaded.items![0]).toEqual({
        ...mockItems[0],
        lastLowPrice: 0,
      });
      expect(loaded.items![1]).toEqual({
        ...mockItems[1],
        lastLowPrice: 0,
      });
      expect(loaded.isPVE).toBe(true);
    });

    test("handles edge case: single character item ID", () => {
      const edgeCaseItem = {
        ...mockItems[0],
        id: "a",
      };

      const code = generateShareableCode([edgeCaseItem], false);
      const parsed = parseShareableCode(code);

      expect(parsed.itemIds).toEqual(["a"]);
      expect(parsed.isPVE).toBe(false);
    });

    test("handles maximum item count (5 items)", () => {
      const fiveItems = [...mockItems, mockItems[0], mockItems[1]]; // 5 items total
      const code = generateShareableCode(fiveItems, true);
      const parsed = parseShareableCode(code);

      expect(parsed.itemIds).toHaveLength(5);
      expect(parsed.isPVE).toBe(true);
    });
  });
});
