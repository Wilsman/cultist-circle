"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to share.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    navigator.clipboard
      .writeText(currentCode)
      .then(() => {
        const itemCount = selectedItems.filter((item) => item !== null).length;
        toast({
          title: "Code Copied!",
          description: `Shareable code copied to clipboard. ${itemCount} item${
            itemCount > 1 ? "s" : ""
          } included.`,
          variant: "default",
        });
      })
      .catch((err) => {
        console.error("Failed to copy code:", err);
        toast({
          title: "Failed to Copy Code",
          description: "Please try again or manually copy the code.",
          variant: "destructive",
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
        toast({
          title: "Empty Clipboard",
          description: "Your clipboard is empty. Copy a code first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = loadItemsFromCode(trimmedCode, rawItemsData, toast);
      setIsLoading(false);

      if (result.items) {
        onItemsLoaded(result.items, result.isPVE);
      }
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Clipboard Access Failed",
        description:
          "Unable to access clipboard. Please paste the code manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full flex">
      <HorizontalAccordion
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        trigger={
          <div className="flex items-center gap-2 text-sm font-medium hover:text-blue-500 transition-colors">
            <ShareIcon className="h-4 w-4" />
            <span>Share Code</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        }
      >
        <div className="flex items-center space-x-2 w-full">
          <Input
            value={currentCode}
            readOnly
            className="flex-1 bg-muted text-muted-foreground font-mono text-sm"
            placeholder="No items selected"
          />
          <Button
            onClick={handleCopyCode}
            size="icon"
            variant="outline"
            disabled={isLoading || !currentCode}
            title="Copy to clipboard"
          >
            <CopyIcon className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleLoadFromClipboard}
            variant="secondary"
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
            disabled={isLoading}
            title="Load from clipboard"
          >
            <ClipboardIcon className="h-4 w-4" />
            Load
          </Button>
        </div>
      </HorizontalAccordion>
    </div>
  );
}
