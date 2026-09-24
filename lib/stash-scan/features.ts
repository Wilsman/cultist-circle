// Feature extraction shared by the icon index and screenshot cells.
//
// Every cell is compared at a fixed resolution per inventory slot, so the
// screenshot's UI scale drops out. Two features describe a cell:
//
// - art: the icon without the short-name band at the top and the badge band
//   (stack count, found-in-raid mark) at the bottom, colour, zero-mean and
//   unit-length so a dot product is a correlation;
// - text: the "whiteness" of the short-name band, which is rendered with the
//   same font and placement in-game and in Tarkov.dev's grid images, and stays
//   stable when an item's 3D render changes between game versions.

import type { RgbImage } from "./grid";

/**
 * Bump whenever feature extraction changes, so persisted indexes built with
 * the old features are discarded instead of silently mismatching.
 */
export const FEATURE_VERSION = 1;

/** Slot size, in pixels, of Tarkov.dev's grid images (63n+1 per axis). */
export const TEMPLATE_SLOT_PX = 63;

/**
 * Art feature resolution per slot. Large items (weapons, backpacks) are
 * distinctive and would dominate memory at full resolution, so their
 * per-slot resolution drops with size.
 */
export function artCoarsePx(slotsWide: number, slotsHigh: number): number {
  return Math.max(4, Math.min(8, Math.floor(24 / Math.max(slotsWide, slotsHigh))));
}

export function artFinePx(slotsWide: number, slotsHigh: number): number {
  return Math.max(8, Math.min(16, Math.floor(48 / Math.max(slotsWide, slotsHigh))));
}

/** Short names never need more than this many slots of the text band. */
const MAX_TEXT_SLOTS = 3;

/** Short-name band height at template scale. */
export const TEXT_BAND_PX = 13;
/** Badge band height at template scale. */
export const BADGE_BAND_PX = 15;
/** Text glyphs are ~9px tall at template scale; keep full resolution. */
export const TEXT_SCALE = 1;

/** A normalised feature vector, either exact or quantised for storage. */
export type FeatureVector = Float32Array | QuantisedVector;

export interface QuantisedVector {
  values: Int8Array;
  /** Multiply `values` by this to recover the normalised vector. */
  scale: number;
}

export interface CellFeatures {
  slotsWide: number;
  slotsHigh: number;
  artCoarse: Float32Array;
  artFine: Float32Array;
  /** Width of the text map at text scale; height is `textHeight()`. */
  textWidth: number;
  text: Float32Array;
  /** Share of text-like pixels in the band; ~0 for empty slots. */
  textInk: number;
  /** Standard deviation of the art region brightness; low for empty slots. */
  artContrast: number;
}

export function textHeight(): number {
  return Math.round(TEXT_BAND_PX * TEXT_SCALE);
}

/**
 * Area-averaging resample of an RGB region. Handles both shrinking and mild
 * enlarging (low-resolution screenshots).
 */
export function resample(
  image: RgbImage,
  left: number,
  top: number,
  width: number,
  height: number,
  outWidth: number,
  outHeight: number,
): Float32Array {
  const out = new Float32Array(outWidth * outHeight * 3);
  const sx = width / outWidth;
  const sy = height / outHeight;
  const { data } = image;

  for (let oy = 0; oy < outHeight; oy++) {
    const y0 = top + oy * sy;
    const y1 = y0 + sy;
    for (let ox = 0; ox < outWidth; ox++) {
      const x0 = left + ox * sx;
      const x1 = x0 + sx;
      let r = 0;
      let g = 0;
      let b = 0;
      let total = 0;
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        if (y < 0 || y >= image.height) continue;
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        if (wy <= 0) continue;
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          if (x < 0 || x >= image.width) continue;
          const wx = Math.min(x + 1, x1) - Math.max(x, x0);
          if (wx <= 0) continue;
          const w = wx * wy;
          const i = (y * image.width + x) * 3;
          r += data[i] * w;
          g += data[i + 1] * w;
          b += data[i + 2] * w;
          total += w;
        }
      }
      const o = (oy * outWidth + ox) * 3;
      if (total > 0) {
        out[o] = r / total;
        out[o + 1] = g / total;
        out[o + 2] = b / total;
      }
    }
  }
  return out;
}

/** Zero-mean, unit-length in place. Returns the pre-normalisation std-dev. */
export function normalise(vector: Float32Array): number {
  let mean = 0;
  for (let i = 0; i < vector.length; i++) mean += vector[i];
  mean /= vector.length || 1;
  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    vector[i] -= mean;
    norm += vector[i] * vector[i];
  }
  const std = Math.sqrt(norm / (vector.length || 1));
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  return std;
}

export function quantise(vector: Float32Array): QuantisedVector {
  let max = 0;
  for (let i = 0; i < vector.length; i++) max = Math.max(max, Math.abs(vector[i]));
  const scale = max / 127 || 1;
  const values = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) values[i] = Math.round(vector[i] / scale);
  return { values, scale };
}

/** Dot product of an exact cell vector with an exact or quantised one. */
export function dot(a: Float32Array, b: FeatureVector): number {
  const values = b instanceof Float32Array ? b : b.values;
  const scale = b instanceof Float32Array ? 1 : b.scale;
  let sum = 0;
  const n = Math.min(a.length, values.length);
  for (let i = 0; i < n; i++) sum += a[i] * values[i];
  return sum * scale;
}

/** Art region of a cell at `perSlot` px per slot, bands removed, normalised. */
function artFeature(
  image: RgbImage,
  left: number,
  top: number,
  width: number,
  height: number,
  slotsWide: number,
  slotsHigh: number,
  perSlot: number,
): { vector: Float32Array; contrast: number } {
  // Crop inside the border lines, then drop the text and badge bands.
  const scale = (height - 1) / (slotsHigh * TEMPLATE_SLOT_PX);
  const bandTop = TEXT_BAND_PX * scale;
  const bandBottom = BADGE_BAND_PX * scale;
  const x = left + 1;
  const y = top + 1 + bandTop;
  const w = width - 2;
  const h = height - 2 - bandTop - bandBottom;
  const outWidth = slotsWide * perSlot;
  const outHeight = Math.max(
    1,
    Math.round(
      ((slotsHigh * TEMPLATE_SLOT_PX - TEXT_BAND_PX - BADGE_BAND_PX) /
        TEMPLATE_SLOT_PX) *
        perSlot,
    ),
  );
  const vector = resample(image, x, y, w, h, outWidth, outHeight);
  const contrast = normalise(vector);
  return { vector, contrast };
}

/**
 * Whiteness of the short-name band, right-aligned into `textWidth` columns.
 * Short names are near-white, low-saturation glyphs on a dark background.
 */
function textFeature(
  image: RgbImage,
  left: number,
  top: number,
  width: number,
  height: number,
  slotsHigh: number,
  textWidth: number,
): { vector: Float32Array; ink: number } {
  const scale = (height - 1) / (slotsHigh * TEMPLATE_SLOT_PX);
  const sourceWidth = Math.min(width - 2, (textWidth / TEXT_SCALE) * scale);
  const band = resample(
    image,
    left + width - 1 - sourceWidth,
    top + 1,
    sourceWidth,
    TEXT_BAND_PX * scale,
    textWidth,
    textHeight(),
  );
  const rows = textHeight();
  const whiteness = new Float32Array(textWidth * rows);
  for (let p = 0; p < whiteness.length; p++) {
    const r = band[p * 3];
    const g = band[p * 3 + 1];
    const b = band[p * 3 + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    whiteness[p] = Math.max(
      0,
      Math.max(0, min - 90) / 165 - Math.max(0, max - min - 40) / 215,
    );
  }

  // Top-hat: glyph strokes are 1-2px wide, so subtracting a 3x3 opening keeps
  // them and removes solid artwork reaching into the band (caps, handles).
  const opened = boxFilter(
    boxFilter(whiteness, textWidth, rows, Math.min),
    textWidth,
    rows,
    Math.max,
  );
  const strokes = new Float32Array(whiteness.length);
  let ink = 0;
  for (let p = 0; p < strokes.length; p++) {
    strokes[p] = whiteness[p] - opened[p];
    if (strokes[p] > 0.3) ink++;
  }

  // A light blur lets 1-2px misalignment still correlate.
  const vector = blur(strokes, textWidth, rows);
  normalise(vector);
  return { vector, ink: ink / vector.length };
}

/** 3x3 min or max filter with edge clamping. */
function boxFilter(
  source: Float32Array,
  width: number,
  height: number,
  pick: (...values: number[]) => number,
): Float32Array {
  const out = new Float32Array(source.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          values.push(source[yy * width + xx]);
        }
      }
      out[y * width + x] = pick(...values);
    }
  }
  return out;
}

/** Separable [1 2 1] blur. */
function blur(source: Float32Array, width: number, height: number): Float32Array {
  const horizontal = new Float32Array(source.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = source[y * width + Math.max(0, x - 1)];
      const r = source[y * width + Math.min(width - 1, x + 1)];
      horizontal[y * width + x] = (l + 2 * source[y * width + x] + r) / 4;
    }
  }
  const out = new Float32Array(source.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = horizontal[Math.max(0, y - 1) * width + x];
      const d = horizontal[Math.min(height - 1, y + 1) * width + x];
      out[y * width + x] = (u + 2 * horizontal[y * width + x] + d) / 4;
    }
  }
  return out;
}

/** Text map width, at text scale, for a cell of `slotsWide` slots. */
export function textWidthFor(slotsWide: number): number {
  const slots = Math.min(slotsWide, MAX_TEXT_SLOTS);
  return Math.round((slots * TEMPLATE_SLOT_PX - 2) * TEXT_SCALE);
}

/**
 * Features of an axis-aligned cell whose rectangle includes both border
 * lines, i.e. `width = slotsWide * pitch + 1`.
 */
export function cellFeatures(
  image: RgbImage,
  left: number,
  top: number,
  width: number,
  height: number,
  slotsWide: number,
  slotsHigh: number,
): CellFeatures {
  const coarse = artFeature(
    image, left, top, width, height, slotsWide, slotsHigh, artCoarsePx(slotsWide, slotsHigh),
  );
  const fine = artFeature(
    image, left, top, width, height, slotsWide, slotsHigh, artFinePx(slotsWide, slotsHigh),
  );
  const textWidth = textWidthFor(slotsWide);
  const text = textFeature(image, left, top, width, height, slotsHigh, textWidth);
  return {
    slotsWide,
    slotsHigh,
    artCoarse: coarse.vector,
    artFine: fine.vector,
    textWidth,
    text: text.vector,
    textInk: text.ink,
    artContrast: fine.contrast,
  };
}

/** Rotates an RGB image 90° clockwise. */
export function rotateClockwise(image: RgbImage): RgbImage {
  const { width, height, data } = image;
  const out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 3;
      // (x, y) -> (height - 1 - y, x) in a height-wide image.
      const dst = (x * height + (height - 1 - y)) * 3;
      out[dst] = data[src];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src + 2];
    }
  }
  return { data: out, width: height, height: width };
}

/**
 * Best correlation of two text maps over small horizontal/vertical shifts.
 * Both maps share `height`; widths may differ and are right-aligned.
 */
export function shiftedTextScore(
  a: Float32Array,
  aWidth: number,
  b: FeatureVector,
  bWidth: number,
  maxShiftX: number,
  maxShiftY: number,
): number {
  const values = b instanceof Float32Array ? b : b.values;
  const scale = b instanceof Float32Array ? 1 : b.scale;
  const height = textHeight();
  let best = -Infinity;
  for (let dy = -maxShiftY; dy <= maxShiftY; dy++) {
    for (let dx = -maxShiftX; dx <= maxShiftX; dx++) {
      let sum = 0;
      for (let y = 0; y < height; y++) {
        const by = y + dy;
        if (by < 0 || by >= height) continue;
        const aRow = y * aWidth;
        const bRow = by * bWidth;
        // Right-aligned: a's column x lines up with b's column x + offset.
        const offset = bWidth - aWidth + dx;
        const from = Math.max(0, -offset);
        const to = Math.min(aWidth, bWidth - offset);
        for (let x = from; x < to; x++) sum += a[aRow + x] * values[bRow + x + offset];
      }
      if (sum > best) best = sum;
    }
  }
  return best * scale;
}
