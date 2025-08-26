"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { Image as ImageIcon } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface ShareCardButtonProps {
  items: Array<SimplifiedItem | null>;
  total: number;
  totalFlea: number;
  modeLabel: string; // "PVP" | "PVE"
  sacred: boolean; // from ItemSocket (bonus > 0)
  className?: string;
}

function formatRubles(n: number): string {
  return `₽${Math.max(0, Math.floor(n)).toLocaleString()}`;
}

function timerLabel(total: number): string {
  if (total >= 400_000) return "6/14h";
  if (total >= 350_000) return "14h";
  if (total >= 300_000) return "12h";
  if (total >= 200_000) return "8h";
  if (total >= 100_000) return "5h";
  if (total >= 25_000) return "3h";
  return "2h";
}

export default function ShareCardButton({ items, total, totalFlea, modeLabel, sacred, className }: ShareCardButtonProps) {
  const [isCopying, setIsCopying] = useState(false);

  async function copyCard() {
    try {
      setIsCopying(true);
      const width = 800;
      const height = 475; // extra bottom space
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");

      // Preload up to 5 item icons (if available)
      const icons: Array<CanvasImageSource | null> = await Promise.all(
        items.map((it) => loadIconSource(it?.iconLink))
      );

      // Background
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, width, height);

      // Card background
      const pad = 24;
      ctx.fillStyle = "#111827"; // gray-900-ish
      roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.3)"; // slate-400/30
      ctx.stroke();

      // Title
      ctx.fillStyle = "#fde68a"; // amber-200
      ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText("Cultist Circle Sacrifice", pad + 24, pad + 48);

      // Totals
      ctx.fillStyle = "#e5e7eb"; // gray-200
      ctx.font = "600 20px ui-sans-serif, system-ui";
      ctx.fillText(`Base: ${formatRubles(total)}`, pad + 24, pad + 84);
      ctx.font = "600 20px ui-sans-serif, system-ui";
      ctx.fillText(`Cost: ${formatRubles(totalFlea)}`, pad + 230, pad + 84);

      // Subtle divider under totals
      ctx.strokeStyle = "rgba(148,163,184,0.25)"; // slate-400/25
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 20, pad + 96);
      ctx.lineTo(width - pad - 20, pad + 96);
      ctx.stroke();

      // Meta badges (Timer / Mode / Sacred)
      const badgesY = pad + 124;
      const badges = [
        `Timer: ${timerLabel(total)}`,
        `Mode: ${modeLabel}`,
        `Sacred: ${sacred ? "Yes" : "No"}`,
      ];
      let bx = pad + 24;
      ctx.font = "500 14px ui-sans-serif, system-ui";
      for (const t of badges) {
        const metrics = ctx.measureText(t);
        const bw = metrics.width + 18; // horizontal padding
        const bh = 24; // badge height
        drawRoundedBadge(ctx, bx, badgesY - bh + 6, bw, bh);
        ctx.fillStyle = "#e2e8f0"; // slate-200
        ctx.fillText(t, bx + 9, badgesY);
        bx += bw + 12;
      }

      // Items grid (5 rows)
      const startY = pad + 176;
      const rowH = 48;
      ctx.font = "500 18px ui-sans-serif, system-ui";
      items.forEach((it, i) => {
        const y = startY + i * rowH;
        const icon = icons[i];
        const iconX = pad + 24;
        const iconSize = 36;
        const iconY = (y - 8) - iconSize / 2;
        if (icon) {
          // Draw rounded thumbnail background and icon
          ctx.save();
          // subtle background
          ctx.fillStyle = "rgba(51,65,85,0.35)"; // slate-600/35
          roundRect(ctx, iconX, iconY, iconSize, iconSize, 8);
          ctx.fill();
          // clip and draw image with small padding
          ctx.beginPath();
          roundRect(ctx, iconX, iconY, iconSize, iconSize, 8);
          ctx.clip();
          const padImg = 2;
          ctx.drawImage(icon, iconX + padImg, iconY + padImg, iconSize - padImg * 2, iconSize - padImg * 2);
          ctx.restore();
        } else {
          // fallback bullet
          ctx.fillStyle = "#fbbf24"; // amber-400
          ctx.beginPath();
          ctx.arc(pad + 30, y - 8, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        // text
        ctx.fillStyle = "#e5e7eb";
        const name = it?.shortName || it?.name || "Empty";
        const nameX = (icons[i] ? iconX + iconSize + 12 : pad + 50);
        const priceX = width - pad - 28;
        const maxNameWidth = priceX - nameX - 16;
        ctx.fillText(truncateText(ctx, name, maxNameWidth), nameX, y - 2);
        // base value
        if (it) {
          ctx.fillStyle = "#93c5fd"; // blue-300
          ctx.save();
          const priceX = width - pad - 28;
          ctx.textAlign = "right";
          ctx.fillText(formatRubles(Math.floor(it.basePrice)), priceX, y - 2);
          ctx.restore();
        }
        // row separator
        if (i < items.length - 1) {
          ctx.strokeStyle = "rgba(100,116,139,0.15)"; // slate-500/15
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pad + 20, y + 12);
          ctx.lineTo(width - pad - 20, y + 12);
          ctx.stroke();
        }
      });

      // Footer
      ctx.fillStyle = "rgba(148,163,184,0.8)";
      ctx.font = "400 14px ui-sans-serif, system-ui";
      ctx.fillText("cultistcircle.com", pad + 24, height - pad - 16);
      ctx.save();
      ctx.textAlign = "right";
      ctx.fillText(new Date().toLocaleString(), width - pad - 24, height - pad - 16);
      ctx.restore();

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
      if (!blob) throw new Error("Failed to encode PNG");
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      sonnerToast("Share card copied", {
        description: "PNG image placed in your clipboard.",
      });
    } catch (e) {
      console.error(e);
      sonnerToast("Failed to copy", {
        description: "Your browser may block clipboard images. Try again.",
      });
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className={cn("rounded-full border border-slate-600/40", className)}
      onClick={copyCard}
      disabled={isCopying}
    >
      <ImageIcon className="mr-1 h-4 w-4" />
      {isCopying ? "Copying…" : "Copy share card"}
    </Button>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRoundedBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  // Subtle pill-style badge: semi-transparent fill with soft border
  ctx.fillStyle = "rgba(30,41,59,0.6)"; // slate-800/60
  ctx.strokeStyle = "rgba(148,163,184,0.35)"; // slate-400/35
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid + 1;
    else hi = mid;
  }
  return text.slice(0, Math.max(0, lo - 1)) + ellipsis;
}

// Load icon as ImageBitmap using a same-origin proxy first to avoid CORS,
// falling back to the original URL. Returns null on failure.
async function loadIconBitmap(url?: string | null): Promise<ImageBitmap | null> {
  if (!url) return null;
  const proxied = `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`;
  // Try proxied first (same-origin), then fallback to original
  for (const attempt of [proxied, url]) {
    try {
      const res = await fetch(attempt, { cache: "force-cache" });
      if (!res.ok) continue;
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      return bmp;
    } catch {
      // continue to next attempt
    }
  }
  return null;
}

function loadImageDirect(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Broader loader that falls back to HTMLImageElement if ImageBitmap fails.
async function loadIconSource(url?: string | null): Promise<CanvasImageSource | null> {
  if (!url) return null;
  // Try direct HTMLImageElement with CORS first (often works with assets.tarkov.dev)
  const direct = await loadImageDirect(url);
  if (direct) return direct;
  // Next try ImageBitmap path (fast path)
  const bmp = await loadIconBitmap(url);
  if (bmp) return bmp;
  // Fallback to HTMLImageElement via blob URL (same-origin), avoiding CORS taint
  const candidates = [
    `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`,
    url,
  ];
  for (const attempt of candidates) {
    try {
      const res = await fetch(attempt, { cache: "force-cache" });
      if (!res.ok) continue;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.decoding = "async";
      img.src = objectUrl;
      await img.decode().catch(() => new Promise((resolve) => (img.onload = () => resolve(undefined))));
      // Revoke after decode to free memory
      URL.revokeObjectURL(objectUrl);
      return img;
    } catch {
      // try next
    }
  }
  return null;
}
