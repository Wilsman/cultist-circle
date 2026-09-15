import { NextResponse, type NextRequest } from "next/server";
import { decodeRgb } from "@/lib/stash-scan/index-builder";
import {
  getIconIndex,
  getIndexStatus,
  isIndexUnavailable,
} from "@/lib/stash-scan/index-store";
import { scanImage, scanRects } from "@/lib/stash-scan/scan";
import {
  SCAN_LIMITS,
  type ScanErrorResponse,
  type ScanImageResult,
  type ScanRect,
  type ScanResponse,
} from "@/lib/stash-scan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A full 1440p container takes about a second of CPU; allow cold starts. */
export const maxDuration = 60;

/** How long a request waits for the icon index on a cold start. */
const INDEX_WAIT_MS = 20000;
/** Scans run one at a time; this many more may wait in line. */
const MAX_QUEUED_SCANS = 8;
/**
 * Images per client IP per window. Both this and the queue are per server
 * instance; on Vercel, pair them with a WAF rate limit rule on this path.
 */
const RATE_LIMIT_IMAGES = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const imagesByClient = new Map<string, number[]>();
let queue: Promise<void> = Promise.resolve();
let queued = 0;

function errorResponse(body: ScanErrorResponse, status: number) {
  const headers: Record<string, string> = {};
  if (body.retryAfterSeconds) headers["Retry-After"] = String(body.retryAfterSeconds);
  return NextResponse.json(body, { status, headers });
}

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Records `count` images for the client; returns seconds to wait if over. */
function consumeRateLimit(key: string, count: number): number {
  const now = Date.now();
  const recent = (imagesByClient.get(key) ?? []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length + count > RATE_LIMIT_IMAGES) {
    imagesByClient.set(key, recent);
    const oldest = recent[0] ?? now;
    return Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
  }
  for (let i = 0; i < count; i++) recent.push(now);
  imagesByClient.set(key, recent);

  // Keep the map from growing without bound.
  if (imagesByClient.size > 5000) {
    for (const [client, times] of imagesByClient) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) {
        imagesByClient.delete(client);
      }
    }
  }
  return 0;
}

/**
 * Parses the optional `rects` field: cell rectangles to match instead of
 * detecting the grid, used when one detected cell holds several items.
 * Returns null when the field is absent, or "invalid" when it is unusable.
 */
function parseRects(value: FormDataEntryValue | null): ScanRect[] | null | "invalid" {
  if (typeof value !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return "invalid";
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return "invalid";
  if (parsed.length > SCAN_LIMITS.maxRects) return "invalid";

  const rects: ScanRect[] = [];
  for (const entry of parsed) {
    const rect = entry as Partial<ScanRect>;
    const numbers = [rect.x, rect.y, rect.width, rect.height, rect.slotsWide, rect.slotsHigh];
    if (numbers.some((n) => typeof n !== "number" || !Number.isFinite(n))) return "invalid";
    if (rect.width! < 8 || rect.height! < 8 || rect.x! < 0 || rect.y! < 0) return "invalid";
    if (rect.slotsWide! < 1 || rect.slotsHigh! < 1 || rect.slotsWide! > 10 || rect.slotsHigh! > 10) {
      return "invalid";
    }
    rects.push({
      x: Math.round(rect.x!),
      y: Math.round(rect.y!),
      width: Math.round(rect.width!),
      height: Math.round(rect.height!),
      slotsWide: Math.round(rect.slotsWide!),
      slotsHigh: Math.round(rect.slotsHigh!),
    });
  }
  return rects;
}

/** Runs scans strictly one after another so they never compete for CPU. */
function enqueue<T>(task: () => Promise<T>): Promise<T> | null {
  if (queued >= MAX_QUEUED_SCANS) return null;
  queued++;
  const run = queue.then(task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run.finally(() => {
    queued--;
  });
}

/** Keeps rectangles inside the image. */
function clampRects(rects: ScanRect[], width: number, height: number): ScanRect[] {
  return rects.map((rect) => ({
    ...rect,
    x: Math.min(rect.x, Math.max(0, width - 2)),
    y: Math.min(rect.y, Math.max(0, height - 2)),
    width: Math.min(rect.width, width - Math.min(rect.x, width - 2)),
    height: Math.min(rect.height, height - Math.min(rect.y, height - 2)),
  }));
}

export async function GET() {
  await getIconIndex(0);
  return NextResponse.json(getIndexStatus());
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(
      { error: "Expected a multipart form with images.", code: "no-images" },
      400,
    );
  }

  const rects = parseRects(form.get("rects"));
  if (rects === "invalid") {
    return errorResponse(
      { error: "The cell rectangles were not understood.", code: "no-images" },
      400,
    );
  }

  const files = form.getAll("images").filter((value): value is File => value instanceof File);
  if (rects && files.length !== 1) {
    return errorResponse(
      { error: "Re-matching cells takes exactly one screenshot.", code: "too-many-images" },
      400,
    );
  }
  if (files.length === 0) {
    return errorResponse({ error: "No images were uploaded.", code: "no-images" }, 400);
  }
  if (files.length > SCAN_LIMITS.maxImages) {
    return errorResponse(
      {
        error: `Upload at most ${SCAN_LIMITS.maxImages} images at a time.`,
        code: "too-many-images",
      },
      400,
    );
  }
  for (const file of files) {
    if (!(SCAN_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) {
      return errorResponse(
        { error: "Only PNG, JPEG and WebP screenshots are supported.", code: "unsupported-type" },
        415,
      );
    }
    if (file.size > SCAN_LIMITS.maxBytesPerImage) {
      return errorResponse(
        {
          error: `Each upload must be under ${Math.round(SCAN_LIMITS.maxBytesPerImage / 1024 / 1024)} MB.`,
          code: "image-too-large",
        },
        413,
      );
    }
  }

  const retryAfter = consumeRateLimit(clientKey(request), files.length);
  if (retryAfter) {
    return errorResponse(
      {
        error: "Too many screenshots scanned recently. Try again in a few minutes.",
        code: "rate-limited",
        retryAfterSeconds: retryAfter,
      },
      429,
    );
  }

  const index = await getIconIndex(INDEX_WAIT_MS);
  if (!index && isIndexUnavailable()) {
    return errorResponse(
      { error: "Stash Scan is not available on this deployment.", code: "unavailable" },
      503,
    );
  }
  if (!index) {
    return errorResponse(
      {
        error: "The item recognition data is still loading. Try again shortly.",
        code: "warming-up",
        retryAfterSeconds: 30,
      },
      503,
    );
  }

  const buffers = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));

  const scan = enqueue(async () => {
    const images: ScanImageResult[] = [];
    for (const buffer of buffers) {
      const decoded = await decodeRgb(buffer, SCAN_LIMITS.maxPixels);
      images.push(
        rects
          ? await scanRects(decoded, clampRects(rects, decoded.width, decoded.height), index)
          : await scanImage(decoded, index),
      );
    }
    return images;
  });

  if (!scan) {
    return errorResponse(
      {
        error: "The scanner is busy. Try again in a moment.",
        code: "busy",
        retryAfterSeconds: 10,
      },
      503,
    );
  }

  try {
    const images = await scan;
    return NextResponse.json({ images } satisfies ScanResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[stash-scan] scan failed:", error);
    return errorResponse(
      { error: "One of the images could not be read.", code: "unreadable-image" },
      422,
    );
  }
}
