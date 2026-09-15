// Grid detection for Escape from Tarkov inventory screenshots.
//
// Inspired by RatEye's inventory processing
// (https://github.com/tarkovtracker-org/RatEye), which isolates the grid lines
// and walks the rectangles they enclose. Uploaded screenshots are arbitrary
// crops at arbitrary resolutions, so this version measures the slot pitch from
// the image, finds the phase of every visible grid, and then decides each slot
// edge on a lattice. Deciding edges by how much of them is visible (instead of
// flood-filling closed regions) keeps one broken border - bright artwork
// touching the line, a badge, JPEG noise - from merging whole areas.

export interface RgbImage {
  /** Packed RGB, 3 bytes per pixel, row-major. */
  data: Uint8Array;
  width: number;
  height: number;
}

export interface GridCell {
  /** Left edge, on the border line. */
  x: number;
  /** Top edge, on the border line. */
  y: number;
  /** Width in pixels, both border lines included. */
  width: number;
  /** Height in pixels, both border lines included. */
  height: number;
  /** Width in inventory slots. */
  slotsWide: number;
  /** Height in inventory slots. */
  slotsHigh: number;
}

export interface GridDetection {
  /** Distance in pixels between two neighbouring grid lines (63 at 1080p). */
  pitch: number;
  cells: GridCell[];
}

/** Game slot size in pixels at 1080p, matching Tarkov.dev's 63n+1 icon sizes. */
export const BASE_SLOT_PX = 63;

const MIN_PITCH = 24;
/** Shortest run that still counts as part of a line. */
const MIN_SHORT_RUN = 6;
const MAX_PITCH = 260;
const MAX_ITEM_SLOTS = 10;

/** Minimum brightness step between a grid line and the pixels beside it. */
const RIDGE_CONTRAST = 14;
/** Grid lines are near-neutral; strongly saturated edges are item artwork. */
const MAX_LINE_SATURATION = 110;
/** An edge with at least this share visible separates two slots. */
const SEPARATOR_COVERAGE = 0.35;
/** Average visible share required along each outer side of a cell. */
const BORDER_COVERAGE = 0.6;

interface PixelStats {
  /** Max channel per pixel. */
  brightness: Uint8Array;
  /** 1 where the pixel is near-neutral (a grid line candidate). */
  neutral: Uint8Array;
}

function pixelStats(image: RgbImage): PixelStats {
  const { data, width, height } = image;
  const brightness = new Uint8Array(width * height);
  const neutral = new Uint8Array(width * height);
  for (let p = 0, i = 0; p < brightness.length; p++, i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = r > g ? (r > b ? r : b) : g > b ? g : b;
    const min = r < g ? (r < b ? r : b) : g < b ? g : b;
    brightness[p] = max;
    neutral[p] = max > 0 && (max - min) * 255 <= MAX_LINE_SATURATION * max ? 1 : 0;
  }
  return { brightness, neutral };
}

/**
 * Marks thin bright ridges: pixels brighter than their neighbours on both
 * sides along one axis. Item borders blend with each item's background tint,
 * so RatEye's fixed colour window misses many of them, but the line always
 * stays a 1-2px highlight over the darker cell interiors.
 */
function ridgeMask(
  { brightness, neutral }: PixelStats,
  width: number,
  height: number,
  vertical: boolean,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const step = vertical ? 1 : width;
  const yStart = vertical ? 0 : 1;
  const yEnd = vertical ? height : height - 2;
  const xStart = vertical ? 1 : 0;
  const xEnd = vertical ? width - 2 : width;
  for (let y = yStart; y < yEnd; y++) {
    const row = y * width;
    for (let x = xStart; x < xEnd; x++) {
      const p = row + x;
      if (!neutral[p]) continue;
      const here = brightness[p];
      if (here - brightness[p - step] < RIDGE_CONTRAST) continue;
      const after = brightness[p + step];
      if (here - after >= RIDGE_CONTRAST) {
        mask[p] = 1;
        continue;
      }
      // Two-pixel line: outer frames and non-integer UI scales.
      if (
        here - after < RIDGE_CONTRAST &&
        after - here < RIDGE_CONTRAST &&
        neutral[p + step] &&
        after - brightness[p + 2 * step] >= RIDGE_CONTRAST
      ) {
        mask[p] = 1;
        mask[p + step] = 1;
      }
    }
  }
  return mask;
}

interface Segment {
  /** Column of a vertical segment, row of a horizontal one. */
  position: number;
  from: number;
  /** Exclusive. */
  to: number;
}

/**
 * Collects straight runs of at least `minLength` pixels, bridging 1px gaps.
 */
function collectRuns(
  mask: Uint8Array,
  width: number,
  height: number,
  vertical: boolean,
  minLength: number,
): Segment[] {
  const segments: Segment[] = [];
  const lanes = vertical ? width : height;
  const length = vertical ? height : width;
  const laneStep = vertical ? 1 : width;
  const alongStep = vertical ? width : 1;

  for (let lane = 0; lane < lanes; lane++) {
    const base = lane * laneStep;
    let start = -1;
    let t = 0;
    while (t <= length) {
      const on = t < length && mask[base + t * alongStep] === 1;
      if (on) {
        if (start < 0) start = t;
        t++;
        continue;
      }
      // Bridge a single missing pixel.
      if (start >= 0 && t + 1 < length && mask[base + (t + 1) * alongStep] === 1) {
        t += 2;
        continue;
      }
      if (start >= 0 && t - start >= minLength) {
        segments.push({ position: lane, from: start, to: t });
      }
      start = -1;
      t++;
    }
  }
  return segments;
}

function paintSegments(
  segments: Segment[],
  width: number,
  vertical: boolean,
  out: Uint8Array,
): void {
  for (const s of segments) {
    if (vertical) {
      for (let k = s.from; k < s.to; k++) out[k * width + s.position] = 1;
    } else {
      out.fill(1, s.position * width + s.from, s.position * width + s.to);
    }
  }
}

/**
 * Estimates the grid pitch from the periodicity of line pixels projected onto
 * one axis. Returns 0 when no periodic structure is found.
 */
function estimatePitch(projection: Float64Array): number {
  const n = projection.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += projection[i];
  mean /= n || 1;

  const centred = new Float64Array(n);
  let energy = 0;
  for (let i = 0; i < n; i++) {
    centred[i] = projection[i] - mean;
    energy += centred[i] * centred[i];
  }
  if (energy === 0) return 0;

  const maxLag = Math.min(MAX_PITCH, Math.floor(n / 2));
  const refineLag = Math.min(MAX_PITCH * 8, Math.floor(n * 0.6));
  const scores = new Float64Array(Math.max(maxLag, refineLag) + 2);
  for (let lag = MIN_PITCH - 1; lag < scores.length && lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < n; i++) sum += centred[i] * centred[i + lag];
    scores[lag] = sum / energy;
  }

  let best = 0;
  for (let lag = MIN_PITCH; lag <= maxLag; lag++) {
    if (scores[lag] > best) best = scores[lag];
  }
  if (best < 0.15) return 0;

  // Multiples of the pitch correlate as well; take the first strong local peak.
  let base = 0;
  for (let lag = MIN_PITCH; lag <= maxLag; lag++) {
    const s = scores[lag];
    if (s >= best * 0.6 && s >= scores[lag - 1] && s >= scores[lag + 1]) {
      base = lag;
      break;
    }
  }
  if (!base) return 0;

  // Integer lags cannot express non-integer UI scales (52.5px at 900p), so
  // refine against a multiple that still correlates clearly. Large multiples
  // start correlating separate grids with each other, so keep them small and
  // never move more than a pixel away from the measured lag.
  const maxMultiple = Math.min(8, Math.floor(refineLag / base));
  for (let multiple = maxMultiple; multiple >= 2; multiple--) {
    let bestLag = 0;
    let bestScore = 0;
    const centre = base * multiple;
    for (let lag = centre - multiple; lag <= centre + multiple; lag++) {
      if (lag <= refineLag && scores[lag] > bestScore) {
        bestScore = scores[lag];
        bestLag = lag;
      }
    }
    if (!bestLag || bestScore < best * 0.6) continue;
    const refined = bestLag / multiple;
    if (Math.abs(refined - base) > 1) continue;
    return Math.abs(refined - Math.round(refined)) < 0.2 ? Math.round(refined) : refined;
  }
  return base;
}

function measurePitch(
  verticalSegments: Segment[],
  horizontalSegments: Segment[],
  width: number,
  height: number,
): number {
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  for (const s of verticalSegments) columns[s.position] += s.to - s.from;
  for (const s of horizontalSegments) rows[s.position] += s.to - s.from;

  const fromColumns = estimatePitch(columns);
  const fromRows = estimatePitch(rows);
  if (fromColumns && fromRows) {
    // Both axes share one pitch. Disagreement usually means one axis latched
    // onto a multiple, so prefer the smaller one when it divides the larger.
    const small = Math.min(fromColumns, fromRows);
    const ratio = Math.max(fromColumns, fromRows) / small;
    if (Math.abs(ratio - Math.round(ratio)) < 0.08) return small;
    return (fromColumns + fromRows) / 2;
  }
  return fromColumns || fromRows;
}

interface Phase {
  offset: number;
  /** Total length of the supporting segments. */
  weight: number;
  /** Extent of the supporting segments along the other axis. */
  from: number;
  to: number;
}

/**
 * Groups line segments by their position modulo the pitch. Every visible grid
 * (stash, container window, scav case) contributes its own phase.
 */
function findPhases(segments: Segment[], pitch: number): Phase[] {
  const buckets = Math.max(1, Math.round(pitch));
  const weight = new Float64Array(buckets);
  for (const s of segments) {
    const phase = ((s.position % pitch) + pitch) % pitch;
    weight[Math.round(phase) % buckets] += s.to - s.from;
  }

  let max = 0;
  for (let i = 0; i < buckets; i++) max = Math.max(max, weight[i]);
  if (!max) return [];

  const phases: Phase[] = [];
  for (let i = 0; i < buckets; i++) {
    const w = weight[i];
    if (w < max * 0.08 || w < pitch * 2) continue;
    const prev = weight[(i - 1 + buckets) % buckets];
    const next = weight[(i + 1) % buckets];
    if (w < prev || w < next || (w === prev && i > 0)) continue;

    // Weighted sub-pixel offset from the bucket and its neighbours.
    const offset =
      (i * w + (i - 1) * prev + (i + 1) * next) / (w + prev + next);
    let from = Infinity;
    let to = -Infinity;
    for (const s of segments) {
      const phase = ((s.position % pitch) + pitch) % pitch;
      const distance = Math.abs(phase - ((offset + pitch) % pitch));
      if (Math.min(distance, pitch - distance) > 1.5) continue;
      from = Math.min(from, s.position);
      to = Math.max(to, s.position);
    }
    if (from <= to) {
      phases.push({ offset: (offset + pitch) % pitch, weight: w + prev + next, from, to });
    }
  }
  return phases;
}

/** Share of an axis-aligned segment covered by line pixels, ±1px across. */
function coverage(
  mask: Uint8Array,
  width: number,
  height: number,
  vertical: boolean,
  position: number,
  from: number,
  to: number,
): number {
  let hits = 0;
  let total = 0;
  for (let t = Math.max(0, from); t < to; t++) {
    if (t >= (vertical ? height : width)) break;
    total++;
    for (let d = -1; d <= 1; d++) {
      const x = vertical ? position + d : t;
      const y = vertical ? t : position + d;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (mask[y * width + x]) {
        hits++;
        break;
      }
    }
  }
  return total ? hits / total : 0;
}

/** Splits one lattice (a pair of phases) into cells. */
function cellsOnLattice(
  vertical: Uint8Array,
  horizontal: Uint8Array,
  width: number,
  height: number,
  pitch: number,
  columnPhase: Phase,
  rowPhase: Phase,
): GridCell[] {
  // Lattice lines covering the extent where both phases have support.
  const firstColumn = Math.ceil((columnPhase.from - columnPhase.offset - 1) / pitch);
  const lastColumn = Math.floor((columnPhase.to - columnPhase.offset + 1) / pitch);
  const firstRow = Math.ceil((rowPhase.from - rowPhase.offset - 1) / pitch);
  const lastRow = Math.floor((rowPhase.to - rowPhase.offset + 1) / pitch);
  const columns = lastColumn - firstColumn;
  const rows = lastRow - firstRow;
  if (columns < 1 || rows < 1) return [];

  const lineX = (i: number) =>
    Math.round(columnPhase.offset + (firstColumn + i) * pitch);
  const lineY = (j: number) =>
    Math.round(rowPhase.offset + (firstRow + j) * pitch);
  const margin = Math.max(2, Math.round(pitch * 0.12));

  // Visibility of the edge left of slot (i, j) and above slot (i, j).
  const leftEdge = new Float32Array((columns + 1) * rows);
  const topEdge = new Float32Array(columns * (rows + 1));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i <= columns; i++) {
      leftEdge[j * (columns + 1) + i] = coverage(
        vertical, width, height, true, lineX(i), lineY(j) + margin, lineY(j + 1) - margin,
      );
    }
  }
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i < columns; i++) {
      topEdge[j * columns + i] = coverage(
        horizontal, width, height, false, lineY(j), lineX(i) + margin, lineX(i + 1) - margin,
      );
    }
  }
  const left = (i: number, j: number) => leftEdge[j * (columns + 1) + i];
  const top = (i: number, j: number) => topEdge[j * columns + i];

  const parent = Array.from({ length: columns * rows }, (_, k) => k);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const k = j * columns + i;
      if (i + 1 < columns && left(i + 1, j) < SEPARATOR_COVERAGE) {
        parent[find(k + 1)] = find(k);
      }
      if (j + 1 < rows && top(i, j + 1) < SEPARATOR_COVERAGE) {
        parent[find(k + columns)] = find(k);
      }
    }
  }

  const groups = new Map<
    number,
    { i0: number; j0: number; i1: number; j1: number; count: number }
  >();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const root = find(j * columns + i);
      const group = groups.get(root);
      if (!group) {
        groups.set(root, { i0: i, j0: j, i1: i, j1: j, count: 1 });
        continue;
      }
      group.i0 = Math.min(group.i0, i);
      group.j0 = Math.min(group.j0, j);
      group.i1 = Math.max(group.i1, i);
      group.j1 = Math.max(group.j1, j);
      group.count++;
    }
  }

  const cells: GridCell[] = [];
  for (const g of groups.values()) {
    const slotsWide = g.i1 - g.i0 + 1;
    const slotsHigh = g.j1 - g.j0 + 1;
    if (g.count !== slotsWide * slotsHigh) continue;
    if (slotsWide > MAX_ITEM_SLOTS || slotsHigh > MAX_ITEM_SLOTS) continue;

    // A real cell is closed on every side; open groups are background. Each
    // slot edge must at least read as a separator, and each side as a whole
    // must be clearly visible (artwork may hide part of one edge).
    const sides = [0, 0, 0, 0];
    let closed = true;
    for (let i = g.i0; i <= g.i1; i++) {
      const above = top(i, g.j0);
      const below = top(i, g.j1 + 1);
      if (above < SEPARATOR_COVERAGE || below < SEPARATOR_COVERAGE) closed = false;
      sides[0] += above / slotsWide;
      sides[1] += below / slotsWide;
    }
    for (let j = g.j0; j <= g.j1; j++) {
      const before = left(g.i0, j);
      const after = left(g.i1 + 1, j);
      if (before < SEPARATOR_COVERAGE || after < SEPARATOR_COVERAGE) closed = false;
      sides[2] += before / slotsHigh;
      sides[3] += after / slotsHigh;
    }
    if (!closed || sides.some((side) => side < BORDER_COVERAGE)) continue;

    const x = lineX(g.i0);
    const y = lineY(g.j0);
    const right = lineX(g.i1 + 1);
    const bottom = lineY(g.j1 + 1);
    if (x < 0 || y < 0 || right >= width || bottom >= height) continue;
    cells.push({
      x,
      y,
      width: right - x + 1,
      height: bottom - y + 1,
      slotsWide,
      slotsHigh,
    });
  }
  return cells;
}

/**
 * Finds inventory cells (items and empty slots) in a screenshot. Returns an
 * empty cell list when no inventory grid is visible.
 */
export function detectGrid(image: RgbImage): GridDetection {
  const { width, height } = image;
  const stats = pixelStats(image);
  const verticalRidges = ridgeMask(stats, width, height, true);
  const horizontalRidges = ridgeMask(stats, width, height, false);

  const verticalRuns = collectRuns(verticalRidges, width, height, true, MIN_SHORT_RUN);
  const horizontalRuns = collectRuns(horizontalRidges, width, height, false, MIN_SHORT_RUN);
  const atLeast = (segments: Segment[], length: number) =>
    segments.filter((s) => s.to - s.from >= length);

  const pitch = measurePitch(
    atLeast(verticalRuns, MIN_PITCH),
    atLeast(horizontalRuns, MIN_PITCH),
    width,
    height,
  );
  if (!pitch) return { pitch: 0, cells: [] };

  // Phases come from long runs only: an item border spans at least one slot.
  const longRun = Math.floor(pitch * 0.7);
  const columnPhases = findPhases(atLeast(verticalRuns, longRun), pitch);
  const rowPhases = findPhases(atLeast(horizontalRuns, longRun), pitch);

  // Edge visibility uses shorter runs, so a border interrupted by artwork or a
  // badge still counts while stray artwork pixels do not.
  const shortRun = Math.max(MIN_SHORT_RUN, Math.floor(pitch * 0.2));
  const vertical = new Uint8Array(width * height);
  const horizontal = new Uint8Array(width * height);
  paintSegments(atLeast(verticalRuns, shortRun), width, true, vertical);
  paintSegments(atLeast(horizontalRuns, shortRun), width, false, horizontal);

  const candidates: Array<{ cell: GridCell; support: number }> = [];
  for (const columnPhase of columnPhases) {
    for (const rowPhase of rowPhases) {
      const support = Math.min(columnPhase.weight, rowPhase.weight);
      for (const cell of cellsOnLattice(
        vertical, horizontal, width, height, pitch, columnPhase, rowPhase,
      )) {
        candidates.push({ cell, support });
      }
    }
  }

  // Long straight artwork (rows of magazines) can form a weak phase of its
  // own, offset from the real grid. Where lattices overlap, trust the one with
  // more line support, then the smaller cell.
  candidates.sort(
    (a, b) =>
      b.support - a.support ||
      a.cell.slotsWide * a.cell.slotsHigh - b.cell.slotsWide * b.cell.slotsHigh,
  );
  const kept: GridCell[] = [];
  for (const { cell } of candidates) {
    const overlaps = kept.some(
      (k) =>
        Math.min(cell.x + cell.width, k.x + k.width) - Math.max(cell.x, k.x) > pitch / 2 &&
        Math.min(cell.y + cell.height, k.y + k.height) - Math.max(cell.y, k.y) > pitch / 2,
    );
    if (!overlaps) kept.push(cell);
  }

  kept.sort((a, b) => a.y - b.y || a.x - b.x);
  return { pitch, cells: kept };
}

