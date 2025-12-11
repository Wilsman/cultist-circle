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
  ArrowUp,
  ArrowDown,
  Loader2,
  Star,
  Download,
  CircleAlert,
  Info,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    | "traderSellPrice"
    | "traderBuyPrice"
    | "buyLimit"
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

  // Multiplier Tester state (dev tool)
  const [testerWeaponSum, setTesterWeaponSum] = useState<number>(0);
  const [testerOtherSum, setTesterOtherSum] = useState<number>(0);
  const [testerOutcome, setTesterOutcome] = useState<"6h" | "14h" | "12h">("6h");
  const [testerK, setTesterK] = useState<number>(2);
  const [showTester, setShowTester] = useState<boolean>(false);
  // Weapon combobox removed; use main table search to find base prices.
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [singleBasePrice, setSingleBasePrice] = useState<number>(0);

  useEffect(() => {
    // If a single base price is entered, auto-compute the weapon sum using quantity
    if (singleBasePrice > 0) {
      setTesterWeaponSum(singleBasePrice * Math.min(5, Math.max(1, selectedQty || 1)));
      setTesterOtherSum(0);
    }
  }, [singleBasePrice, selectedQty]);

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
        | "traderSellPrice"
        | "traderBuyPrice"
        | "buyLimit"
        | "bestValue"
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
      "Buy from Trader Name",
      "Buy from Trader Level",
      "Buy Limit",
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

        // Find best buy offer (lowest price, excluding flea market)
        const validBuyOffers = item.buyFor?.filter(
          (offer) =>
            offer.vendor?.normalizedName !== "flea-market" &&
            offer.priceRUB != null
        ) || [];

        const bestBuyOffer = validBuyOffers.length > 0
          ? validBuyOffers.reduce((prev, curr) =>
              (prev.priceRUB || Infinity) < (curr.priceRUB || Infinity) ? prev : curr
            )
          : null;

        const bestBuyPrice = bestBuyOffer ? bestBuyOffer.priceRUB : 0;
        const bestBuyTraderName = bestBuyOffer?.vendor?.normalizedName || "";
        const bestBuyTraderLevel = bestBuyOffer?.vendor?.minTraderLevel || "";
        const bestBuyLimit = bestBuyOffer?.vendor?.buyLimit;

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
          `"${bestBuyTraderName.replace(/"/g, '""')}"`,
          bestBuyTraderLevel,
          bestBuyLimit === undefined ? 'N/A' : (bestBuyLimit === null ? '∞' : bestBuyLimit),
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
      // Precompute best trader sell prices if we're sorting by traderSellPrice
      const bestSellPrices =
        filter.sort === "traderSellPrice"
          ? new Map<string, number>(
              filteredItems.map((item) => {
                let bestPrice = 0;
                if (item.sellFor?.length) {
                  for (const offer of item.sellFor) {
                    if (
                      offer?.vendor?.normalizedName &&
                      offer.vendor.normalizedName.toLowerCase() !== "flea-market" &&
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

      // Precompute best buy prices if we're sorting by traderBuyPrice or buyLimit
      const bestBuyPrices =
        filter.sort === "traderBuyPrice" || filter.sort === "buyLimit"
          ? new Map<string, { price: number; limit: number }>(
              filteredItems.map((item) => {
                let bestPrice = 0;
                let buyLimit = 0;
                if (item.buyFor?.length) {
                  for (const offer of item.buyFor) {
                    if (
                      offer?.vendor?.normalizedName &&
                      offer.vendor.normalizedName.toLowerCase() !== "flea-market" &&
                      offer.priceRUB &&
                      (offer.priceRUB < bestPrice || bestPrice === 0)
                    ) {
                      bestPrice = offer.priceRUB;
                      buyLimit = offer.vendor.buyLimit || 0;
                    }
                  }
                }
                return [item.id, { price: bestPrice, limit: buyLimit }];
              })
            )
          : null;

      // Handle header sorting (name, shortName, prices)
      filteredItems = [...filteredItems].sort((a, b) => {
        if (filter.sort === "traderSellPrice" && bestSellPrices) {
          const aPrice = bestSellPrices.get(a.id) || 0;
          const bPrice = bestSellPrices.get(b.id) || 0;
          return filter.sortDir === "desc" ? bPrice - aPrice : aPrice - bPrice;
        }
        if (filter.sort === "traderBuyPrice" && bestBuyPrices) {
          const aData = bestBuyPrices.get(a.id) || { price: 0 };
          const bData = bestBuyPrices.get(b.id) || { price: 0 };
          return filter.sortDir === "desc" 
            ? bData.price - aData.price 
            : aData.price - bData.price;
        }
        if (filter.sort === "buyLimit" && bestBuyPrices) {
          const aData = bestBuyPrices.get(a.id) || { limit: 0 };
          const bData = bestBuyPrices.get(b.id) || { limit: 0 };
          return filter.sortDir === "desc" 
            ? bData.limit - aData.limit 
            : aData.limit - bData.limit;
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto -mt-px">
      {/* Header Section */}
      <div className="mb-6 -mt-px">
        <h1 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-yellow-300 drop-shadow">
          Item Base Values
        </h1>
      </div>

      {/* Search Bar Row */}
      <div className="relative w-full sticky top-2 z-10 mb-4">
        <Input
          placeholder="Search items..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-11 w-full pl-11 bg-muted/40 border-border/60 focus:bg-background focus:border-primary/50 text-base shadow-sm transition-all rounded-xl"
          aria-label="Search items"
        />
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="h-5 w-5 opacity-50" />
        </div>
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
                        | "traderSellPrice"
                        | "traderBuyPrice"
                        | "buyLimit"
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
                  <SelectItem value="traderSellPrice">
                    Sell to Trader
                  </SelectItem>
                  <SelectItem value="traderBuyPrice">
                    Buy from Trader
                  </SelectItem>
                  <SelectItem value="buyLimit">Buy Limit</SelectItem>
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

      {/* Multiplier Tester (Dev Tool) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Multiplier Tester (Weapons)</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowTester((v) => !v)}
            className="h-8"
            aria-expanded={showTester}
            aria-controls="multiplier-tester"
          >
            {showTester ? "Hide tester" : "Show tester"}
          </Button>
        </div>
        {!showTester ? (
          <div className="text-xs text-muted-foreground border rounded-md p-3">
            Experimental tool for weapon value discrepancies. Click &quot;Show
            tester&quot; to open.
          </div>
        ) : null}
        {showTester && (
          <>
            <div
              id="multiplier-tester"
              className="mt-2 rounded-lg border bg-muted/20 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Quickly infer k from outcomes
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                Use the main table&apos;s search box to find your weapon and
                read its base price. Enter totals below.
              </div>
            </div>
            {/* Quick calc: base price × quantity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Single weapon base price (RUB)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={Number.isFinite(singleBasePrice) ? singleBasePrice : 0}
                  onChange={(e) =>
                    setSingleBasePrice(Number(e.target.value) || 0)
                  }
                  placeholder="e.g. 40,000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Quantity (1–5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <Button
                      key={q}
                      type="button"
                      size="sm"
                      variant={selectedQty === q ? "default" : "outline"}
                      className="h-9 w-9 p-0"
                      onClick={() => setSelectedQty(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Computed weapon sum
                </label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-background/60 text-sm">
                  {testerWeaponSum.toLocaleString()} RUB
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Sum of weapon base values (RUB)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={Number.isFinite(testerWeaponSum) ? testerWeaponSum : 0}
                  onChange={(e) =>
                    setTesterWeaponSum(Number(e.target.value) || 0)
                  }
                  placeholder="e.g. 207740 for 5x MP5 Navy"
                />
              </div>
              {/* Non-weapon sum hidden for weapon-only testing, still editable if needed */}
              <div className="space-y-1 hidden">
                <label className="text-xs text-muted-foreground">
                  Sum of other items (non-weapons) (RUB)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={Number.isFinite(testerOtherSum) ? testerOtherSum : 0}
                  onChange={(e) =>
                    setTesterOtherSum(Number(e.target.value) || 0)
                  }
                  placeholder="0 if only weapons"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Observed outcome
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={testerOutcome === "6h" ? "default" : "outline"}
                    onClick={() => setTesterOutcome("6h")}
                    className="h-9"
                  >
                    6h
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={testerOutcome === "14h" ? "default" : "outline"}
                    onClick={() => setTesterOutcome("14h")}
                    className="h-9"
                  >
                    14h
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={testerOutcome === "12h" ? "default" : "outline"}
                    onClick={() => setTesterOutcome("12h")}
                    className="h-9"
                  >
                    12h
                  </Button>
                </div>
              </div>
            </div>

            {(() => {
              const sumW = Math.max(0, testerWeaponSum || 0);
              const sumO = Math.max(0, testerOtherSum || 0);
              const sixH = 400_000;
              const fourteenH = 350_000;
              const twelveHMin = 200_000;
              const kFor6h = sumW > 0 ? (sixH - sumO) / sumW : NaN;
              const kMin14 = sumW > 0 ? (fourteenH - sumO) / sumW : NaN;
              const kMax14 = sumW > 0 ? (sixH - sumO) / sumW : NaN;
              const kMin12 = sumW > 0 ? (twelveHMin - sumO) / sumW : NaN;
              const kMax12 = sumW > 0 ? (fourteenH - sumO) / sumW : NaN;

              // Prediction for a candidate k
              const kCandidate = Number.isFinite(testerK) ? testerK : 0;
              const predictedTotal = sumO + sumW * Math.max(0, kCandidate);
              const predictedOutcome =
                predictedTotal >= sixH
                  ? "6h"
                  : predictedTotal >= fourteenH
                  ? "14h"
                  : predictedTotal >= twelveHMin
                  ? "12h"
                  : "<12h";
              const predictedBand = (() => {
                if (predictedTotal >= sixH) return "6h (≥ 400,000)";
                if (predictedTotal >= fourteenH)
                  return "14h [350,000, 400,000)";
                if (predictedTotal >= twelveHMin)
                  return "12h [200,000, 350,000)";
                if (predictedTotal >= 100_001) return "8h [100,001, 200,000)";
                if (predictedTotal >= 50_001) return "5h [50,001, 100,000)";
                if (predictedTotal >= 25_001) return "4h [25,001, 50,000)";
                if (predictedTotal >= 10_001) return "3h [10,001, 25,000)";
                return "2h [0, 10,000]";
              })();

              return (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md border p-3 bg-background/60">
                    <div className="text-xs text-muted-foreground mb-1">
                      Implied multiplier
                    </div>
                    {testerOutcome === "6h" ? (
                      <div className="text-sm">
                        <div>
                          k ≈{" "}
                          <span className="font-semibold">
                            {Number.isFinite(kFor6h) ? kFor6h.toFixed(3) : "—"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Based on effective ≥ 400,000
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              Number.isFinite(kFor6h) &&
                              setTesterK(Number(kFor6h.toFixed(3)))
                            }
                          >
                            Use suggested k
                          </Button>
                        </div>
                      </div>
                    ) : testerOutcome === "14h" ? (
                      <div className="text-sm">
                        <div>
                          k ∈ [
                          <span className="font-semibold">
                            {Number.isFinite(kMin14) ? kMin14.toFixed(3) : "—"}
                          </span>
                          ,
                          <span className="font-semibold">
                            {Number.isFinite(kMax14) ? kMax14.toFixed(3) : "—"}
                          </span>
                          )
                        </div>
                        <div className="text-xs text-muted-foreground">
                          14h implies total in [350k, 400k)
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const mid = (kMin14 + kMax14) / 2;
                              if (Number.isFinite(mid))
                                setTesterK(Number(mid.toFixed(3)));
                            }}
                          >
                            Use suggested k (midpoint)
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <div>
                          k ∈ [
                          <span className="font-semibold">
                            {Number.isFinite(kMin12) ? kMin12.toFixed(3) : "—"}
                          </span>
                          ,
                          <span className="font-semibold">
                            {Number.isFinite(kMax12) ? kMax12.toFixed(3) : "—"}
                          </span>
                          )
                        </div>
                        <div className="text-xs text-muted-foreground">
                          12h implies total in [200k, 350k)
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const mid = (kMin12 + kMax12) / 2;
                              if (Number.isFinite(mid))
                                setTesterK(Number(mid.toFixed(3)));
                            }}
                          >
                            Use suggested k (midpoint)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border p-3 bg-background/60">
                    <div className="text-xs text-muted-foreground mb-1">
                      Try a candidate k
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        value={Number.isFinite(testerK) ? testerK : 0}
                        onChange={(e) => setTesterK(Number(e.target.value))}
                        className="w-28 h-9"
                      />
                      <div className="text-xs text-muted-foreground">
                        Predicted total:
                      </div>
                      <div className="text-sm font-medium">
                        {predictedTotal.toLocaleString()}
                      </div>
                      <div className="ml-auto text-xs text-right">
                        <div>
                          Outcome:{" "}
                          <span className="font-semibold">
                            {predictedOutcome}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          Band: {predictedBand}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border p-3 bg-background/60 text-xs text-muted-foreground">
                    <div>Tips:</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Set non-weapon sum to 0 when testing only weapons.
                      </li>
                      <li>
                        Use 6h to get a single implied k. Use 14h to get bounds.
                      </li>
                      <li>
                        Repeat across trials; compare medians to stabilize k.
                      </li>
                    </ul>
                  </div>
                </div>
              );
            })()}
          </>
        )}
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
