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
  onHeaderSort?: (sortKey: "name" | "shortName" | "basePrice" | "lastLowPrice" | "avg24hPrice") => void;
}

export function VirtualizedTable({ items, sortKey, sortDir, onHeaderSort }: VirtualizedTableProps) {
  // Custom cell component that uses divs instead of td elements
  const Cell = React.memo(({ className, children }: { className?: string, children: React.ReactNode }) => (
    <div className={cn(
      "px-4 py-2", 
      className
    )}>
      {children}
    </div>
  ));
  
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
          <Cell className="font-medium flex-1 min-w-[200px] truncate">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-primary"
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
    [items, Cell]
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
          onClick={() => onHeaderSort?.('name')}
        >
          Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div 
          className="text-right font-semibold p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.('basePrice')}
        >
          Base Value {sortKey === "basePrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div 
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.('lastLowPrice')}
        >
          Flea Price {sortKey === "lastLowPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div 
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.('avg24hPrice')}
        >
          Avg 24h Price {sortKey === "avg24hPrice" && (sortDir === "asc" ? "↑" : "↓")}
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
