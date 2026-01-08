import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import type { FitItemsDebug } from "../lib/fit-items-in-box";

interface PlacementPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fitDebug: FitItemsDebug | null;
  selectedItems: Array<SimplifiedItem | null>;
}

export function PlacementPreviewModal({ open, onOpenChange, fitDebug, selectedItems }: PlacementPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Visual Placement Preview</DialogTitle>
          <DialogDescription>
            This shows how your selected items are arranged in the Cultist Circle grid.
          </DialogDescription>
        </DialogHeader>
        {fitDebug && fitDebug.grid ? (
          <div className="flex flex-col items-center mt-2">
            <div className="font-mono text-xs mb-1">Grid preview ({fitDebug.fit ? "Fit found" : "No fit"})</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(9, 20px)`,
                gridTemplateRows: `repeat(6, 20px)`,
                gap: 2,
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
                        width: 20,
                        height: 20,
                        background: color,
                        color: "#fff",
                        fontSize: 13,
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
        ) : (
          <div className="text-gray-400 text-sm mt-4">No preview available.</div>
        )}
        <DialogClose asChild>
          <button className="mt-4 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Close</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
