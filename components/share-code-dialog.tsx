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

  const handleCopyCode = () => {
    copyShareableCode(selectedItems, isPVE, toast);
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

    // The loadItemsFromCode function now handles all error cases internally
    const result = loadItemsFromCode(shareCode.trim(), rawItemsData, toast);

    if (result.items) {
      onItemsLoaded(result.items, result.isPVE);
      setIsOpen(false);
      setShareCode("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className={`bg-blue-500 hover:bg-blue-600 text-white w-1/3 rounded
                          transition-all duration-300 transform hover:scale-[1.02] active:scale-95
                          `}
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
        <div className="space-y-4 py-2">
          <div>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="w-full"
            >
              Copy Code to Clipboard
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Input
              placeholder="Paste code here..."
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
            />
            <Button onClick={handleLoadCode} size="sm">
              Load
            </Button>
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
