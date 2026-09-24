// Compiled icon index file:
//   "CCSI" | uint32 header length | JSON header | Int8 feature data
// The header lists templates as
//   [itemId, shortName, rotated, slotsWide, slotsHigh, textWidth,
//    coarseScale, coarseLength, fineScale, fineLength, textScale, textLength]

import { FEATURE_VERSION, type QuantisedVector } from "./features";
import { addTemplate, createIconIndex, type IconIndex } from "./matcher";

const MAGIC = "CCSI";

type HeaderTemplate = [
  string, string, 0 | 1, number, number, number,
  number, number, number, number, number, number,
];

export interface IndexMetadata {
  featureVersion: number;
  catalogHash: string;
  builtAt: string;
  items: number;
  /** Older index files lack this marker and must be rebuilt before reuse. */
  complete: boolean;
}

interface IndexHeader extends IndexMetadata {
  templates: HeaderTemplate[];
}

/** File name of the index for the current feature version. */
export function indexFileName(): string {
  return `index-v${FEATURE_VERSION}.bin`;
}

export function encodeIndex(index: IconIndex, metadata: IndexMetadata): Buffer {
  const templates: HeaderTemplate[] = [];
  const chunks: Buffer[] = [];
  const push = (vector: QuantisedVector) => {
    chunks.push(Buffer.from(vector.values.buffer, vector.values.byteOffset, vector.values.length));
  };
  for (const [key, list] of index.bySize) {
    const [slotsWide, slotsHigh] = key.split("x").map(Number);
    for (const t of list) {
      const f = t.features;
      templates.push([
        t.itemId, t.shortName, t.rotated ? 1 : 0, slotsWide, slotsHigh, f.textWidth,
        f.artCoarse.scale, f.artCoarse.values.length,
        f.artFine.scale, f.artFine.values.length,
        f.text.scale, f.text.values.length,
      ]);
      push(f.artCoarse);
      push(f.artFine);
      push(f.text);
    }
  }
  const json = Buffer.from(JSON.stringify({ ...metadata, templates } satisfies IndexHeader));
  const prefix = Buffer.alloc(8);
  prefix.write(MAGIC, 0, "ascii");
  prefix.writeUInt32LE(json.length, 4);
  return Buffer.concat([prefix, json, ...chunks]);
}

/**
 * Decodes an index file. Returns null for a foreign file or one written with
 * a different feature version. Template vectors are views into `bytes`.
 */
export function decodeIndex(
  bytes: Buffer,
): { index: IconIndex; metadata: IndexMetadata } | null {
  if (bytes.length < 8 || bytes.toString("ascii", 0, 4) !== MAGIC) return null;
  const headerLength = bytes.readUInt32LE(4);
  const { templates, ...metadata } = JSON.parse(
    bytes.toString("utf8", 8, 8 + headerLength),
  ) as IndexHeader;
  if (metadata.featureVersion !== FEATURE_VERSION) return null;

  const index = createIconIndex();
  let offset = 8 + headerLength;
  const take = (scale: number, length: number): QuantisedVector => {
    const values = new Int8Array(bytes.buffer, bytes.byteOffset + offset, length);
    offset += length;
    return { values, scale };
  };
  for (const [
    itemId, shortName, rotated, slotsWide, slotsHigh, textWidth,
    coarseScale, coarseLength, fineScale, fineLength, textScale, textLength,
  ] of templates) {
    addTemplate(index, slotsWide, slotsHigh, {
      itemId,
      shortName,
      rotated: rotated === 1,
      features: {
        artCoarse: take(coarseScale, coarseLength),
        artFine: take(fineScale, fineLength),
        textWidth,
        text: take(textScale, textLength),
      },
    });
  }
  return { index, metadata };
}
