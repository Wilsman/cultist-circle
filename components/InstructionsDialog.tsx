import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";

export function InstructionsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center justify-center cursor-pointer">
          <HelpCircle
            id="help"
            className="h-8 w-8 hover:text-green-300 text-yellow-500"
          />
          <div className="text-yellow-500 text-xs text-center mt-1">Help</div>
        </div>
      </DialogTrigger>
      <DialogContent className="text-primary-foreground bg-primary">
        <DialogHeader>
          <DialogTitle className="text-primary-foreground">
            Instructions
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <h3 className="text-lg font-semibold mb-2 text-primary-foreground">
            How to use this calculator:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-primary-foreground">
            <li>Select PVE or PVP mode based on your preference.</li>
            <li>Set your desired threshold value (default is 400,000 ₽).</li>
            <li>Use the search fields to select up to 5 items.</li>
            <li>
              The calculator will show the total value and flea market cost.
            </li>
            <li>
              Use the &quot;Auto Select&quot; button for quick item selection.
            </li>
          </ol>
          <Separator className="my-4" />
          <h3 className="text-lg font-semibold mb-2 text-primary-foreground">
            Additional features:
          </h3>
          <ul className="list-disc list-inside space-y-2 text-primary-foreground">
            <li>
              Use the thresholder helper to find the best threshold for your
              needs.
            </li>
            <li>Pin items to keep them during auto-selection.</li>
            <li>Override flea prices to help match current market prices.</li>
            <li>Exclude items from auto-selection.</li>
            <li>Use the settings to customize item categories and sorting.</li>
          </ul>
        </DialogDescription>
        <DialogClose asChild>
          <Button className="text-primary bg-secondary hover:bg-secondary/90">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
