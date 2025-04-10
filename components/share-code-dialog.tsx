"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { copyShareableCode, loadItemsFromCode } from "@/lib/share-utils";
import { ClipboardIcon, ClipboardPasteIcon, CopyIcon } from "lucide-react";

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
  const [shareCode, setShareCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyCode = () => {
    setIsLoading(true);
    copyShareableCode(selectedItems, isPVE, toast);
    setIsLoading(false);
  };

  const handleLoadCode = () => {
    if (!shareCode.trim()) {
      toast({
        title: "No Code Provided",
        description: "Please enter a shareable code to load items.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // The loadItemsFromCode function now handles all error cases internally
    const result = loadItemsFromCode(shareCode.trim(), rawItemsData, toast);
    setIsLoading(false);

    if (result.items) {
      onItemsLoaded(result.items, result.isPVE);
      setIsOpen(false);
      setShareCode("");
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      setIsLoading(true);
      const clipboardText = await navigator.clipboard.readText();
      setShareCode(clipboardText.trim());
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Clipboard Access Failed",
        description: "Unable to access clipboard. Please paste the code manually.",
        variant: "destructive",
      });
    }
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
        setIsOpen(false);
      }
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Clipboard Access Failed",
        description: "Unable to access clipboard. Please paste the code manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="bg-blue-500 hover:bg-blue-600 text-white w-1/3 rounded
                          transition-all duration-300 transform hover:scale-[1.02] active:scale-95
                          "
        >
          Share Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Items</DialogTitle>
          <DialogDescription>
            Share your item combination or load someone else&apos;s.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {/* Generate Code Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Generate Code</h3>
            <p className="text-xs text-muted-foreground">Create a shareable code for your current item selection.</p>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              <CopyIcon className="h-4 w-4" />
              Copy Combination Code
            </Button>
          </div>

          {/* Paste Code Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Load Code</h3>
            <p className="text-xs text-muted-foreground">Load items from a shared code.</p>
            
            <div className="grid grid-cols-1 gap-2">
              {/* One-click clipboard loading */}
              <Button 
                onClick={handleLoadFromClipboard} 
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 hover:bg-blue-600 text-white"
                disabled={isLoading}
              >
                <ClipboardIcon className="h-4 w-4" />
                Load from Clipboard
              </Button>
              
              {/* Manual code entry */}
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Or paste code here..."
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handlePasteFromClipboard} 
                  size="icon" 
                  variant="outline"
                  disabled={isLoading}
                  title="Paste from clipboard"
                >
                  <ClipboardPasteIcon className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleLoadCode} 
                  size="sm"
                  disabled={isLoading || !shareCode.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Load
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
