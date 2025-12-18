"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast as sonnerToast } from "sonner";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { loadItemsFromCode, generateShareableCode } from "@/lib/share-utils";
import {
  ClipboardIcon,
  CopyIcon,
  ShareIcon,
  MessageCircle,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
// Clock icon removed - not used

interface ShareButtonProps {
  selectedItems: (SimplifiedItem | null)[];
  isPVE: boolean;
  rawItemsData: SimplifiedItem[];
  total: number;
  totalFlea: number;
  sacred: boolean;
  onItemsLoaded: (
    items: (SimplifiedItem | null)[],
    isPVE: boolean | null
  ) => void;
}

function getThresholdLabel(total: number): string {
  if (total >= 400_000) return ">400,000";
  if (total >= 350_000) return ">350,000";
  if (total >= 300_000) return ">300,000";
  if (total >= 200_000) return ">200,000";
  if (total >= 100_000) return ">100,000";
  if (total >= 25_000) return ">25,000";
  return "<25,000";
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

function getPredictedTimer(total: number): string {
  if (total >= 400_000) return "6h or 14h (25%/75%)";
  if (total >= 350_000) return "14h";
  if (total >= 300_000) return "12h";
  if (total >= 200_000) return "8h";
  if (total >= 100_000) return "5h";
  if (total >= 25_000) return "3h";
  return "2h";
}

type ActualTimer = "6h" | "12h" | "14h";

const TIMER_OPTIONS: { value: ActualTimer; label: string }[] = [
  { value: "6h", label: "6 hours" },
  { value: "12h", label: "12 hours" },
  { value: "14h", label: "14 hours" },
];

export function ShareButton({
  selectedItems,
  isPVE,
  rawItemsData,
  total,
  totalFlea,
  sacred,
  onItemsLoaded,
}: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");

  const modeLabel = isPVE ? "PVE" : "PVP";
  const items = selectedItems;

  useEffect(() => {
    const code = generateShareableCode(selectedItems, isPVE);
    setCurrentCode(code);
  }, [selectedItems, isPVE]);

  const handleCopyCode = () => {
    if (!currentCode) {
      sonnerToast("No Items Selected", {
        description: "Please select at least one item to share.",
      });
      return;
    }

    setIsLoading(true);
    navigator.clipboard
      .writeText(currentCode)
      .then(() => {
        const itemCount = selectedItems.filter((item) => item !== null).length;
        sonnerToast("Code Copied!", {
          description: `Shareable code copied to clipboard. ${itemCount} item${
            itemCount > 1 ? "s" : ""
          } included.`,
        });
      })
      .catch((err) => {
        console.error("Failed to copy code:", err);
        sonnerToast("Failed to Copy Code", {
          description: "Please try again or manually copy the code.",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Discord copy with timer selection
  const handleCopyForResults = (actualTimer: ActualTimer) => {
    const filteredItems = selectedItems.filter(
      (item): item is SimplifiedItem => item !== null
    );
    if (filteredItems.length === 0) {
      sonnerToast("No Items Selected", {
        description: "Please select at least one item to share.",
      });
      return;
    }

    const itemsList = filteredItems.map((item) => `- ${item.name}`).join("\n");

    const discordText = `__Input__:
||${currentCode}||
${itemsList}

**Threshold**: ${getThresholdLabel(total)}
**Predicted**: ${getPredictedTimer(total)}
**Actual Timer**: ${actualTimer} ⏱️
**Mode**: ${isPVE ? "PVE" : "PVP"}
**Sacred Amulet**: ${sacred ? "✅ Yes" : "❌ No"}

__Output__:
- *(edit this when ritual completes)*
`;

    setIsLoading(true);
    navigator.clipboard
      .writeText(discordText)
      .then(() => {
        sonnerToast(`Copied for #results (${actualTimer})`, {
          description: "Paste into Discord!",
        });
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        sonnerToast("Failed to Copy", {
          description: "Please try again.",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleLoadFromClipboard = async () => {
    try {
      setIsLoading(true);
      const clipboardText = await navigator.clipboard.readText();
      const trimmedCode = clipboardText.trim();

      if (!trimmedCode) {
        sonnerToast("Empty Clipboard", {
          description: "Your clipboard is empty. Copy a code first.",
        });
        setIsLoading(false);
        return;
      }

      const result = loadItemsFromCode(trimmedCode, rawItemsData);
      setIsLoading(false);

      if (result.items) {
        onItemsLoaded(result.items, result.isPVE);
        sonnerToast("Items Loaded!", {
          description: `Loaded ${
            result.items.filter(Boolean).length
          } items from code.`,
        });
      }
    } catch {
      setIsLoading(false);
      sonnerToast("Clipboard Access Failed", {
        description:
          "Unable to access clipboard. Please paste the code manually.",
      });
    }
  };

  // Copy share card as PNG image
  async function handleCopyShareCard() {
    try {
      setIsLoading(true);
      const width = 800;
      const height = 475;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");

      const icons: Array<CanvasImageSource | null> = await Promise.all(
        items.map((it) => loadIconSource(it?.iconLink))
      );

      // Background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      // Card background
      const pad = 24;
      ctx.fillStyle = "#111827";
      roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.3)";
      ctx.stroke();

      // Title
      ctx.fillStyle = "#fde68a";
      ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText("Cultist Circle Sacrifice", pad + 24, pad + 48);

      // Totals
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "600 20px ui-sans-serif, system-ui";
      ctx.fillText(`Base: ${formatRubles(total)}`, pad + 24, pad + 84);
      ctx.font = "600 20px ui-sans-serif, system-ui";
      ctx.fillText(`Cost: ${formatRubles(totalFlea)}`, pad + 230, pad + 84);

      // Divider
      ctx.strokeStyle = "rgba(148,163,184,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 20, pad + 96);
      ctx.lineTo(width - pad - 20, pad + 96);
      ctx.stroke();

      // Meta badges
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
        const bw = metrics.width + 18;
        const bh = 24;
        drawRoundedBadge(ctx, bx, badgesY - bh + 6, bw, bh);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(t, bx + 9, badgesY);
        bx += bw + 12;
      }

      // Items grid
      const startY = pad + 176;
      const rowH = 48;
      ctx.font = "500 18px ui-sans-serif, system-ui";
      items.forEach((it, i) => {
        const y = startY + i * rowH;
        const icon = icons[i];
        const iconX = pad + 24;
        const iconSize = 36;
        const iconY = y - 8 - iconSize / 2;
        if (icon) {
          ctx.save();
          ctx.fillStyle = "rgba(51,65,85,0.35)";
          roundRect(ctx, iconX, iconY, iconSize, iconSize, 8);
          ctx.fill();
          ctx.beginPath();
          roundRect(ctx, iconX, iconY, iconSize, iconSize, 8);
          ctx.clip();
          const padImg = 2;
          ctx.drawImage(
            icon,
            iconX + padImg,
            iconY + padImg,
            iconSize - padImg * 2,
            iconSize - padImg * 2
          );
          ctx.restore();
        } else {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(pad + 30, y - 8, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#e5e7eb";
        const name = it?.shortName || it?.name || "Empty";
        const nameX = icons[i] ? iconX + iconSize + 12 : pad + 50;
        const priceX = width - pad - 28;
        const maxNameWidth = priceX - nameX - 16;
        ctx.fillText(truncateText(ctx, name, maxNameWidth), nameX, y - 2);
        if (it) {
          ctx.fillStyle = "#93c5fd";
          ctx.save();
          ctx.textAlign = "right";
          ctx.fillText(
            formatRubles(Math.floor(it.basePrice)),
            width - pad - 28,
            y - 2
          );
          ctx.restore();
        }
        if (i < items.length - 1) {
          ctx.strokeStyle = "rgba(100,116,139,0.15)";
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
      ctx.fillText(
        new Date().toLocaleString(),
        width - pad - 24,
        height - pad - 16
      );
      ctx.restore();

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
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
      setIsLoading(false);
    }
  }

  const hasItems = selectedItems.some((item) => item !== null);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full border border-slate-600/40"
            disabled={isLoading}
          >
            <ShareIcon className="mr-1.5 h-4 w-4" />
            Share
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="bg-slate-900/95 backdrop-blur-sm border-slate-700/50 rounded-xl shadow-xl"
        >
          <DropdownMenuItem
            onClick={handleCopyShareCard}
            disabled={!hasItems}
            className="cursor-pointer"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Copy Image Card
          </DropdownMenuItem>
          <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2">
            Copy for Discord (select timer):
          </DropdownMenuLabel>
          {TIMER_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleCopyForResults(option.value)}
              disabled={!hasItems}
              className="cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-slate-700/50" />
          <DropdownMenuItem
            onClick={handleCopyCode}
            disabled={!hasItems}
            className="cursor-pointer"
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy Code Only
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700/50" />
          <DropdownMenuItem
            onClick={handleLoadFromClipboard}
            className="cursor-pointer text-emerald-400"
          >
            <ClipboardIcon className="h-4 w-4 mr-2" />
            Load from Clipboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Show current code in a small input when items are selected */}
      {hasItems && (
        <Input
          value={currentCode}
          readOnly
          className="w-36 h-8 bg-slate-800/60 border-slate-700/40 text-slate-400 font-mono text-[10px] rounded-full px-3"
          placeholder="No items"
        />
      )}
    </div>
  );
}

// Helper functions for canvas drawing
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
  h: number
) {
  ctx.save();
  ctx.fillStyle = "rgba(30,41,59,0.6)";
  ctx.strokeStyle = "rgba(148,163,184,0.35)";
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
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

async function loadIconSource(
  url: string | undefined
): Promise<CanvasImageSource | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
