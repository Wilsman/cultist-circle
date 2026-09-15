// Screenshot scan pipeline: grid detection, then matching every cell.

import { cellFeatures } from "./features";
import { detectGrid, type RgbImage } from "./grid";
import { matchCell, type IconIndex } from "./matcher";
import type { ScanCell, ScanConfidence, ScanImageResult, ScanRect } from "./types";

/** Scores from the matcher's calibration on sample screenshots. */
const HIGH_SCORE = 0.72;
const HIGH_MARGIN = 0.08;
const LOW_SCORE = 0.5;

function confidenceOf(score: number, margin: number): ScanConfidence {
  if (score >= HIGH_SCORE && margin >= HIGH_MARGIN) return "high";
  if (score < LOW_SCORE) return "low";
  return "medium";
}

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Matches one cell rectangle of an already decoded screenshot. */
function matchRect(image: RgbImage, rect: ScanRect, index: IconIndex): ScanCell {
  const features = cellFeatures(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    rect.slotsWide,
    rect.slotsHigh,
  );
  const result = matchCell(features, index);
  const best = result.matches[0];
  return {
    ...rect,
    empty: result.empty,
    confidence: best ? confidenceOf(best.score, result.margin) : "low",
    matches: result.matches.map((m) => ({
      itemId: m.itemId,
      shortName: m.shortName,
      rotated: m.rotated,
      score: Math.round(m.score * 1000) / 1000,
    })),
  };
}

/**
 * Matches the given rectangles instead of detecting the grid. Used when a
 * detected cell turns out to hold more than one item and is split by hand.
 */
export async function scanRects(
  image: RgbImage,
  rects: ScanRect[],
  index: IconIndex,
): Promise<ScanImageResult> {
  const cells: ScanCell[] = [];
  for (const rect of rects) {
    cells.push(matchRect(image, rect, index));
    await yieldToEventLoop();
  }
  return { width: image.width, height: image.height, pitch: 0, cells };
}

/**
 * Scans one decoded screenshot. Matching is CPU-bound, so the event loop is
 * handed back between cells to keep the web server responsive.
 */
export async function scanImage(
  image: RgbImage,
  index: IconIndex,
): Promise<ScanImageResult> {
  const grid = detectGrid(image);
  const cells: ScanCell[] = [];

  for (const cell of grid.cells) {
    cells.push(matchRect(image, cell, index));
    await yieldToEventLoop();
  }

  return {
    width: image.width,
    height: image.height,
    pitch: grid.pitch,
    cells,
  };
}
