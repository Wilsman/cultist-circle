// app/base-values/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { fetchMinimalTarkovData, MinimalItem } from "@/hooks/use-tarkov-api";
import { useDebounce } from "@/hooks/use-debounce";
import { useFavorites } from "@/hooks/use-favorites";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
// UI components
import { Input } from "@/components/ui/input";
import { VirtualizedTable } from "@/components/ui/virtualized-table";
// Removed unused Switch import
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Star,
  Download,
  CircleAlert,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { PriceRangeFilter } from "@/components/ui/price-range-filter";
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/components/ui/category-filter";

interface FilterState {
  name: string;
  shortName: string; // Keep shortName for potential filtering/sorting
  basePrice: [number, number];
  lastLowPrice: [number, number];
  avg24hPrice: [number, number];
  link: string;
  sort:
    | "name"
    | "shortName"
    | "basePrice"
    | "lastLowPrice"
    | "avg24hPrice"
    | "traderPrice"
    | "buyPrice"
    | "bestValue"; // Add name/shortName back
  sortDir: "asc" | "desc";
}

function getMinMax(
  items: MinimalItem[],
  key: keyof MinimalItem
): [number, number] {
  if (items.length === 0) {
    // Sensible fallback avoids Infinity/-Infinity propagation
    return [0, 0];
  }

  const nums = items.map((i) =>
    typeof i[key] === "number" ? (i[key] as number) : 0
  );
  return [Math.min(...nums), Math.max(...nums)];
}

export default function ItemsTablePage() {
  // Add isPending state for transitions
  const [isPending, startTransition] = useTransition();

  // Separate search input state from filter state
  const [searchInput, setSearchInput] = useState("");

  const [pvp, setPvp] = useState<MinimalItem[]>([]);
  const [pve, setPve] = useState<MinimalItem[]>([]);
  const [mode, setMode] = useState<"pvp" | "pve">("pvp");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({
    // Use full FilterState
    name: "",
    shortName: "", // Initialize shortName
    basePrice: [0, 0],
    lastLowPrice: [0, 0],
    avg24hPrice: [0, 0],
    link: "",
    sort: "basePrice", // Default sort
    sortDir: "desc",
  });

  // State for showing compatible items only
  const [showCompatibleOnly, setShowCompatibleOnly] = useState(false);

  // State for category filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // State for trader-only filtering
  const [showTraderOnly, setShowTraderOnly] = useState(false);

  // Initialize favorites functionality
  const {
    isFavorite,
    toggleFavorite,
    showOnlyFavorites,
    setShowOnlyFavorites,
    hasFavorites,
  } = useFavorites(mode);

  // Debounce the search input to prevent excessive re-renders
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Update filter when debounced search term changes
  useEffect(() => {
    startTransition(() => {
      setFilter((prev) => ({ ...prev, name: debouncedSearchTerm }));
    });
  }, [debouncedSearchTerm, startTransition]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchMinimalTarkovData().then(
      (data: { pvpItems: MinimalItem[]; pveItems: MinimalItem[] }) => {
        if (isMounted) {
          setPvp(data.pvpItems || []);
          setPve(data.pveItems || []);
          // Default to PVP min/max
          setFilter((f) => ({
            ...f,
            basePrice: getMinMax(data.pvpItems || [], "basePrice"),
            lastLowPrice: getMinMax(data.pvpItems || [], "lastLowPrice"),
            avg24hPrice: getMinMax(data.pvpItems || [], "avg24hPrice"),
          }));
          setIsLoading(false);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize the header sort handler to prevent recreating on each render
  const handleHeaderSort = useCallback(
    (
      sortKey:
        | "name"
        | "shortName"
        | "basePrice"
        | "lastLowPrice"
        | "avg24hPrice"
        | "traderPrice"
        | "buyPrice"
    ) => {
      // Use startTransition to mark UI updates as non-urgent
      startTransition(() => {
        setFilter((f) => ({
          ...f,
          sort: sortKey,
          // Toggle direction if same key, else default (asc for name/shortName, desc for prices)
          sortDir:
            f.sort === sortKey
              ? f.sortDir === "asc"
                ? "desc"
                : "asc"
              : sortKey === "name" || sortKey === "shortName"
              ? "asc"
              : "desc",
        }));
      });
    },
    [startTransition]
  );

  // Export to Excel function
  const exportToExcel = (items: MinimalItem[]) => {
    if (items.length === 0) {
      return;
    }

    // Create CSV content
    const headers = [
      "Name",
      "Short Name",
      "Categories",
      "Base Price",
      "Last Low Price",
      "Average 24h Price",
      "Sell to Trader",
      "Buy from Trader",
      "Link",
    ];

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...items.map((item) => {
        // Calculate best trader price
        const bestTraderPrice =
          item.sellFor?.length > 0
            ? Math.max(
                ...item.sellFor
                  .filter(
                    (seller) =>
                      seller?.vendor?.normalizedName !== "flea-market" &&
                      seller?.priceRUB != null
                  )
                  .map((seller) => seller.priceRUB || 0)
              )
            : 0;

        // Calculate best buy price
        const bestBuyPrice =
          item.buyFor?.length > 0
            ? Math.min(
                ...item.buyFor
                  .filter(
                    (offer) =>
                      offer.vendor?.normalizedName !== "flea-market" &&
                      offer.priceRUB != null
                  )
                  .map((offer) => offer.priceRUB || Infinity)
              )
            : 0;

        // Escape categories properly
        const categories = item.categories?.map((c) => c.name).join(", ") || "";

        return [
          `"${(item.name || "").replace(/"/g, '""')}"`,
          `"${(item.shortName || "").replace(/"/g, '""')}"`,
          `"${categories.replace(/"/g, '""')}"`,
          item.basePrice || 0,
          item.lastLowPrice || 0,
          item.avg24hPrice || 0,
          bestTraderPrice,
          bestBuyPrice === Infinity ? 0 : bestBuyPrice,
          `"${(item.link || "").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cultist-circle-items-${mode}-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const items = useMemo(() => {
    const allItems = mode === "pvp" ? pvp : pve;

    // Filter by favorites if enabled
    if (showOnlyFavorites) {
      return allItems.filter((item) => isFavorite(item.id));
    }

    let filtered = allItems;

    // Apply compatibility filter
    if (showCompatibleOnly) {
      filtered = filtered.filter((item) => {
        const isExcluded = DEFAULT_EXCLUDED_ITEMS.has(item.id);
        const hasValidPrice = item.basePrice > 0;
        return !isExcluded && hasValidPrice;
      });
    }

    // Apply trader-only filter
    if (showTraderOnly) {
      filtered = filtered.filter((item) => {
        if (!item.buyFor || item.buyFor.length === 0) return false;

        // Match the exact logic from VirtualizedTable component
        const bestBuyPrice = item.buyFor
          .filter(
            (offer) =>
              offer?.vendor?.normalizedName !== "flea-market" &&
              offer?.priceRUB != null
          )
          .reduce<(typeof item.buyFor)[0] | null>((prev, curr) => {
            if (!prev) return curr;
            if (!curr?.priceRUB) return prev;
            return (prev?.priceRUB ?? 0) < curr.priceRUB ? prev : curr;
          }, null);

        return bestBuyPrice !== null;
      });
    }

    return filtered;
  }, [
    mode,
    pvp,
    pve,
    showOnlyFavorites,
    isFavorite,
    showCompatibleOnly,
    showTraderOnly,
  ]);

  // Memoize unique categories from all items
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    items.forEach((item) => {
      if (item.categories && Array.isArray(item.categories)) {
        item.categories.forEach((category) => {
          if (category && category.name) {
            categorySet.add(category.name);
          }
        });
      }
    });
    return Array.from(categorySet).sort();
  }, [items]);
  const filtered = useMemo(() => {
    // Use debounced search term instead of directly using filter.name
    const q = debouncedSearchTerm.trim().toLowerCase();

    // Only filter if we have items and either search term or price filters
    if (!items.length) return [];

    let filteredItems = items;

    // Only apply name filter if search term exists
    if (q) {
      const searchTerms = q.split(/\s+/).filter((term) => term.length > 0);

      filteredItems = filteredItems.filter((item) => {
        const lowerName = item.name.toLowerCase();
        const lowerShortName = item.shortName.toLowerCase();

        // Check if all search terms appear in either name or shortName
        return searchTerms.every(
          (term) => lowerName.includes(term) || lowerShortName.includes(term)
        );
      });
    }

    // Apply price filters
    filteredItems = filteredItems.filter(
      (item) =>
        item.basePrice >= filter.basePrice[0] &&
        item.basePrice <= filter.basePrice[1] &&
        (typeof item.lastLowPrice !== "number" ||
          (item.lastLowPrice >= filter.lastLowPrice[0] &&
            item.lastLowPrice <= filter.lastLowPrice[1])) &&
        (typeof item.avg24hPrice !== "number" ||
          (item.avg24hPrice >= filter.avg24hPrice[0] &&
            item.avg24hPrice <= filter.avg24hPrice[1]))
    );

    if (selectedCategory && selectedCategory !== "All Categories") {
      filteredItems = filteredItems.filter((item) =>
        item.categories?.some((category) => category.name === selectedCategory)
      );
    }

    if (filter.sort === "bestValue") {
      filteredItems = [...filteredItems].sort((a, b) => {
        const aVal =
          a.lastLowPrice && a.basePrice ? a.basePrice / a.lastLowPrice : 0;
        const bVal =
          b.lastLowPrice && b.basePrice ? b.basePrice / b.lastLowPrice : 0;
        return filter.sortDir === "desc" ? bVal - aVal : aVal - bVal; // Best value is always desc
      });
    } else {
      // Precompute best trader prices if we're sorting by traderPrice
      const bestPrices =
        filter.sort === "traderPrice"
          ? new Map<string, number>(
              filteredItems.map((item) => {
                let bestPrice = 0;
                if (item.sellFor?.length) {
                  for (const offer of item.sellFor) {
                    if (
                      offer?.vendor?.normalizedName &&
                      offer.vendor.normalizedName.toLowerCase() !==
                        "flea-market" &&
                      offer.priceRUB &&
                      offer.priceRUB > bestPrice
                    ) {
                      bestPrice = offer.priceRUB;
                    }
                  }
                }
                return [item.id, bestPrice];
              })
            )
          : null;

      // Precompute best buy prices if we're sorting by buyPrice
      const bestBuyPrices =
        filter.sort === "buyPrice"
          ? new Map<string, number>(
              filteredItems.map((item) => {
                let bestPrice = 0;
                if (item.buyFor?.length) {
                  for (const offer of item.buyFor) {
                    if (
                      (offer?.vendor?.normalizedName &&
                        offer.vendor.normalizedName.toLowerCase() !==
                          "flea-market" &&
                        offer.priceRUB &&
                        offer.priceRUB < bestPrice) ||
                      bestPrice === 0
                    ) {
                      bestPrice = offer.priceRUB;
                    }
                  }
                }
                return [item.id, bestPrice];
              })
            )
          : null;

      // Handle header sorting (name, shortName, prices)
      filteredItems = [...filteredItems].sort((a, b) => {
        if (filter.sort === "traderPrice" && bestPrices) {
          const aPrice = bestPrices.get(a.id) || 0;
          const bPrice = bestPrices.get(b.id) || 0;
          return filter.sortDir === "desc" ? bPrice - aPrice : aPrice - bPrice;
        }
        if (filter.sort === "buyPrice" && bestBuyPrices) {
          const aPrice = bestBuyPrices.get(a.id) || 0;
          const bPrice = bestBuyPrices.get(b.id) || 0;
          return filter.sortDir === "desc" ? bPrice - aPrice : aPrice - bPrice;
        }
        const sortKey = filter.sort as
          | "name"
          | "shortName"
          | "basePrice"
          | "lastLowPrice"
          | "avg24hPrice"; // Include name/shortName
        const aVal =
          sortKey === "name" || sortKey === "shortName"
            ? (a[sortKey] as string).toLowerCase()
            : (a[sortKey] as number) || 0;
        const bVal =
          sortKey === "name" || sortKey === "shortName"
            ? (b[sortKey] as string).toLowerCase()
            : (b[sortKey] as number) || 0;

        if (aVal < bVal) return filter.sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return filter.sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filteredItems;
  }, [
    items,
    debouncedSearchTerm, // Use debounced search term instead of filter.name
    filter.sort,
    filter.sortDir,
    filter.basePrice,
    filter.lastLowPrice,
    filter.avg24hPrice,
    selectedCategory,
  ]); // Update dependencies

  // Create a skeleton table component for loading state
  const TableSkeleton = () => (
    <div className="rounded-md border overflow-hidden">
      {/* Header skeleton */}
      <div className="flex border-b">
        <div className="font-medium p-2 flex-1 min-w-[200px]">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="text-right font-semibold p-2 w-[120px]">
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        <div className="text-muted-foreground text-right p-2 w-[120px]">
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        <div className="text-muted-foreground text-right p-2 w-[120px]">
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        <div className="text-muted-foreground text-right p-2 w-[120px]">
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 10 }).map((_, index) => (
        <div className="flex border-b transition-colors" key={index}>
          <div className="px-4 py-2 font-medium flex-1 min-w-[200px]">
            <Skeleton className="h-4 w-[180px]" />
          </div>
          <div className="px-4 py-2 text-right font-semibold w-[120px]">
            <Skeleton className="h-4 w-[60px] ml-auto" />
          </div>
          <div className="px-4 py-2 text-muted-foreground text-right w-[120px]">
            <Skeleton className="h-4 w-[60px] ml-auto" />
          </div>
          <div className="px-4 py-2 text-muted-foreground text-right w-[120px]">
            <Skeleton className="h-4 w-[60px] ml-auto" />
          </div>
          <div className="px-4 py-2 text-muted-foreground text-right w-[120px]">
            <Skeleton className="h-4 w-[60px] ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      {/* Top bar with back button */}
      <div className="flex items-center gap-2 mb-6">
        <button
          className="p-2 text-white bg-muted hover:bg-muted-foreground rounded"
          onClick={() => window.location.assign("/")}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight ml-2">
          Item Base Values
        </h1>
      </div>
      {/* Header description */}
      <div className="mb-6">
        <p className="text-muted-foreground pb-2">
          Quickly view the base values for{" "}
          <span className="font-semibold">all items</span> from Escape From
          Tarkov
        </p>
        <ul className="text-muted-foreground list-disc list-inside">
          <li>Sort and filter items by various criteria</li>
          <li>Search by long or short name</li>
          <li>
            Adjust the base value range to find items within a specific price
          </li>
          <li>
            Switch between <span className="font-semibold">PVP</span> and{" "}
            <span className="font-semibold">PVE</span> to see base values per
            game mode
          </li>
        </ul>
      </div>

      <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <AlertDescription className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 flex-shrink-0 text-yellow-500" />
          Flea prices shown are estimates sourced from tarkov.dev and may not
          reflect real-time market values. These prices are the latest available
          from the API.
        </AlertDescription>
      </Alert>

      {/* Search Bar - Sticky Full width */}
      <div className="sticky top-2 z-10 bg-background/95 backdrop-blur-sm border-b mb-4 p-4">
        <Input
          placeholder="Search items by name or short name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-12 w-full max-w text-base bg-gray-700 animate-pulse" // make bg of text box more obvious
          aria-label="Search items"
        />
      </div>

      {/* Main Filter Controls */}
      <div className="space-y-4 mb-6">
        {/* Price Range Filter - Full width */}
        <div className="bg-muted/30 p-4 rounded-lg border">
          <PriceRangeFilter
            min={getMinMax(items, "basePrice")[0]}
            max={getMinMax(items, "basePrice")[1]}
            value={filter.basePrice}
            onChange={(value) => {
              startTransition(() => {
                setFilter((f) => ({ ...f, basePrice: value }));
              });
            }}
            onReset={() => {
              startTransition(() => {
                const [min, max] = getMinMax(items, "basePrice");
                setFilter((f) => ({ ...f, basePrice: [min, max] }));
              });
            }}
            label="Filter by Base Price"
            className="w-full"
          />
        </div>

        {/* Secondary Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left side - View Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-muted/30 rounded-md p-1">
              <span className="text-xs font-medium px-2 text-muted-foreground">
                Mode:
              </span>
              <Button
                variant={mode === "pvp" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    const newMode = "pvp";
                    setMode(newMode);
                    const newItems = pvp;
                    setFilter((f) => ({
                      ...f,
                      basePrice: getMinMax(newItems, "basePrice"),
                      lastLowPrice: getMinMax(newItems, "lastLowPrice"),
                      avg24hPrice: getMinMax(newItems, "avg24hPrice"),
                    }));
                  });
                }}
                className={`h-8 px-3 ${
                  mode === "pvp" ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                PVP
              </Button>
              <Button
                variant={mode === "pve" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    const newMode = "pve";
                    setMode(newMode);
                    const newItems = pve;
                    setFilter((f) => ({
                      ...f,
                      basePrice: getMinMax(newItems, "basePrice"),
                      lastLowPrice: getMinMax(newItems, "lastLowPrice"),
                      avg24hPrice: getMinMax(newItems, "avg24hPrice"),
                    }));
                  });
                }}
                className={`h-8 px-3 ${
                  mode === "pve" ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                PVE
              </Button>
            </div>

            {/* Favorites Toggle */}
            <Toggle
              variant="outline"
              aria-label="Show only favorites"
              pressed={showOnlyFavorites}
              onPressedChange={(pressed) => {
                startTransition(() => {
                  setShowOnlyFavorites(pressed);
                });
              }}
              disabled={!hasFavorites}
              className="h-8 px-3 border-muted-foreground/30"
            >
              <Star
                className={`h-4 w-4 mr-2 ${
                  showOnlyFavorites
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-xs font-medium">Favorites</span>
            </Toggle>

            {/* Compatible Items Toggle */}
            <div className="flex items-center space-x-2">
              <Toggle
                pressed={showCompatibleOnly}
                onPressedChange={setShowCompatibleOnly}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <span className="text-xs">Compatible Only</span>
              </Toggle>
            </div>

            {/* Trader Only Toggle */}
            <div className="flex items-center space-x-2">
              <Toggle
                pressed={showTraderOnly}
                onPressedChange={setShowTraderOnly}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <span className="text-xs">Trader Only</span>
              </Toggle>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Sort by:
              </span>
              <Select
                value={filter.sort}
                onValueChange={(value) => {
                  startTransition(() => {
                    setFilter((f) => ({
                      ...f,
                      sort: value as
                        | "name"
                        | "shortName"
                        | "basePrice"
                        | "lastLowPrice"
                        | "avg24hPrice"
                        | "traderPrice"
                        | "buyPrice"
                        | "bestValue",
                      sortDir:
                        value === "name" || value === "shortName"
                          ? "asc"
                          : "desc",
                    }));
                  });
                }}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basePrice">Base Price</SelectItem>
                  <SelectItem value="lastLowPrice">Last Low Price</SelectItem>
                  <SelectItem value="avg24hPrice">24h Avg Price</SelectItem>
                  <SelectItem value="traderPrice">Sell to Trader</SelectItem>
                  <SelectItem value="buyPrice">Buy from Trader</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="shortName">Short Name</SelectItem>
                  <SelectItem value="bestValue">Best Value</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  startTransition(() => {
                    setFilter((f) => ({
                      ...f,
                      sortDir: f.sortDir === "asc" ? "desc" : "asc",
                    }));
                  });
                }}
              >
                {filter.sortDir === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Export Button */}
            <Button
              onClick={() => exportToExcel(filtered)}
              variant="outline"
              size="sm"
              className="h-8 gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table Section with loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center h-12 mt-2">
          <Loader2 className="animate-spin h-5 w-5 text-blue-500 mr-2" />
          <span className="text-sm text-muted-foreground">Updating...</span>
        </div>
      )}

      {/* No results messages */}
      {showOnlyFavorites && filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No favorite items</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {hasFavorites
              ? "No favorites match the current filters. Try adjusting your search or filters."
              : "You haven't added any items to your favorites yet. Click the star icon next to an item to add it to your favorites."}
          </p>
        </div>
      )}

      {showCompatibleOnly && filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <CircleAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No compatible items</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No items match the compatibility criteria with your current filters.
          </p>
        </div>
      )}

      {showTraderOnly && filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <CircleAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No trader items</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No items with trader buy prices match your current filters.
          </p>
        </div>
      )}

      {/* Virtualized Table with skeleton fallback during loading */}
      {!showOnlyFavorites || filtered.length > 0 ? (
        isLoading ? (
          <TableSkeleton />
        ) : (
          <VirtualizedTable
            items={filtered}
            sortKey={filter.sort}
            sortDir={filter.sortDir}
            onHeaderSort={handleHeaderSort}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        )
      ) : null}
    </div>
  );
}
