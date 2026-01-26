import { createWorker, PSM } from "tesseract.js";
import { normalizeOcrLabel } from "../lib/stash-scan";
import Fuse from "fuse.js";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type GroundTruthEntry = { label: string; count: number };

type GroundTruthMap = Record<string, GroundTruthEntry[]>;

type OcrConfig = {
  id: string;
  label: string;
  scale: number;
  highContrast: boolean;
  sharpen?: boolean;
  gamma?: number;
  threshold?: number;
  invert?: boolean;
  whitelist: string;
  psm: PSM;
  rowScan?: boolean;
  rowCount?: number;
  gridScan?: boolean;
  labelStripRatio?: number;
};

const DEFAULT_CONFIGS: OcrConfig[] = [
  {
    id: "sparse-2x-contrast",
    label: "SPARSE 2x + contrast",
    scale: 2,
    highContrast: true,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SPARSE_TEXT,
  },
  {
    id: "sparse-2x",
    label: "SPARSE 2x",
    scale: 2,
    highContrast: false,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SPARSE_TEXT,
  },
  {
    id: "auto-2x-contrast",
    label: "AUTO 2x + contrast",
    scale: 2,
    highContrast: true,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.AUTO,
  },
  {
    id: "block-2x",
    label: "BLOCK 2x",
    scale: 2,
    highContrast: true,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SINGLE_BLOCK,
  },
  {
    id: "sparse-3x-contrast",
    label: "SPARSE 3x + contrast",
    scale: 3,
    highContrast: true,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SPARSE_TEXT,
  },
  {
    id: "sparse-3x-gamma",
    label: "SPARSE 3x + gamma",
    scale: 3,
    highContrast: false,
    gamma: 1.2,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SPARSE_TEXT,
  },
  {
    id: "sparse-3x-gamma-1-4",
    label: "SPARSE 3x + gamma 1.4",
    scale: 3,
    highContrast: false,
    gamma: 1.4,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SPARSE_TEXT,
  },
  {
    id: "sparse-3x-threshold",
    label: "SPARSE 3x + threshold",
    scale: 3,
    highContrast: false,
    threshold: 170,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SPARSE_TEXT,
  },
  {
    id: "auto-3x-threshold",
    label: "AUTO 3x + threshold",
    scale: 3,
    highContrast: false,
    threshold: 170,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.AUTO,
  },
  {
    id: "rows-14-2x",
    label: "ROWSCAN 14x 2x",
    scale: 2,
    highContrast: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SINGLE_LINE,
    rowScan: true,
    rowCount: 14,
  },
  {
    id: "grid-12x24",
    label: "GRID 12x24 labels",
    scale: 3,
    highContrast: true,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SINGLE_WORD,
    gridScan: true,
  },
  {
    id: "labelstrip-14x",
    label: "LABELSTRIP 14x (psm7)",
    scale: 3,
    highContrast: false,
    threshold: 170,
    invert: true,
    sharpen: true,
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-'#",
    psm: PSM.SINGLE_LINE,
    rowScan: true,
    rowCount: 14,
    labelStripRatio: 0.28,
  },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const images: string[] = [];
  let gtPath = "";
  let gtMapPath = "";
  let minConfidence = 40;
  let useWordlist = true;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--gt") {
      gtPath = args[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--gt-map") {
      gtMapPath = args[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--conf") {
      minConfidence = Number(args[i + 1] ?? "40");
      i += 1;
      continue;
    }
    if (arg === "--no-wordlist") {
      useWordlist = false;
      continue;
    }
    if (!arg.startsWith("--")) images.push(arg);
  }
  return { images, gtPath, gtMapPath, minConfidence, useWordlist };
};

const readGroundTruth = (gtPath: string): GroundTruthEntry[] | null => {
  if (!gtPath) return null;
  const raw = fs.readFileSync(gtPath, "utf8");
  return JSON.parse(raw) as GroundTruthEntry[];
};

const readGroundTruthMap = (gtMapPath: string): GroundTruthMap | null => {
  if (!gtMapPath) return null;
  const raw = fs.readFileSync(gtMapPath, "utf8");
  return JSON.parse(raw) as GroundTruthMap;
};

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

const fetchWordlist = async () => {
  const query = `
    {
      items(gameMode: regular, lang: en) {
        shortName
      }
    }
  `;
  const response = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  const result = (await response.json()) as {
    data?: { items?: Array<{ shortName?: string | null }> };
  };
  const items = result.data?.items ?? [];
  const unique = new Set<string>();
  items.forEach((item) => {
    if (item.shortName) unique.add(item.shortName);
  });
  return Array.from(unique).join("\n");
};


const parseTsvTokens = (tsv: string, minConfidence: number): string[] => {
  if (!tsv) return [];
  const rows = tsv.trim().split(/\r?\n/);
  if (rows.length <= 1) return [];
  const tokens: string[] = [];
  rows.slice(1).forEach((row) => {
    const cols = row.split("\t");
    if (cols.length < 12) return;
    const level = Number(cols[0]);
    if (level !== 5) return;
    const conf = Number(cols[10]);
    const text = cols.slice(11).join("\t").trim();
    if (!text) return;
    if (Number.isFinite(conf) && conf < minConfidence) return;
    tokens.push(text);
  });
  return tokens;
};

const getRowRectangles = (width: number, height: number, rows: number) => {
  const rowHeight = Math.floor(height / rows);
  return Array.from({ length: rows }, (_, index) => ({
    left: 0,
    top: index * rowHeight,
    width,
    height: index === rows - 1 ? height - index * rowHeight : rowHeight,
  }));
};

const getGridLabelRects = (
  width: number,
  height: number,
  cols: number,
  rows: number
) => {
  const rects: Array<{ left: number; top: number; width: number; height: number }> = [];
  const cellWidth = Math.floor(width / cols);
  const cellHeight = Math.floor(height / rows);
  const labelHeight = Math.max(14, Math.floor(cellHeight * 0.28));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      rects.push({
        left: col * cellWidth,
        top: row * cellHeight,
        width: cellWidth,
        height: labelHeight,
      });
    }
  }
  return rects;
};

const buildGroundTruthComparison = (tokens: string[], gt: GroundTruthEntry[]) => {
  const normalizedTokens = tokens
    .map((token) => normalizeOcrLabel(token))
    .filter((token) => token.length >= 2);
  const tokenCounts = new Map<string, number>();
  normalizedTokens.forEach((token) => {
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  });

  const missing: Array<{ label: string; expected: number; found: number }> = [];
  let matched = 0;
  gt.forEach((entry) => {
    const key = normalizeOcrLabel(entry.label);
    const found = tokenCounts.get(key) ?? 0;
    if (found < entry.count) {
      missing.push({ label: entry.label, expected: entry.count, found });
    } else {
      matched += 1;
    }
  });

  const gtTokens = gt.map((entry) => normalizeOcrLabel(entry.label));
  const fuse = new Fuse(gtTokens.map((token) => ({ token })), {
    keys: ["token"],
    threshold: 0.35,
    includeScore: true,
  });
  const aliasCandidates: Array<{ token: string; suggestion: string; score: number }> = [];
  tokenCounts.forEach((_count, token) => {
    if (gtTokens.includes(token)) return;
    const best = fuse.search(token, { limit: 1 })[0];
    if (!best || best.score == null) return;
    if (best.score > 0.25) return;
    aliasCandidates.push({ token, suggestion: best.item.token, score: best.score });
  });

  return { matched, missing, aliasCandidates };
};

const run = async () => {
  const { images, gtPath, gtMapPath, minConfidence, useWordlist } = parseArgs();
  if (images.length === 0) {
    console.error("Usage: bun tools/ocr-eval.ts <image...> [--gt file.json] [--gt-map map.json] [--conf 40]");
    process.exit(1);
  }

  const gt = readGroundTruth(gtPath);
  const gtMap = readGroundTruthMap(gtMapPath);

  const preprocess = async (
    filePath: string,
    config: OcrConfig
  ) => {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const width = metadata.width
      ? Math.round(metadata.width * config.scale)
      : undefined;
    const height = metadata.height
      ? Math.round(metadata.height * config.scale)
      : undefined;
    let pipeline = image.resize(width, height, { kernel: "lanczos3" });
    if (config.highContrast) {
      pipeline = pipeline.linear(1.35, -45).grayscale();
    }
    if (config.gamma) {
      pipeline = pipeline.gamma(config.gamma);
    }
    if (config.sharpen) {
      pipeline = pipeline.sharpen();
    }
    if (config.threshold) {
      pipeline = pipeline.threshold(config.threshold);
    }
    if (config.invert) {
      pipeline = pipeline.negate();
    }
    return pipeline.toBuffer();
  };

  const wordlist = useWordlist ? await fetchWordlist() : "";

  for (const config of DEFAULT_CONFIGS) {
    console.log(`\nConfig: ${config.label}`);
    for (const imagePath of images) {
      const imageKey = path.basename(imagePath);
      const gtForImage = gt ?? (gtMap ? gtMap[imageKey] : null);
      const worker = await createWorker(
        "eng",
        1,
        {},
        useWordlist
          ? {
              load_system_dawg: "0",
              load_freq_dawg: "0",
            }
          : {}
      );
      try {
        if (useWordlist && wordlist) {
          await worker.writeText("/user-words", wordlist);
        }
        await worker.setParameters({
          tessedit_char_whitelist: config.whitelist,
          tessedit_pageseg_mode: config.psm,
          ...(useWordlist
            ? {
                user_words_file: "/user-words",
              }
            : {}),
        });
        const imageBuffer = await preprocess(imagePath, config);
        let tokens: string[] = [];
        if (config.gridScan) {
          const meta = await sharp(imageBuffer).metadata();
          const width = meta.width ?? 0;
          const height = meta.height ?? 0;
          const rectangles = getGridLabelRects(width, height, 12, 24);
          for (const rectangle of rectangles) {
            const { data } = await worker.recognize(
              imageBuffer,
              { rectangle },
              { text: true, tsv: true }
            );
            tokens.push(...parseTsvTokens(data?.tsv ?? "", minConfidence));
          }
        } else if (config.rowScan) {
          const meta = await sharp(imageBuffer).metadata();
          const width = meta.width ?? 0;
          const height = meta.height ?? 0;
          const rectangles = getRowRectangles(
            width,
            height,
            config.rowCount ?? 14
          ).map((rect) =>
            config.labelStripRatio
              ? {
                  ...rect,
                  height: Math.max(
                    1,
                    Math.floor(rect.height * config.labelStripRatio)
                  ),
                }
              : rect
          );
          for (const rectangle of rectangles) {
            const { data } = await worker.recognize(
              imageBuffer,
              { rectangle },
              { text: true, tsv: true }
            );
            tokens.push(...parseTsvTokens(data?.tsv ?? "", minConfidence));
          }
        } else {
          const { data } = await worker.recognize(
            imageBuffer,
            {},
            { text: true, tsv: true }
          );
          tokens = parseTsvTokens(data?.tsv ?? "", minConfidence);
        }
        const comparison = gtForImage
          ? buildGroundTruthComparison(tokens, gtForImage)
          : null;
        if (!comparison) {
          console.log(`- ${imageKey}: tokens=${tokens.length} (no ground truth)`);
          continue;
        }
        console.log(
          `- ${imageKey}: matched=${comparison.matched} missing=${comparison.missing.length} alias=${comparison.aliasCandidates.length}`
        );
      } catch (error) {
        console.error(`- ${imageKey}: OCR failed`, error);
      } finally {
        await worker.terminate();
      }
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
