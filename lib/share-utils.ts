import { SimplifiedItem } from "@/types/SimplifiedItem";

/**
 * Generates a shareable link for the selected items and copies it to clipboard
 * @param selectedItems - Array of selected items
 * @param isPVE - Whether the game mode is PVE
 * @param toast - Toast function to show notifications
 * @returns void
 */
export function generateShareableLink(
  selectedItems: (SimplifiedItem | null)[],
  isPVE: boolean,
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void
): void {
  // Filter out null items and get their IDs
  const itemIds = selectedItems
    .filter((item): item is SimplifiedItem => item !== null)
    .map(item => item.id);
  
  if (itemIds.length === 0) {
    toast({
      title: "No Items Selected",
      description: "Please select at least one item to share.",
      variant: "destructive",
    });
    return;
  }
  
  // Create URL with item IDs and game mode
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?items=${itemIds.join(',')}&mode=${isPVE ? 'pve' : 'pvp'}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl)
    .then(() => {
      toast({
        title: "Link Copied!",
        description: `Shareable link copied to clipboard. ${itemIds.length} item${itemIds.length > 1 ? 's' : ''} included.`,
        variant: "default",
      });
    })
    .catch(err => {
      console.error("Failed to copy link:", err);
      toast({
        title: "Failed to Copy Link",
        description: "Please try again or manually copy the URL.",
        variant: "destructive",
      });
    });
}

/**
 * Loads shared items from URL parameters
 * @param rawItemsData - Array of all available items
 * @param toast - Toast function to show notifications
 * @returns Object containing selected items and game mode
 */
export function loadSharedItemsFromUrl(
  rawItemsData: SimplifiedItem[],
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void
): { items: (SimplifiedItem | null)[] | null; isPVE: boolean | null } {
  if (typeof window === 'undefined' || !rawItemsData || rawItemsData.length === 0) {
    return { items: null, isPVE: null };
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const sharedItems = urlParams.get('items');
  const gameMode = urlParams.get('mode');
  
  // Determine game mode from URL parameter
  const isPVE = gameMode === 'pve' ? true : gameMode === 'pvp' ? false : null;
  
  if (!sharedItems) {
    return { items: null, isPVE };
  }
  
  try {
    const itemIds = sharedItems.split(',');
    const newSelectedItems = Array(5).fill(null);
    
    // Find items by ID and populate the selection
    itemIds.forEach((id: string, index: number) => {
      if (index < 5) {
        const item = rawItemsData.find(item => item.id === id);
        
        // Validate the item has all required properties before adding it
        if (item && typeof item === 'object') {
          // Ensure item has all required properties with valid values
          const validItem = {
            ...item,
            basePrice: typeof item.basePrice === 'number' ? item.basePrice : 0,
            lastLowPrice: typeof item.lastLowPrice === 'number' ? item.lastLowPrice : 0
          };
          
          newSelectedItems[index] = validItem;
        }
      }
    });
    
    // Show toast notification about shared items
    toast({
      title: "Shared Items Loaded",
      description: "Items have been loaded from a shared link.",
      variant: "default",
    });
    
    // We'll let the app component handle URL cleanup after items are fully loaded
    // This ensures all data including prices are properly loaded before URL cleanup
    
    return { items: newSelectedItems, isPVE };
  } catch (error) {
    console.error("Error loading shared items:", error);
    toast({
      title: "Error Loading Shared Items",
      description: "There was a problem loading the shared items.",
      variant: "destructive",
    });
    return { items: null, isPVE: null };
  }
}
