import React, { forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle } from "lucide-react";

export const InstructionsDialog = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          className="flex-1 hover:bg-gray-700/50 rounded-none rounded-tl-lg border-r"
          {...props}
        >
          <HelpCircle
            id="help"
            className="h-4 w-4 mr-2 text-yellow-500 hover:text-green-300"
          />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle className="">
            Instructions
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <h3 className="text-base font-semibold mb-1">Quick Guide:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li><span className="font-medium">Game Mode:</span> Toggle PVE/PVP</li>
            <li><span className="font-medium">Threshold:</span> Set target value (default: 400k ₽)</li>
            <li><span className="font-medium">Settings:</span> Configure excluded categories, sorting options, and other preferences</li>
            <li><span className="font-medium">Items:</span> Select up to 5 items to sacrifice</li>
            <li><span className="font-medium">Auto Select:</span> Find optimal item combination</li>
            <li><span className="font-medium">Pin:</span> Lock items during Auto Select</li>
            <li><span className="font-medium">Override:</span> Adjust flea prices manually</li>
            <li><span className="font-medium">Share:</span> Save/share your selection</li>
            <li><span className="font-medium">Refresh:</span> Update item prices from Tarkov.dev API (subject to cooldown)</li>
          </ol>
          
          <Separator className="my-1" />
          
          <h3 className="text-base font-semibold mb-1">Tips:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Prices from tarkov.dev API are the best available</li>
            <li>Yellow price text = manually overridden</li>
            <li>350,001+ ₽ = high value items 14h cooldown</li>
            <li>400k+ ₽ = 25% chance for 6h cooldown</li>
            <li>Use share codes to save selections</li>
          </ul>
        </div>
        <DialogClose asChild>
          <Button className="text-primary bg-secondary hover:bg-secondary/90">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
});

InstructionsDialog.displayName = 'InstructionsDialog';
