import Tesseract, { PSM } from "tesseract.js";

export interface OcrSettings {
  scale: number;
  contrast: number;
  brightness: number;
  sharpen: boolean;
  invert: boolean;
  psm: PSM;
  whitelist: string;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrResult {
  text: string;
  words: OcrWord[];
  settings: OcrSettings;
  matchedCount: number;
}

// Default settings optimized for Tarkov stash screenshots
export const DEFAULT_OCR_SETTINGS: OcrSettings = {
  scale: 2,
  contrast: 1.4,
  brightness: 1.1,
  sharpen: true,
  invert: false,
  psm: PSM.SPARSE_TEXT,
  whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.",
};

// Preset configurations to try during auto-tuning
export const OCR_PRESETS: OcrSettings[] = [
  // Default - good for most cases
  { ...DEFAULT_OCR_SETTINGS },
  // High contrast for faded text
  { ...DEFAULT_OCR_SETTINGS, contrast: 1.8, brightness: 1.2 },
  // Scaled up for small text
  { ...DEFAULT_OCR_SETTINGS, scale: 3, contrast: 1.5 },
  // Inverted for light backgrounds
  { ...DEFAULT_OCR_SETTINGS, invert: true, contrast: 1.3 },
  // Single block mode
  { ...DEFAULT_OCR_SETTINGS, psm: PSM.SINGLE_BLOCK, scale: 2.5 },
  // Auto OSD mode
  { ...DEFAULT_OCR_SETTINGS, psm: PSM.AUTO_OSD, scale: 2 },
];

/**
 * Preprocess image on canvas for better OCR results
 */
export async function preprocessImage(
  imageUrl: string,
  settings: OcrSettings,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Scale the image
      const scaledWidth = Math.round(img.width * settings.scale);
      const scaledHeight = Math.round(img.height * settings.scale);
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // Draw scaled image
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      // Get image data for pixel manipulation
      const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
      const data = imageData.data;

      // Apply contrast and brightness
      const contrast = settings.contrast;
      const brightness = settings.brightness;
      const factor =
        (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        let r = data[i] * brightness;
        let g = data[i + 1] * brightness;
        let b = data[i + 2] * brightness;

        // Apply contrast
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));

        // Invert if needed
        if (settings.invert) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Apply sharpening using convolution
      if (settings.sharpen) {
        const sharpenedData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        applyConvolution(sharpenedData, kernel, scaledWidth, scaledHeight);
        ctx.putImageData(sharpenedData, 0, 0);
      }

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

/**
 * Apply convolution kernel to image data
 */
function applyConvolution(
  imageData: ImageData,
  kernel: number[],
  width: number,
  height: number,
): void {
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  const kSize = 3;
  const kHalf = Math.floor(kSize / 2);

  for (let y = kHalf; y < height - kHalf; y++) {
    for (let x = kHalf; x < width - kHalf; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = x + kx - kHalf;
          const py = y + ky - kHalf;
          const idx = (py * width + px) * 4;
          const kVal = kernel[ky * kSize + kx];

          r += copy[idx] * kVal;
          g += copy[idx + 1] * kVal;
          b += copy[idx + 2] * kVal;
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }
}

/**
 * Parse raw OCR text into tokens
 */
function parseRawTextToTokens(rawText: string): string[] {
  // Split by common delimiters found in OCR output
  return rawText
    .split(/[\s|,\[\](){}]+/)
    .map((t) =>
      t
        .trim()
        .replace(/[:.#@]+$/, "")
        .replace(/^[:.#@]+/, ""),
    )
    .filter((t) => t.length >= 2 && /^[A-Za-z]/.test(t));
}

/**
 * Run OCR with specific settings
 */
export async function runOcrWithSettings(
  imageUrl: string,
  settings: OcrSettings,
  onProgress?: (progress: number) => void,
): Promise<OcrResult> {
  // Preprocess the image
  const processedUrl = await preprocessImage(imageUrl, settings);

  // Run Tesseract
  const result = await Tesseract.recognize(processedUrl, "eng", {
    logger: (m) => {
      if (
        m.status === "recognizing text" &&
        typeof m.progress === "number" &&
        onProgress
      ) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const rawText = result.data.text || "";

  // Try to get words from the result structure (works in browser)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ocrData = result.data as any;
  let words: OcrWord[] = [];

  // Check if words array exists and has data
  if (ocrData.words && ocrData.words.length > 0) {
    words = ocrData.words
      .filter(
        (w: { text: string; confidence: number }) =>
          w.text && w.text.trim().length >= 2 && w.confidence > 30,
      )
      .map(
        (w: {
          text: string;
          confidence: number;
          bbox: { x0: number; y0: number; x1: number; y1: number };
        }) => ({
          text: w.text.trim(),
          confidence: w.confidence,
          bbox: {
            x0: Math.round(w.bbox.x0 / settings.scale),
            y0: Math.round(w.bbox.y0 / settings.scale),
            x1: Math.round(w.bbox.x1 / settings.scale),
            y1: Math.round(w.bbox.y1 / settings.scale),
          },
        }),
      );
  }

  // Fallback: parse raw text if no words array (common in Node.js/some browsers)
  if (words.length === 0) {
    const tokens = parseRawTextToTokens(rawText);
    // Mark these as having no real bbox (null) so UI knows not to draw overlay boxes
    words = tokens.map((text) => ({
      text,
      confidence: 80, // Default confidence for parsed tokens
      bbox: null as unknown as {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
      }, // No real bbox available
    }));
  }

  return {
    text: rawText,
    words,
    settings,
    matchedCount: 0, // Will be set by caller after matching
  };
}

/**
 * Auto-tune OCR settings by trying multiple presets and picking the best
 */
export async function autoTuneOcr(
  imageUrl: string,
  matchTokens: (tokens: string[]) => number,
  onProgress?: (preset: number, total: number, progress: number) => void,
): Promise<OcrResult> {
  let bestResult: OcrResult | null = null;
  let bestMatchCount = 0;

  for (let i = 0; i < OCR_PRESETS.length; i++) {
    const preset = OCR_PRESETS[i];

    try {
      const result = await runOcrWithSettings(imageUrl, preset, (progress) =>
        onProgress?.(i + 1, OCR_PRESETS.length, progress),
      );

      // Count how many tokens match known items
      const tokens = result.words.map((w) => w.text);
      const matchCount = matchTokens(tokens);
      result.matchedCount = matchCount;

      console.log(
        `Preset ${i + 1}: ${matchCount} matches from ${tokens.length} tokens`,
      );

      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestResult = result;
      }

      // If we found a lot of matches, we can stop early
      if (matchCount >= 20) {
        console.log("Found good result, stopping early");
        break;
      }
    } catch (error) {
      console.error(`Preset ${i + 1} failed:`, error);
    }
  }

  if (!bestResult) {
    // Fallback to default settings
    bestResult = await runOcrWithSettings(imageUrl, DEFAULT_OCR_SETTINGS);
  }

  return bestResult;
}

/**
 * Quick scan with default settings (faster, for initial preview)
 */
export async function quickScan(
  imageUrl: string,
  onProgress?: (progress: number) => void,
): Promise<OcrResult> {
  return runOcrWithSettings(imageUrl, DEFAULT_OCR_SETTINGS, onProgress);
}
