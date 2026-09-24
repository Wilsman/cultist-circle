// Client-side screenshot preparation: keep uploads under the API's size limit
// (Vercel rejects request bodies over 4.5 MB) without hurting recognition.

import { SCAN_LIMITS } from "./types";

/**
 * Largest UI scale kept, relative to 1080p. The game scales its UI with the
 * smaller of width/1920 and height/1080, so this is "1440p-sized slots"
 * (84 px). Recognition was verified at 63 and 84 px slots; larger screenshots
 * only cost upload size.
 */
export const MAX_UI_SCALE = 4 / 3;

/** JPEG qualities tried in order until the upload fits. */
const JPEG_QUALITIES = [0.92, 0.85, 0.75, 0.65, 0.55];

export interface TargetSize {
  width: number;
  height: number;
  resized: boolean;
}

/** Output size for a screenshot, never upscaling. */
export function targetSize(width: number, height: number): TargetSize {
  const uiScale = Math.min(width / 1920, height / 1080);
  const factor = uiScale > MAX_UI_SCALE ? MAX_UI_SCALE / uiScale : 1;
  if (factor >= 1) return { width, height, resized: false };
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
    resized: true,
  };
}

export class ScreenshotTooLargeError extends Error {}

/**
 * Returns the file itself when it already fits and needs no downscaling;
 * otherwise a downscaled JPEG under `SCAN_LIMITS.maxBytesPerImage`.
 */
export async function prepareScreenshot(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = targetSize(bitmap.width, bitmap.height);
    if (!size.resized && file.size <= SCAN_LIMITS.maxBytesPerImage) return file;

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    for (const quality of JPEG_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= SCAN_LIMITS.maxBytesPerImage) return blob;
    }
    throw new ScreenshotTooLargeError("The screenshot is too large to upload.");
  } finally {
    bitmap.close();
  }
}
