// Screenshot scan pipeline: grid detection, then matching every cell.

import { cellFeatures } from "./features";
import { detectGrid, type RgbImage } from "./grid";
import { matchCell, type IconIndex } from "./matcher";
import type { ScanCell, ScanConfidence, ScanImageResult } from "./types";

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
    const features = cellFeatures(
      image,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
      cell.slotsWide,
      cell.slotsHigh,
    );
    const result = matchCell(features, index);
    const best = result.matches[0];
    cells.push({
      ...cell,
      empty: result.empty,
      confidence: best ? confidenceOf(best.score, result.margin) : "low",
      matches: result.matches.map((m) => ({
        itemId: m.itemId,
        shortName: m.shortName,
        rotated: m.rotated,
        score: Math.round(m.score * 1000) / 1000,
      })),
    });
    await yieldToEventLoop();
  }

  return {
    width: image.width,
    height: image.height,
    pitch: grid.pitch,
    cells,
  };
}
