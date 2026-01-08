import { SimplifiedItem } from "../types/SimplifiedItem";

/**
 * Generate all permutations of an array (Heap's algorithm).
 */

/**
 * Returns true if any permutation of the items fits in a 9x6 grid (no rotation).
 */
export interface ItemPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  idx: number;
}

export interface FitItemsDebug {
  fit: boolean;
  placements?: ItemPlacement[];
  grid?: number[][];
  triedCount: number;
  failReason?: string;
}

export function doItemsFitInBox(
  items: SimplifiedItem[],
  boxWidth = 9,
  boxHeight = 6,
  debug = false
): boolean | FitItemsDebug {
  // Defensive: treat missing width/height as 1
  const normItems = items.map((item, idx) => ({
    width: item.width ?? 1,
    height: item.height ?? 1,
    name: item.name,
    idx,
  }));
  // Early out: any item too big
  for (const it of normItems) {
    if (it.width > boxWidth || it.height > boxHeight)
      return debug ? { fit: false, triedCount: 0, failReason: `${it.name} too big` } : false;
  }

  // 2D grid: 0 = empty, >0 = item idx+1
  const grid: number[][] = Array.from({ length: boxHeight }, () => Array(boxWidth).fill(0));
  const placements: ItemPlacement[] = [];
  let triedCount = 0;

  function canPlace(x: number, y: number, w: number, h: number): boolean {
    if (x + w > boxWidth || y + h > boxHeight) return false;
    for (let dy = 0; dy < h; ++dy)
      for (let dx = 0; dx < w; ++dx)
        if (grid[y + dy][x + dx]) return false;
    return true;
  }
  function place(x: number, y: number, w: number, h: number, idx: number) {
    for (let dy = 0; dy < h; ++dy)
      for (let dx = 0; dx < w; ++dx)
        grid[y + dy][x + dx] = idx + 1;
  }
  function unplace(x: number, y: number, w: number, h: number) {
    for (let dy = 0; dy < h; ++dy)
      for (let dx = 0; dx < w; ++dx)
        grid[y + dy][x + dx] = 0;
  }
  let solved = false;
  function backtrack(i: number): boolean {
    if (i === normItems.length) return true;
    const item = normItems[i];
    for (let y = 0; y <= boxHeight - item.height; ++y) {
      for (let x = 0; x <= boxWidth - item.width; ++x) {
        ++triedCount;
        if (canPlace(x, y, item.width, item.height)) {
          place(x, y, item.width, item.height, item.idx);
          placements.push({ x, y, width: item.width, height: item.height, name: item.name, idx: item.idx });
          if (backtrack(i + 1)) return true;
          placements.pop();
          unplace(x, y, item.width, item.height);
        }
      }
    }
    return false;
  }
  solved = backtrack(0);
  if (!debug) return solved;
  return {
    fit: solved,
    placements: solved ? [...placements] : undefined,
    grid: solved ? grid.map(row => [...row]) : undefined,
    triedCount,
    failReason: solved ? undefined : 'No arrangement found',
  };
}
