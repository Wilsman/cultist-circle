import React from "react";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import {
  DEFAULT_PLAYER_LEVEL,
  DEFAULT_USE_LEVEL_FILTER,
} from "@/config/flea-level-requirements";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { toast as sonnerToast } from "sonner";
import { DEFAULT_TRADER_LEVELS } from "@/components/ui/trader-level-selector";

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
  setIsPVE: React.Dispatch<React.SetStateAction<boolean>>,
  fetchData: () => Promise<void>,
  defaultItemCategories: Set<string>,
  setUseLevelFilter?: React.Dispatch<React.SetStateAction<boolean>>,
  setPlayerLevel?: React.Dispatch<React.SetStateAction<number>>,
  setFleaPriceType?: React.Dispatch<
    React.SetStateAction<"lastLowPrice" | "avg24hPrice">
  >,
  setPriceMode?: React.Dispatch<React.SetStateAction<"flea" | "trader">>,
  setTraderLevels?: React.Dispatch<
    React.SetStateAction<typeof DEFAULT_TRADER_LEVELS>
  >,
  setUseLastOfferCountFilter?: React.Dispatch<React.SetStateAction<boolean>>,
  setExcludeIncompatible?: React.Dispatch<React.SetStateAction<boolean>>
) {
  // Clear local storage
  localStorage.clear();

  // Clear non-authentication cookies via API route (only works in production)
  try {
    const response = await fetch("/api/expire-cookies");
    if (response.ok) {
      console.log(
        "Cookies cleared successfully (preserving authentication cookies)"
      );
    } else {
      console.log(
        "API route not available - using client-side cookie clearing only"
      );
    }
  } catch {
    // Expected in development - API routes only work in production with Cloudflare Workers
    console.log(
      "Development mode - API routes not available, using client-side clearing only"
    );
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
  setIsPVE(false);

  // Reset additional settings if setters are provided
  setUseLevelFilter?.(DEFAULT_USE_LEVEL_FILTER);
  setPlayerLevel?.(DEFAULT_PLAYER_LEVEL);
  setFleaPriceType?.("lastLowPrice");
  setPriceMode?.("flea");
  setTraderLevels?.(DEFAULT_TRADER_LEVELS);
  setUseLastOfferCountFilter?.(false);
  setExcludeIncompatible?.(true);

  // Fetch fresh data
  await fetchData();

  // Show a toast notification
  sonnerToast("Reset Successful", {
    description: "All settings have been reset and data has been cleared.",
  });
}
