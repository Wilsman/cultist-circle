// app/base-values/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { fetchMinimalTarkovData, MinimalItem } from "@/hooks/use-tarkov-api";
import { useDebounce } from "@/hooks/use-debounce";
// UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VirtualizedTable } from "@/components/ui/virtualized-table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
    | "bestValue"; // Add name/shortName back
  sortDir: "asc" | "desc";
}

function getMinMax(
  items: MinimalItem[],
  key: keyof MinimalItem
): [number, number] {
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
  
  // Debounce the search input to prevent excessive re-renders
  const debouncedSearchTerm = useDebounce(searchInput, 300);
  
  // Update filter when debounced search term changes
  useEffect(() => {
    startTransition(() => {
      setFilter(prev => ({ ...prev, name: debouncedSearchTerm }));
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
    (sortKey: "name" | "shortName" | "basePrice" | "lastLowPrice" | "avg24hPrice") => {
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
  )

  const items = mode === "pvp" ? pvp : pve;
  const filtered = useMemo(() => {
    // Use debounced search term instead of directly using filter.name
    const q = debouncedSearchTerm.trim().toLowerCase();
    
    // Only filter if we have items and either search term or price filters
    if (!items.length) return [];
    
    let filteredItems = items;
    
    // Only apply name filter if search term exists
    if (q) {
      filteredItems = filteredItems.filter(
        item => 
          item.name.toLowerCase().includes(q) || 
          item.shortName.toLowerCase().includes(q)
      );
    }
    
    // Apply price filters
    filteredItems = filteredItems.filter(
      item => 
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
      filteredItems = filteredItems.sort((a, b) => {
        const aVal =
          a.lastLowPrice && a.basePrice ? a.basePrice / a.lastLowPrice : 0;
        const bVal =
          b.lastLowPrice && b.basePrice ? b.basePrice / b.lastLowPrice : 0;
        return filter.sortDir === "desc" ? bVal - aVal : aVal - bVal; // Best value is always desc
      });
    } else {
      // Handle header sorting (name, shortName, prices)
      filteredItems = filteredItems.sort((a, b) => {
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center p-4">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500 mb-4" />
        <p className="text-lg font-semibold text-gray-300 mb-2">
          Initializing Tarkov Data Interface...
        </p>
        <p className="text-sm text-muted-foreground">
          Establishing quantum link to Flea Market... Standby...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="text-muted-foreground">
          Base Values for ALL items from Escape From Tarkov with sorting and
          filtering capabilities.
        </p>
      </div>

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
        <Input
          type="number"
          min={0}
          value={filter.basePrice[0]}
          onChange={e => {
            const min = Number(e.target.value);
            startTransition(() => {
              setFilter(f => ({ ...f, basePrice: [min, f.basePrice[1]] }));
            });
          }}
          className="h-8 w-24"
          placeholder="Min Value"
          aria-label="Min Base Value"
        />
        <Input
          type="number"
          min={0}
          value={filter.basePrice[1]}
          onChange={e => {
            const max = Number(e.target.value);
            startTransition(() => {
              setFilter(f => ({ ...f, basePrice: [f.basePrice[0], max] }));
            });
          }}
          className="h-8 w-24"
          placeholder="Max Value"
          aria-label="Max Base Value"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            startTransition(() => {
              const [min, max] = getMinMax(items, "basePrice");
              setFilter(f => ({ ...f, basePrice: [min, max] }));
            });
          }}
          aria-label="Reset base value filter"
        >
          Reset
        </Button>
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
                setFilter((f) => ({ ...f, sort: "bestValue", sortDir: "desc" }));
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
      
      {/* Virtualized Table */}
      <VirtualizedTable 
        items={filtered} 
        sortKey={filter.sort} 
        sortDir={filter.sortDir}
        onHeaderSort={handleHeaderSort}
      />
    </div>
  );
}
