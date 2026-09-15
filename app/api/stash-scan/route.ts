import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import {
  getIconIndex,
  getIndexStatus,
  warmIconIndex,
} from "@/lib/stash-scan/index-store";
import { scanImage } from "@/lib/stash-scan/scan";
import {
  SCAN_LIMITS,
  type ScanErrorResponse,
  type ScanImageResult,
  type ScanResponse,
} from "@/lib/stash-scan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long a request waits for the icon index on a cold start. */
const INDEX_WAIT_MS = 20000;
/** Scans run one at a time; this many more may wait in line. */
const MAX_QUEUED_SCANS = 8;
/** Images per client IP per window. */
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

export async function GET() {
  warmIconIndex();
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

  const files = form.getAll("images").filter((value): value is File => value instanceof File);
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
          error: `Each image must be under ${Math.round(SCAN_LIMITS.maxBytesPerImage / 1024 / 1024)} MB.`,
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
      const { data, info } = await sharp(buffer, {
        limitInputPixels: SCAN_LIMITS.maxPixels,
      })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      images.push(
        await scanImage(
          {
            data,
            width: info.width,
            height: info.height,
          },
          index,
        ),
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
