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
        <Button
          variant="ghost"
          className="flex-1 hover:bg-gray-700/50 rounded-none rounded-tl-lg border-r"
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
        <DialogDescription>
          <h3 className="text-lg font-semibold mb-2">How to use this calculator:</h3>
          <ol className="list-decimal list-inside space-y-2">
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
          <h3 className="text-lg font-semibold mb-2">
            Additional features:
          </h3>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Use the thresholder helper to find the best threshold for your
              needs.
            </li>
            <li>Pin items to keep them during auto-selection.</li>
            <li>Override flea prices to help match current market prices.</li>
            <li>Exclude items from auto-selection. Or exclude items permanently from within the settings.</li>
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
