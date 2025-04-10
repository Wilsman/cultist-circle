import { SimplifiedItem } from "@/types/SimplifiedItem";

/**
 * Shortens an item ID to a minimal representation
 * This creates a very compact representation while maintaining uniqueness
 * @param id - The original item ID
 * @returns string - The shortened ID
 */
function shortenItemId(id: string): string {
  // Take just the first 6 characters of the ID
  // MongoDB ObjectIDs have enough entropy in the first 6 chars to avoid collisions
  return id.substring(0, 6);
}

/**
 * Generates a shareable code for the selected items
 * @param selectedItems - Array of selected items
 * @param isPVE - Whether the game mode is PVE
 * @returns string - The shareable code
 */
export function generateShareableCode(
  selectedItems: (SimplifiedItem | null)[],
  isPVE: boolean
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
  const gameMode = isPVE ? "p" : "v";
  const codeContent = `${gameMode}:${shortIds.join(",")}`;  // Using : as separator to save 1 byte

  // Base64 encode for a cleaner code
  return btoa(codeContent);
}

/**
 * Copies a shareable code to clipboard
 * @param selectedItems - Array of selected items
 * @param isPVE - Whether the game mode is PVE
 * @param toast - Toast function to show notifications
 * @returns void
 */
export function copyShareableCode(
  selectedItems: (SimplifiedItem | null)[],
  isPVE: boolean,
  toast: (props: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }) => void
): void {
  const code = generateShareableCode(selectedItems, isPVE);

  if (!code) {
    toast({
      title: "No Items Selected",
      description: "Please select at least one item to share.",
      variant: "destructive",
    });
    return;
  }

  // Copy to clipboard
  navigator.clipboard
    .writeText(code)
    .then(() => {
      const itemCount = selectedItems.filter((item) => item !== null).length;
      toast({
        title: "Code Copied!",
        description: `Shareable code copied to clipboard. ${itemCount} item${
          itemCount > 1 ? "s" : ""
        } included.`,
        variant: "default",
      });
    })
    .catch((err) => {
      console.error("Failed to copy code:", err);
      toast({
        title: "Failed to Copy Code",
        description: "Please try again or manually copy the code.",
        variant: "destructive",
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
  isPVE: boolean | null;
  error?: string;
} {
  // First validate if the code is a valid Base64 string
  if (!isValidBase64(code)) {
    return { itemIds: [], isPVE: null, error: "Invalid code format" };
  }

  try {
    // Decode the base64 string
    const decodedContent = atob(code);

    // Check if the decoded content has the expected format (using colon as separator)
    if (!decodedContent.includes(":")) {
      return { itemIds: [], isPVE: null, error: "Invalid code structure" };
    }

    // Split the content by the separator
    const [gameMode, itemsString] = decodedContent.split(":");

    // Validate game mode (only support shortened format)
    const isPVE = gameMode === "p" ? true : gameMode === "v" ? false : null;
    
    if (isPVE === null) {
      return { itemIds: [], isPVE: null, error: "Invalid game mode" };
    }

    // Parse item IDs
    const itemIds = itemsString ? itemsString.split(",") : [];

    return { itemIds, isPVE };
  } catch (error) {
    return { itemIds: [], isPVE: null, error: "Failed to parse code" };
  }
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
  toast: (props: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }) => void
): { items: (SimplifiedItem | null)[] | null; isPVE: boolean | null } {
  if (!code || !rawItemsData || rawItemsData.length === 0) {
    return { items: null, isPVE: null };
  }

  // Parse the code
  const { itemIds, isPVE, error } = parseShareableCode(code);

  // Handle parsing errors
  if (error) {
    toast({
      title: "Invalid Code",
      description: "The code format is invalid. Please check and try again.",
      variant: "destructive",
    });
    return { items: null, isPVE: null };
  }

  // Check if we have any items
  if (itemIds.length === 0) {
    toast({
      title: "Invalid Code",
      description: "The provided code doesn't contain any items.",
      variant: "destructive",
    });
    return { items: null, isPVE };
  }

  try {
    // Create an array of 5 null items
    const newSelectedItems = Array(5).fill(null);

    // Find items by ID and populate the selection
    itemIds.forEach((shortId: string, index: number) => {
      if (index < 5) {
        // Match items by the shortened ID prefix
        const item = rawItemsData.find((item) => 
          item.id.startsWith(shortId) // Shortened ID match
        );

        // Validate the item has all required properties before adding it
        if (item && typeof item === "object") {
          // Ensure item has all required properties with valid values
          const validItem = {
            ...item,
            basePrice: typeof item.basePrice === "number" ? item.basePrice : 0,
            lastLowPrice:
              typeof item.lastLowPrice === "number" ? item.lastLowPrice : 0,
          };

          newSelectedItems[index] = validItem;
        }
      }
    });

    // Show toast notification about loaded items
    toast({
      title: "Items Loaded",
      description: "Items have been loaded from the shared code.",
      variant: "default",
    });

    return { items: newSelectedItems, isPVE };
  } catch (error) {
    toast({
      title: "Error Loading Items",
      description: "There was a problem loading the items from the code.",
      variant: "destructive",
    });
    return { items: null, isPVE: null };
  }
}
