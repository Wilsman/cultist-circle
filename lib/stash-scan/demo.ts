// The /scan/demo sample: a screenshot dropped into public/scan-demo/, scanned
// once per file version and icon index, then served from memory.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { IconIndex } from "./matcher";
import { scanImage } from "./scan";
import type { ScanImageResult } from "./types";

const DEMO_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "scan-demo",
);

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export interface DemoFile {
  file: string;
  contentType: string;
  /** Changes whenever the file is replaced. */
  version: string;
}

/** Finds `demo.png`, `demo.jpg`, `demo.jpeg` or `demo.webp`, if present. */
export async function findDemoFile(): Promise<DemoFile | null> {
  let names: string[];
  try {
    names = await readdir(DEMO_DIR);
  } catch {
    return null;
  }
  for (const name of names.sort()) {
    const extension = path.extname(name).toLowerCase();
    if (path.basename(name, path.extname(name)) !== "demo" || !CONTENT_TYPES[extension]) {
      continue;
    }
    const file = path.join(/* turbopackIgnore: true */ DEMO_DIR, name);
    const info = await stat(file);
    return {
      file,
      contentType: CONTENT_TYPES[extension],
      version: `${Math.round(info.mtimeMs)}-${info.size}`,
    };
  }
  return null;
}

let cached: {
  version: string;
  index: IconIndex;
  result: Promise<ScanImageResult>;
} | null = null;

export function getDemoScan(demo: DemoFile, index: IconIndex): Promise<ScanImageResult> {
  if (cached && cached.version === demo.version && cached.index === index) {
    return cached.result;
  }
  const result = (async () => {
    const { data, info } = await sharp(await readFile(demo.file))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return scanImage(
      {
        data,
        width: info.width,
        height: info.height,
      },
      index,
    );
  })();
  cached = { version: demo.version, index, result };
  // Do not keep a failed scan around.
  result.catch(() => {
    if (cached?.result === result) cached = null;
  });
  return result;
}
