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
// UI components
import { Input } from "@/components/ui/input";
import { VirtualizedTable } from "@/components/ui/virtualized-table";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { PriceRangeFilter } from "@/components/ui/price-range-filter";

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

  const items = useMemo(() => {
    const allItems = mode === "pvp" ? pvp : pve;

    // Filter by favorites if enabled
    if (showOnlyFavorites) {
      return allItems.filter((item) => isFavorite(item.id));
    }

    return allItems;
  }, [mode, pvp, pve, showOnlyFavorites, isFavorite]);
  const filtered = useMemo(() => {
    // Use debounced search term instead of directly using filter.name
    const q = debouncedSearchTerm.trim().toLowerCase();

    // Only filter if we have items and either search term or price filters
    if (!items.length) return [];

    let filteredItems = items;

    // Only apply name filter if search term exists
    if (q) {
      filteredItems = filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.shortName.toLowerCase().includes(q)
      );
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

    if (filter.sort === "bestValue") {
      filteredItems = [...filteredItems].sort((a, b) => {
        const aVal =
          a.lastLowPrice && a.basePrice ? a.basePrice / a.lastLowPrice : 0;
        const bVal =
          b.lastLowPrice && b.basePrice ? b.basePrice / b.lastLowPrice : 0;
        return filter.sortDir === "desc" ? bVal - aVal : aVal - bVal; // Best value is always desc
      });
    } else {
      // Handle header sorting (name, shortName, prices)
      filteredItems = [...filteredItems].sort((a, b) => {
        if (filter.sort === "traderPrice") {
          // Safely find the best trader price (non-flea market) - highest price
          const getBestTraderPrice = (item: MinimalItem) => {
            if (!item.sellFor?.length) return 0;
            return item.sellFor.reduce((best, curr) => {
              if (!curr?.vendor?.normalizedName || curr.vendor.normalizedName === "Flea Market" || !curr.priceRUB) {
                return best;
              }
              // Find the highest price (best for selling)
              return curr.priceRUB > best ? curr.priceRUB : best;
            }, 0);
          };
          
          const aPrice = getBestTraderPrice(a);
          const bPrice = getBestTraderPrice(b);
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

      {/* Filter/Controls Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <Input
          placeholder="Search name or short name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 w-full md:w-[250px] lg:w-[300px]"
          // Add aria-label for accessibility
          aria-label="Search items"
        />
        <div className="w-full md:w-80">
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
            label="Base Price Range"
          />
        </div>
        {/* Favorites Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
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
              className="h-8 px-3"
            >
              <Star
                className={`h-4 w-4 mr-2 ${
                  showOnlyFavorites ? "fill-yellow-500 text-yellow-500" : ""
                }`}
              />
              <span className="text-xs">Favorites</span>
            </Toggle>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium">PVP</span>
          <Switch
            checked={mode === "pve"}
            onCheckedChange={(checked: boolean) => {
              startTransition(() => {
                const newMode = checked ? "pve" : "pvp";
                const newItems = checked ? pve : pvp;
                setMode(newMode);
                // Reset filters when mode changes (optional, but good practice)
                setFilter((f) => ({
                  ...f,
                  name: "",
                  basePrice: getMinMax(newItems, "basePrice"),
                  lastLowPrice: getMinMax(newItems, "lastLowPrice"),
                  avg24hPrice: getMinMax(newItems, "avg24hPrice"),
                  // Keep sort settings or reset? Resetting might be less confusing
                  // sort: 'basePrice',
                  // sortDir: 'desc'
                }));
              });
            }}
            className="mx-1"
            aria-label="Toggle PVP/PVE"
          />
          <span className="text-xs font-medium">PVE</span>
        </div>
        {/* Best Value Sort Select */}
        <Select
          value={filter.sort === "bestValue" ? "bestValue" : ""}
          onValueChange={(value) => {
            startTransition(() => {
              if (value === "bestValue") {
                setFilter((f) => ({
                  ...f,
                  sort: "bestValue",
                  sortDir: "desc",
                }));
              } // Add else if needed to clear sort when deselecting, or handle via placeholder
            });
          }}
        >
          <SelectTrigger className="h-8 w-full md:w-auto">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {/* Placeholder or clear option could go here */}
            <SelectItem value="bestValue">Best Value</SelectItem>
          </SelectContent>
        </Select>
        {/* Removed Asc/Desc Button */}
      </div>

      {/* Table Section with loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center h-12 mt-2">
          <Loader2 className="animate-spin h-5 w-5 text-blue-500 mr-2" />
          <span className="text-sm text-muted-foreground">Updating...</span>
        </div>
      )}

      {/* No favorites message */}
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
