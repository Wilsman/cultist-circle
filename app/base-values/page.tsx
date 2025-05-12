// app/base-values/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCombinedTarkovData } from "@/hooks/use-tarkov-api";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
// UI components
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react"; // Import Arrows

interface FilterState {
  name: string;
  shortName: string; // Keep shortName for potential filtering/sorting
  basePrice: [number, number];
  lastLowPrice: [number, number];
  avg24hPrice: [number, number];
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
  items: SimplifiedItem[],
  key: keyof SimplifiedItem
): [number, number] {
  const nums = items.map((i) =>
    typeof i[key] === "number" ? (i[key] as number) : 0
  );
  return [Math.min(...nums), Math.max(...nums)];
}

export default function ItemsTablePage() {
  const [pvp, setPvp] = useState<SimplifiedItem[]>([]);
  const [pve, setPve] = useState<SimplifiedItem[]>([]);
  const [mode, setMode] = useState<"pvp" | "pve">("pvp");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({
    // Use full FilterState
    name: "",
    shortName: "", // Initialize shortName
    basePrice: [0, 0],
    lastLowPrice: [0, 0],
    avg24hPrice: [0, 0],
    sort: "basePrice", // Default sort
    sortDir: "desc",
  });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchCombinedTarkovData().then(
      (data: { pvp: SimplifiedItem[]; pve: SimplifiedItem[] }) => {
        if (isMounted) {
          setPvp(data.pvp || []);
          setPve(data.pve || []);
          // Default to PVP min/max
          setFilter((f) => ({
            ...f,
            basePrice: getMinMax(data.pvp || [], "basePrice"),
            lastLowPrice: getMinMax(data.pvp || [], "lastLowPrice"),
            avg24hPrice: getMinMax(data.pvp || [], "avg24hPrice"),
          }));
          setIsLoading(false);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  // Function to handle sorting when table headers are clicked
  function handleHeaderSort(
    sortKey: "name" | "shortName" | "basePrice" | "lastLowPrice" | "avg24hPrice"
  ) {
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
  }

  const items = mode === "pvp" ? pvp : pve;
  const filtered = useMemo(() => {
    const q = filter.name.trim().toLowerCase();
    let filteredItems = items.filter(
      (
        item // Renamed to avoid conflict
      ) =>
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.shortName.toLowerCase().includes(q)) && // Keep shortName search
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
    filter.name,
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
          value={filter.name}
          onChange={(e) => setFilter((f) => ({ ...f, name: e.target.value }))}
          className="h-8 w-full md:w-[350px] lg:w-[500px]"
        />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium">PVP</span>
          <Switch
            checked={mode === "pve"}
            onCheckedChange={(checked: boolean) => {
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
            if (value === "bestValue") {
              setFilter((f) => ({ ...f, sort: "bestValue", sortDir: "desc" }));
            } // Add else if needed to clear sort when deselecting, or handle via placeholder
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

      {/* Table Section */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                onClick={() => handleHeaderSort("name")}
                className="cursor-pointer"
              >
                Name{" "}
                {filter.sort === "name" &&
                  (filter.sortDir === "asc" ? (
                    <ArrowUp className="inline h-4 w-4 ml-1" />
                  ) : (
                    <ArrowDown className="inline h-4 w-4 ml-1" />
                  ))}
              </TableHead>
              {/* <TableHead onClick={() => handleHeaderSort('shortName')} className="text-muted-foreground cursor-pointer">
                Short Name {filter.sort === 'shortName' && (filter.sortDir === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
              </TableHead> */}
              <TableHead
                onClick={() => handleHeaderSort("basePrice")}
                className="text-right font-semibold cursor-pointer"
              >
                Base Value{" "}
                {filter.sort === "basePrice" &&
                  (filter.sortDir === "asc" ? (
                    <ArrowUp className="inline h-4 w-4 ml-1" />
                  ) : (
                    <ArrowDown className="inline h-4 w-4 ml-1" />
                  ))}
              </TableHead>
              <TableHead
                onClick={() => handleHeaderSort("lastLowPrice")}
                className="text-muted-foreground text-right cursor-pointer"
              >
                Flea Price{" "}
                {filter.sort === "lastLowPrice" &&
                  (filter.sortDir === "asc" ? (
                    <ArrowUp className="inline h-4 w-4 ml-1" />
                  ) : (
                    <ArrowDown className="inline h-4 w-4 ml-1" />
                  ))}
              </TableHead>
              <TableHead
                onClick={() => handleHeaderSort("avg24hPrice")}
                className="text-muted-foreground text-right cursor-pointer"
              >
                Avg 24h Price{" "}
                {filter.sort === "avg24hPrice" &&
                  (filter.sortDir === "asc" ? (
                    <ArrowUp className="inline h-4 w-4 ml-1" />
                  ) : (
                    <ArrowDown className="inline h-4 w-4 ml-1" />
                  ))}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {/* <TableCell className="text-muted-foreground">{item.shortName}</TableCell> */}
                <TableCell className="text-right font-semibold">
                  {item.basePrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {item.lastLowPrice?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {item.avg24hPrice?.toLocaleString() ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
