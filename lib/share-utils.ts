import { SimplifiedItem } from "@/types/SimplifiedItem";
import { toast as sonnerToast } from "sonner";
import type { GameMode } from "@/lib/game-mode";

const SHARE_MODE_CODES: Record<GameMode, string> = {
  pvp: "v",
  pve: "p",
  season: "s",
};

const SHARE_CODE_MODES: Record<string, GameMode> = {
  v: "pvp",
  p: "pve",
  s: "season",
};

/**
 * Shortens an item ID by taking the first 8 characters
 * This creates a more compact representation while maintaining uniqueness
 * @param id - The original item ID
 * @returns string - The shortened ID
 */
function shortenItemId(id: string): string {
  // Take the first 8 characters of the ID, which should be unique enough
  return id.substring(0, 8);
}

/**
 * Generates a shareable code for the selected items
 * @param selectedItems - Array of selected items
 * @param mode - The selected game mode
 * @returns string - The shareable code
 */
export function generateShareableCode(
  selectedItems: (SimplifiedItem | null)[],
  mode: GameMode,
): string {
  // Filter out null items and get their IDs
  const itemIds = selectedItems
    .filter((item): item is SimplifiedItem => item !== null)
    .map((item) => item.id);

  if (itemIds.length === 0) {
    return "";
  }

  // Use shortened item IDs for a more compact code
  const shortIds = itemIds.map(shortenItemId);

  // Create an ultra-compact code format: p:id1,id2,id3
  // Using single character for game mode and shortest possible separator
  const codeContent = `${SHARE_MODE_CODES[mode]}:${shortIds.join(",")}`;

  // Base64 encode for a cleaner code
  return btoa(codeContent);
}

/**
 * Copies a shareable code to clipboard
 * @param selectedItems - Array of selected items
 * @param mode - The selected game mode
 * @param toast - Toast function to show notifications
 * @returns void
 */
export function copyShareableCode(
  selectedItems: (SimplifiedItem | null)[],
  mode: GameMode,
): void {
  const code = generateShareableCode(selectedItems, mode);

  if (!code) {
    sonnerToast("No Items Selected", {
      description: "Please select at least one item to share.",
    });
    return;
  }

  // Copy to clipboard
  navigator.clipboard
    .writeText(code)
    .then(() => {
      const itemCount = selectedItems.filter((item) => item !== null).length;
      sonnerToast("Code Copied!", {
        description: `Shareable code copied to clipboard. ${itemCount} item${
          itemCount > 1 ? "s" : ""
        } included.`,
      });
    })
    .catch((err) => {
      console.error("Failed to copy code:", err);
      sonnerToast("Failed to Copy Code", {
        description: "Please try again or manually copy the code.",
      });
    });
}

/**
 * Validates if a string is a valid Base64 encoded string
 * @param str - The string to validate
 * @returns boolean - Whether the string is valid Base64
 */
function isValidBase64(str: string): boolean {
  // Check if the string matches the Base64 pattern
  // This regex checks for valid Base64 characters and proper padding
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str);
}

/**
 * Parses a shareable code and returns the item IDs and game mode
 * @param code - The shareable code
 * @returns Object containing item IDs and game mode
 */
export function parseShareableCode(code: string): {
  itemIds: string[];
  gameMode: GameMode | null;
  error?: string;
} {
  // First validate if the code is a valid Base64 string
  if (!isValidBase64(code)) {
    return { itemIds: [], gameMode: null, error: "Invalid code format" };
  }

  try {
    // Decode the base64 string
    const decodedContent = atob(code);

    // Check if the decoded content has the expected format (using colon as separator)
    if (!decodedContent.includes(":")) {
      return { itemIds: [], gameMode: null, error: "Invalid code structure" };
    }

    // Split the content by the separator
    const [modeCode, itemsString] = decodedContent.split(":");

    // Validate game mode (only support shortened format)
    const gameMode = SHARE_CODE_MODES[modeCode] ?? null;

    if (gameMode === null) {
      return { itemIds: [], gameMode: null, error: "Invalid game mode" };
    }

    // Parse item IDs
    const itemIds = itemsString ? itemsString.split(",") : [];

    return { itemIds, gameMode };
  } catch {
    return { itemIds: [], gameMode: null, error: "Failed to parse code" };
  }
}

export function resolveSharedItems(
  itemIds: string[],
  rawItemsData: SimplifiedItem[],
): (SimplifiedItem | null)[] {
  const selectedItems: (SimplifiedItem | null)[] = Array(5).fill(null);

  itemIds.slice(0, 5).forEach((shortId, index) => {
    const item = rawItemsData.find((candidate) =>
      candidate.id.startsWith(shortId),
    );
    if (!item) return;

    selectedItems[index] = {
      ...item,
      basePrice: typeof item.basePrice === "number" ? item.basePrice : 0,
      lastLowPrice:
        typeof item.lastLowPrice === "number" ? item.lastLowPrice : 0,
    };
  });

  return selectedItems;
}

/**
 * Loads items from a shareable code
 * @param code - The shareable code
 * @param rawItemsData - Array of all available items
 * @param toast - Toast function to show notifications
 * @returns Object containing selected items and game mode
 */
export function loadItemsFromCode(
  code: string,
  rawItemsData: SimplifiedItem[],
): { items: (SimplifiedItem | null)[] | null; gameMode: GameMode | null } {
  if (!code || !rawItemsData || rawItemsData.length === 0) {
    return { items: null, gameMode: null };
  }

  // Parse the code
  const { itemIds, gameMode, error } = parseShareableCode(code);

  // Handle parsing errors
  if (error) {
    sonnerToast("Invalid Code", {
      description: "The code format is invalid. Please check and try again.",
    });
    return { items: null, gameMode: null };
  }

  // Check if we have any items
  if (itemIds.length === 0) {
    sonnerToast("Invalid Code", {
      description: "The provided code doesn't contain any items.",
    });
    return { items: null, gameMode };
  }

  try {
    const newSelectedItems = resolveSharedItems(itemIds, rawItemsData);

    // Show toast notification about loaded items
    sonnerToast("Items Loaded", {
      description: "Items have been loaded from the shared code.",
    });

    return { items: newSelectedItems, gameMode };
  } catch {
    sonnerToast("Error Loading Items", {
      description: "There was a problem loading the items from the code.",
    });
    return { items: null, gameMode: null };
  }
}
