"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast as sonnerToast } from "sonner";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { loadItemsFromCode, generateShareableCode } from "@/lib/share-utils";
import { ClipboardIcon, CopyIcon, ShareIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom horizontal accordion component
const HorizontalAccordion = ({
  isOpen,
  onToggle,
  trigger,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="relative flex items-center w-full">
      <div
        className="flex items-center cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        {trigger}
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out flex-1",
          isOpen ? "max-w-full opacity-100 ml-2" : "max-w-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
};

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
    <div className="w-full max-w-2xl">
      <HorizontalAccordion
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-full bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 text-slate-300 hover:text-slate-200 transition-all"
          >
            <ShareIcon className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Share Code</span>
            <ChevronRight className={`h-3.5 w-3.5 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          </Button>
        }
      >
        <div className="flex items-center gap-2 w-full">
          <Input
            value={currentCode}
            readOnly
            className="flex-1 h-8 bg-slate-800/60 border-slate-700/40 text-slate-300 font-mono text-xs"
            placeholder="No items selected"
          />
          <Button
            onClick={handleCopyCode}
            size="sm"
            variant="outline"
            disabled={isLoading || !currentCode}
            className="h-8 px-3"
            title="Copy to clipboard"
          >
            <CopyIcon className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Copy</span>
          </Button>
          <Button
            onClick={handleLoadFromClipboard}
            size="sm"
            className="h-8 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400"
            disabled={isLoading}
            title="Load from clipboard"
          >
            <ClipboardIcon className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Load</span>
          </Button>
        </div>
      </HorizontalAccordion>
    </div>
  );
}
