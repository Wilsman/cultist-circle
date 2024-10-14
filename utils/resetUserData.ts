import { SimplifiedItem } from "@/types/SimplifiedItem";

export async function resetUserData(
  setSelectedItems: React.Dispatch<React.SetStateAction<Array<SimplifiedItem | null>>>,
  setPinnedItems: React.Dispatch<React.SetStateAction<boolean[]>>,
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>,
  setSortOption: React.Dispatch<React.SetStateAction<string>>,
  setThreshold: React.Dispatch<React.SetStateAction<number>>,
  setExcludedItems: React.Dispatch<React.SetStateAction<Set<string>>>,
  setOverriddenPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  fetchData: () => Promise<void>,
  defaultItemCategories: string[],
  toast: (props: { title: string; description: string }) => void
) {
  // Clear local storage
  localStorage.clear();

  // Clear cookies via API route
  try {
    const response = await fetch('/api/expire-cookies');
    if (response.ok) {
      console.log('Cookies cleared successfully');
    } else {
      console.error('Failed to clear cookies');
    }
  } catch (error) {
    console.error('Error clearing cookies:', error);
  }

  // Reset all state variables
  setSelectedItems(Array(5).fill(null));
  setPinnedItems(Array(5).fill(false));
  setSelectedCategories(defaultItemCategories);
  setSortOption("az");
  setThreshold(350001);
  setExcludedItems(new Set());
  setOverriddenPrices({});

  // Fetch fresh data
  await fetchData();

  // Show a toast notification
  toast({
    title: "Reset Successful",
    description: "All settings have been reset and data has been cleared.",
  });
}
