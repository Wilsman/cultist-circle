// components/ui/virtualized-table.tsx
"use client";

import React, { useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { cn } from "@/lib/utils";
import { MinimalItem } from "@/hooks/use-tarkov-api";

interface VirtualizedTableProps {
  items: MinimalItem[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onHeaderSort?: (
    sortKey: "name" | "shortName" | "basePrice" | "lastLowPrice" | "avg24hPrice"
  ) => void;
  onToggleFavorite?: (itemId: string) => void;
  isFavorite?: (itemId: string) => boolean;
}

export function VirtualizedTable({
  items,
  sortKey,
  sortDir,
  onHeaderSort,
  onToggleFavorite,
  isFavorite,
}: VirtualizedTableProps) {
  // Custom cell component that uses divs instead of td elements
  const Cell = React.memo(
    ({
      className,
      children,
    }: {
      className?: string;
      children: React.ReactNode;
    }) => <div className={cn("px-4 py-2", className)}>{children}</div>
  );

  // Add display name for ESLint
  Cell.displayName = "VirtualizedTableCell";

  // Memoize the row renderer to prevent unnecessary re-renders
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      if (!item) return null;

      return (
        <div
          style={style}
          className="flex border-b transition-colors hover:bg-muted/50"
          key={item.id}
        >
          <Cell className="font-medium flex-1 min-w-[200px] truncate flex items-center gap-2">
            {onToggleFavorite && isFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                className="text-muted-foreground hover:text-yellow-500 transition-colors relative group"
                aria-label={
                  isFavorite(item.id)
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                <span className="absolute hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 -mt-8 left-1/2 transform -translate-x-1/2 opacity-80">
                  {isFavorite(item.id)
                    ? "Remove from favorites"
                    : "Add to favorites"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isFavorite(item.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    isFavorite(item.id)
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
            )}
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-primary flex-1 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {item.name}
            </a>
          </Cell>
          <Cell className="text-right font-semibold w-[120px]">
            {item.basePrice.toLocaleString()}
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {item.lastLowPrice?.toLocaleString() ?? "-"}
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {item.avg24hPrice?.toLocaleString() ?? "-"}
          </Cell>
        </div>
      );
    },
    [items, Cell, onToggleFavorite, isFavorite]
  );

  // Only render if we have items
  if (!items.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No items found matching your criteria
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex border-b">
        <div
          className="font-medium p-2 flex-1 min-w-[200px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("name")}
        >
          Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-right font-semibold p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("basePrice")}
        >
          Base Value{" "}
          {sortKey === "basePrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("lastLowPrice")}
        >
          Flea Price{" "}
          {sortKey === "lastLowPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("avg24hPrice")}
        >
          Avg 24h Price{" "}
          {sortKey === "avg24hPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
      </div>
      <List
        height={window.innerHeight - 200}
        width="100%"
        itemCount={items.length}
        itemSize={40}
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}
