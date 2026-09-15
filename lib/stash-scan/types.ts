// Shapes shared by the stash scan API route and the client.

export type ScanConfidence = "high" | "medium" | "low";

export interface ScanCandidate {
  itemId: string;
  shortName: string;
  rotated: boolean;
  score: number;
}

export interface ScanCell {
  x: number;
  y: number;
  width: number;
  height: number;
  slotsWide: number;
  slotsHigh: number;
  /** An empty inventory slot; `matches` is empty. */
  empty: boolean;
  confidence: ScanConfidence;
  /** Most likely first. */
  matches: ScanCandidate[];
}

/** A cell rectangle to match, for re-checking part of a screenshot. */
export interface ScanRect {
  x: number;
  y: number;
  width: number;
  height: number;
  slotsWide: number;
  slotsHigh: number;
}

export interface ScanImageResult {
  width: number;
  height: number;
  /** Detected slot size in pixels; 0 when no inventory grid was found. */
  pitch: number;
  cells: ScanCell[];
}

export interface ScanResponse {
  images: ScanImageResult[];
}

export interface ScanErrorResponse {
  error: string;
  code:
    | "no-images"
    | "too-many-images"
    | "image-too-large"
    | "unsupported-type"
    | "unreadable-image"
    | "rate-limited"
    | "busy"
    | "warming-up"
    | "unavailable";
  retryAfterSeconds?: number;
}

export const SCAN_LIMITS = {
  /** Screenshots per scan session; the client uploads them one per request. */
  maxImages: 6,
  /**
   * Largest upload the API accepts. Vercel rejects request bodies over
   * 4.5 MB, so the client downscales and re-encodes screenshots to fit.
   */
  maxBytesPerImage: 4 * 1024 * 1024,
  /** Largest file the client accepts before preparing it. */
  maxSourceBytes: 50 * 1024 * 1024,
  /** Rectangles accepted in one re-match request. */
  maxRects: 24,
  /** Decoded pixel cap per image (roughly 8K). */
  maxPixels: 7680 * 4320,
  acceptedTypes: ["image/png", "image/jpeg", "image/webp"],
} as const;

export type DemoScanResponse =
  | { available: false }
  | { available: true; imageUrl: string; images: ScanImageResult[] };
