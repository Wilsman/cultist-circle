import { detectGrid, type RgbImage } from "@/lib/stash-scan/grid";
import { describe, expect, it } from "vitest";

const LINE = [73, 81, 84];
const INTERIOR = [22, 24, 22];

/**
 * Draws an inventory grid: `layout` rows of cell widths in slots, all cells
 * one slot high unless listed in `tall` as "column,row".
 */
function drawStash(pitch: number, columns: number, rows: number, merged: Array<[number, number, number, number]>): RgbImage {
  const margin = 20;
  const width = margin * 2 + columns * pitch + 1;
  const height = margin * 2 + rows * pitch + 1;
  const data = new Uint8Array(width * height * 3);
  const paint = (x: number, y: number, [r, g, b]: number[]) => {
    const i = (y * width + x) * 3;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) paint(x, y, INTERIOR);

  // Slot (i, j) belongs to a merged cell when listed; lines inside merged
  // cells are not drawn.
  const owner = (i: number, j: number) =>
    merged.findIndex(([ci, cj, w, h]) => i >= ci && i < ci + w && j >= cj && j < cj + h);

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i < columns; i++) {
      const above = j > 0 ? owner(i, j - 1) : -2;
      const below = j < rows ? owner(i, j) : -3;
      if (above >= 0 && above === below) continue;
      for (let x = 0; x <= pitch; x++) paint(margin + i * pitch + x, margin + j * pitch, LINE);
    }
  }
  for (let i = 0; i <= columns; i++) {
    for (let j = 0; j < rows; j++) {
      const left = i > 0 ? owner(i - 1, j) : -2;
      const right = i < columns ? owner(i, j) : -3;
      if (left >= 0 && left === right) continue;
      for (let y = 0; y <= pitch; y++) paint(margin + i * pitch, margin + j * pitch + y, LINE);
    }
  }
  return { data, width, height };
}

describe("detectGrid", () => {
  it("measures the pitch and finds merged multi-slot cells", () => {
    const image = drawStash(63, 6, 4, [
      [0, 0, 2, 2],
      [3, 1, 1, 3],
      [4, 0, 2, 1],
    ]);
    const result = detectGrid(image);
    expect(result.pitch).toBe(63);

    const sizes = result.cells.map((c) => `${c.slotsWide}x${c.slotsHigh}`).sort();
    expect(sizes.filter((s) => s === "2x2")).toHaveLength(1);
    expect(sizes.filter((s) => s === "1x3")).toHaveLength(1);
    expect(sizes.filter((s) => s === "2x1")).toHaveLength(1);
    // 24 slots minus the 4 + 3 + 2 slots covered by merged cells.
    expect(sizes.filter((s) => s === "1x1")).toHaveLength(24 - 9);

    const big = result.cells.find((c) => c.slotsWide === 2 && c.slotsHigh === 2)!;
    expect(big).toMatchObject({ x: 20, y: 20, width: 127, height: 127 });
  });

  it("works at other UI scales", () => {
    const result = detectGrid(drawStash(84, 5, 3, [[1, 1, 2, 1]]));
    expect(result.pitch).toBe(84);
    expect(result.cells).toHaveLength(15 - 1);
  });

  it("returns no cells for an image without a grid", () => {
    const width = 300;
    const height = 200;
    const data = new Uint8Array(width * height * 3).fill(30);
    expect(detectGrid({ data, width, height }).cells).toEqual([]);
  });
});
