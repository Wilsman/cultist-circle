// Icon index and cell matching.

import type { RgbImage } from "./grid";
import {
  cellFeatures,
  dot,
  quantise,
  rotateClockwise,
  shiftedTextScore,
  TEMPLATE_SLOT_PX,
  textHeight,
  textWidthFor,
  type CellFeatures,
  type QuantisedVector,
} from "./features";

export interface CatalogIcon {
  id: string;
  shortName: string;
  width: number;
  height: number;
  /**
   * Tarkov.dev `gridImageLink`: the item on its grid background at 63px per
   * slot, short name included. (`iconLink` is always a 64px thumbnail.)
   */
  grid: RgbImage;
}

export interface TemplateFeatures {
  artCoarse: QuantisedVector;
  artFine: QuantisedVector;
  textWidth: number;
  text: QuantisedVector;
}

export interface IconTemplate {
  itemId: string;
  shortName: string;
  rotated: boolean;
  features: TemplateFeatures;
}

export interface IconIndex {
  /** Templates keyed by `${slotsWide}x${slotsHigh}` of the cell they fill. */
  bySize: Map<string, IconTemplate[]>;
  size: number;
}

export interface CellMatch {
  itemId: string;
  shortName: string;
  rotated: boolean;
  score: number;
  artScore: number;
  textScore: number;
}

export interface CellResult {
  empty: boolean;
  /** Best candidates, most likely first. */
  matches: CellMatch[];
  /** Score gap between the best and the next distinct item, 0..1. */
  margin: number;
}

const sizeKey = (w: number, h: number) => `${w}x${h}`;

function templateFeatures(image: RgbImage, slotsWide: number, slotsHigh: number) {
  return cellFeatures(image, 0, 0, image.width, image.height, slotsWide, slotsHigh);
}

function expectedSize(slots: number): number {
  return slots * TEMPLATE_SLOT_PX + 1;
}

/** Right-aligns a text map into a different width (cropping on the left). */
function realignText(
  text: Float32Array,
  fromWidth: number,
  toWidth: number,
): Float32Array {
  const height = textHeight();
  const out = new Float32Array(toWidth * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < toWidth; x++) {
      const sx = fromWidth - toWidth + x;
      if (sx >= 0 && sx < fromWidth) out[y * toWidth + x] = text[y * fromWidth + sx];
    }
  }
  let norm = 0;
  for (let i = 0; i < out.length; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

export function createIconIndex(): IconIndex {
  return { bySize: new Map(), size: 0 };
}

export function addTemplate(
  index: IconIndex,
  slotsWide: number,
  slotsHigh: number,
  template: IconTemplate,
): void {
  const key = sizeKey(slotsWide, slotsHigh);
  const list = index.bySize.get(key) ?? [];
  list.push(template);
  index.bySize.set(key, list);
  index.size++;
}

/**
 * Adds an item's upright template and, for non-square items, its rotated
 * one. Returns false when the grid image does not have the expected size.
 */
export function addCatalogIcon(index: IconIndex, item: CatalogIcon): boolean {
  const { width: w, height: h } = item;
  if (item.grid.width !== expectedSize(w) || item.grid.height !== expectedSize(h)) {
    return false;
  }

  // Art features skip the short-name band, so the grid image serves both.
  const upright = templateFeatures(item.grid, w, h);
  addTemplate(index, w, h, {
    itemId: item.id,
    shortName: item.shortName,
    rotated: false,
    features: {
      artCoarse: quantise(upright.artCoarse),
      artFine: quantise(upright.artFine),
      textWidth: upright.textWidth,
      text: quantise(upright.text),
    },
  });

  if (w !== h) {
    // In-game, rotated items keep their short name upright in the corner.
    const rotated = templateFeatures(rotateClockwise(item.grid), h, w);
    addTemplate(index, h, w, {
      itemId: item.id,
      shortName: item.shortName,
      rotated: true,
      features: {
        artCoarse: quantise(rotated.artCoarse),
        artFine: quantise(rotated.artFine),
        textWidth: textWidthFor(h),
        text: quantise(realignText(upright.text, upright.textWidth, textWidthFor(h))),
      },
    });
  }
  return true;
}

export function buildIconIndex(icons: Iterable<CatalogIcon>): IconIndex {
  const index = createIconIndex();
  for (const item of icons) addCatalogIcon(index, item);
  return index;
}

const COARSE_KEEP = 25;
const ART_WEIGHT = 0.35;
const TEXT_WEIGHT = 0.65;

/** Below both of these a cell has no short name and flat art: empty slot. */
const EMPTY_TEXT_INK = 0.01;
const EMPTY_ART_CONTRAST = 12;

export function matchCell(features: CellFeatures, index: IconIndex): CellResult {
  const templates =
    index.bySize.get(sizeKey(features.slotsWide, features.slotsHigh)) ?? [];

  if (features.textInk < EMPTY_TEXT_INK && features.artContrast < EMPTY_ART_CONTRAST) {
    return { empty: true, matches: [], margin: 0 };
  }

  // Shortlist by art and by text separately: either can be unreliable on its
  // own (a re-rendered icon, a name partly hidden by artwork), and a combined
  // coarse score would drop the right item whenever one of them is.
  const byArt = templates
    .map((template) => ({ template, score: dot(features.artCoarse, template.features.artCoarse) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, COARSE_KEEP);
  const byText = templates
    .map((template) => ({ template, score: dot(features.text, template.features.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, COARSE_KEEP);
  const coarse = [...new Set([...byArt, ...byText].map((c) => c.template))].map(
    (template) => ({ template }),
  );

  const matches: CellMatch[] = coarse
    .map(({ template }) => {
      const artScore = dot(features.artFine, template.features.artFine);
      const textScore = shiftedTextScore(
        features.text,
        features.textWidth,
        template.features.text,
        template.features.textWidth,
        2,
        1,
      );
      return {
        itemId: template.itemId,
        shortName: template.shortName,
        rotated: template.rotated,
        artScore,
        textScore,
        score: ART_WEIGHT * artScore + TEXT_WEIGHT * textScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = matches[0];
  const runnerUp = matches.find((m) => best && m.itemId !== best.itemId);
  const margin = best && runnerUp ? best.score - runnerUp.score : best ? best.score : 0;
  return { empty: false, matches: matches.slice(0, 5), margin };
}
