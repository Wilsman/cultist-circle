import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { SimplifiedItem } from "@/types/SimplifiedItem";

export async function resetUserData(
  setSelectedItems: React.Dispatch<
    React.SetStateAction<Array<SimplifiedItem | null>>
  >,
  setPinnedItems: React.Dispatch<React.SetStateAction<boolean[]>>,
  setExcludedCategories: React.Dispatch<React.SetStateAction<Set<string>>>,
  setSortOption: React.Dispatch<React.SetStateAction<string>>,
  setThreshold: React.Dispatch<React.SetStateAction<number>>,
  setExcludedItems: React.Dispatch<React.SetStateAction<Set<string>>>,
  setOverriddenPrices: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >,
  fetchData: () => Promise<void>,
  defaultItemCategories: Set<string>,
  toast: (props: { title: string; description: string }) => void
) {
  // Clear local storage
  localStorage.clear();

  // Clear non-authentication cookies via API route
  try {
    const response = await fetch("/api/expire-cookies");
    if (response.ok) {
      console.log("Cookies cleared successfully (preserving authentication cookies)");
    } else {
      console.error("Failed to clear cookies");
    }
  } catch (error) {
    console.error("Error clearing cookies:", error);
  }

  //TODO: check this is not triggering twice
  // Reset all state variables
  setSelectedItems(Array(5).fill(null));
  setPinnedItems(Array(5).fill(false));
  setExcludedCategories(defaultItemCategories);
  setExcludedItems(DEFAULT_EXCLUDED_ITEMS);
  setSortOption("az");
  setThreshold(400000);
  setOverriddenPrices({});

  // Fetch fresh data
  await fetchData();

  // Show a toast notification
  toast({
    title: "Reset Successful",
    description: "All settings have been reset and data has been cleared.",
  });
}
