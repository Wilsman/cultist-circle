"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast as sonnerToast } from "sonner";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { loadItemsFromCode, generateShareableCode } from "@/lib/share-utils";
import { ClipboardIcon, CopyIcon, ShareIcon, ChevronRight } from "lucide-react";
interface ShareCodeDialogProps {
  selectedItems: (SimplifiedItem | null)[];
  isPVE: boolean;
  rawItemsData: SimplifiedItem[];
  onItemsLoaded: (
    items: (SimplifiedItem | null)[],
    isPVE: boolean | null
  ) => void;
}

export function ShareCodeDialog({
  selectedItems,
  isPVE,
  rawItemsData,
  onItemsLoaded,
}: ShareCodeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Update the current code whenever selected items change
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
      }
    } catch (error) {
      setIsLoading(false);
      sonnerToast("Clipboard Access Failed", {
        description: "Unable to access clipboard. Please paste the code manually.",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full border border-slate-600/40"
        onClick={() => setIsOpen(!isOpen)}
      >
        <ShareIcon className="mr-1 h-4 w-4" />
        Share Code
        <ChevronRight className={`h-3.5 w-3.5 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </Button>
      
      {isOpen && (
        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
          <Input
            value={currentCode}
            readOnly
            className="w-48 h-8 bg-slate-800/60 border-slate-700/40 text-slate-300 font-mono text-xs"
            placeholder="No items selected"
          />
          <Button
            onClick={handleCopyCode}
            size="sm"
            variant="outline"
            disabled={isLoading || !currentCode}
            className="h-8 px-3 rounded-full"
            title="Copy to clipboard"
          >
            <CopyIcon className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
          <Button
            onClick={handleLoadFromClipboard}
            size="sm"
            className="h-8 px-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400"
            disabled={isLoading}
            title="Load from clipboard"
          >
            <ClipboardIcon className="h-3.5 w-3.5 mr-1" />
            Load
          </Button>
        </div>
      )}
    </div>
  );
}
