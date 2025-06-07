import * as React from "react";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import type { FitItemsDebug } from "../lib/fit-items-in-box";

interface PlacementPreviewInlineProps {
  fitDebug: FitItemsDebug | null | undefined;
  selectedItems: Array<SimplifiedItem | null>;
}

export function PlacementPreviewInline({ fitDebug, selectedItems }: PlacementPreviewInlineProps) {
  if (!fitDebug || !fitDebug.grid) return null;
  return (
    <div className="mt-3 flex flex-col items-center">
      <div className="font-mono text-xs mb-1">Grid preview ({fitDebug.fit ? "Fit found" : "No fit"})</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(9, 16px)`,
          gridTemplateRows: `repeat(6, 16px)`,
          gap: 1,
          background: "#222",
          border: "1px solid #444",
          borderRadius: 4,
          padding: 2,
        }}
      >
        {fitDebug.grid.map((row, y) =>
          row.map((cell, x) => {
            const itemIdx = cell - 1;
            const color =
              cell === 0
                ? "#222"
                : `hsl(${(itemIdx * 80) % 360},60%,45%)`;
            const label =
              cell === 0
                ? ""
                : (selectedItems[itemIdx]?.name?.[0] ?? "");
            return (
              <div
                key={`cell-${x}-${y}`}
                style={{
                  width: 16,
                  height: 16,
                  background: color,
                  color: "#fff",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  border: cell ? "1px solid #fff3" : "1px solid #333",
                  opacity: cell ? 1 : 0.5,
                }}
                title={cell ? selectedItems[itemIdx]?.name : undefined}
              >
                {label}
              </div>
            );
          })
        )}
      </div>
      {fitDebug.placements && (
        <div className="mt-2 text-xs text-gray-300">
          {fitDebug.placements.map((p, i) => (
            <div key={i}>
              {p.name}: ({p.x + 1}, {p.y + 1}) {p.width}w × {p.height}h
            </div>
          ))}
        </div>
      )}
      {!fitDebug.fit && (
        <div className="mt-2 text-xs text-red-400">
          {fitDebug.failReason || "No arrangement found"}
        </div>
      )}
    </div>
  );
}
