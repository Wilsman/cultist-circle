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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Cultist Circle Calculator
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="pr-4 max-h-[calc(85vh-120px)]">
          <Tabs defaultValue="intro" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="intro">Introduction</TabsTrigger>
              <TabsTrigger value="guide">How To Use</TabsTrigger>
              <TabsTrigger value="tips">Tips & Tricks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="intro" className="space-y-4 mt-4 text-sm">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-yellow-500">Understanding Cultist Circle Rituals</h3>
                <p>
                  The Cultist Circle is a special mechanic in Escape from Tarkov that allows you to sacrifice items
                  to receive various rewards. This calculator helps you optimize your sacrifices.
                </p>
                
                <div className="bg-gray-800/50 p-3 rounded">
                  <h4 className="font-medium text-green-400 mb-1">Basic Rules:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Place 1-5 items in the circle (can be duplicates)</li>
                    <li>Ritual duration determines reward quality:</li>
                    <ul className="ml-6 list-disc space-y-1">
                      <li><span className="text-blue-400 font-medium">12 hours:</span> Normal loot (random)</li>
                      <li><span className="text-purple-400 font-medium">14 hours:</span> High value loot</li>
                      <li><span className="text-yellow-400 font-medium">6 hours:</span> Quest/Hideout items (most desirable)</li>
                    </ul>
                  </ul>
                </div>
                
                <div className="bg-gray-800/50 p-3 rounded">
                  <h4 className="font-medium text-green-400 mb-1">Value Thresholds:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><span className="text-blue-400 font-medium">Under 350,001₽:</span> 12-hour ritual (normal loot)</li>
                    <li><span className="text-purple-400 font-medium">350,001₽ to 399,999₽:</span> 14-hour ritual (high value loot)</li>
                    <li><span className="text-yellow-400 font-medium">400,000₽ or more:</span> 25% chance for 6-hour ritual (quest/hideout items), 75% chance for 14-hour ritual</li>
                  </ul>
                  <p className="mt-2 text-yellow-300 italic">Note: Adding more than 400,000₽ worth does not increase your chances beyond 25%.</p>
                </div>
                
                <div className="bg-gray-800/50 p-3 rounded">
                  <h4 className="font-medium text-green-400 mb-1">Base Value Explained:</h4>
                  <p className="mb-2">
                    The Cultist Circle uses the <span className="font-medium text-yellow-300">base value</span> of items, not their buy/sell price.
                  </p>
                  <p className="mb-1">To calculate base value:</p>
                  <div className="bg-gray-700/50 p-2 rounded text-center font-medium">
                    Base Value = Vendor Sell Price ÷ Vendor&apos;s Trading Multiplier
                  </div>
                  <p className="mt-2 text-xs">Example: Graphics card sells to Therapist for 124,740₽. Therapist&apos;s multiplier is 0.63.<br />Base Value = 124,740 ÷ 0.63 = 198,682₽</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="guide" className="space-y-3 mt-4 text-sm">
              <h3 className="text-lg font-semibold text-yellow-500">How To Use This Calculator</h3>
              
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <span className="font-medium text-green-400">Game Mode:</span> Toggle between PVE/PVP to match your game mode
                  <p className="text-xs ml-5 text-gray-400">This affects item availability and pricing</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Threshold:</span> Set your target value (default: 400,000₽)
                  <p className="text-xs ml-5 text-gray-400">Adjust based on whether you want the 6h, 12h, or 14h ritual</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Settings:</span> Configure excluded categories, sorting options, and other preferences
                  <p className="text-xs ml-5 text-gray-400">Customize to focus on items you&apos;re willing to sacrifice</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Items:</span> Select up to 5 items to sacrifice
                  <p className="text-xs ml-5 text-gray-400">Search or browse by category to find specific items</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Auto Select:</span> <span className="text-yellow-300">★ Key Feature ★</span>
                  <p className="text-xs ml-5 text-gray-400">Automatically finds the most cost-effective combination of items to reach your threshold</p>
                </li>

                <li>
                  <span className="font-medium text-green-400">Item Hints:</span> <span className="text-blue-300">✨ New ✨</span>
                  <p className="text-xs ml-5 text-gray-400">Smart suggestions appear below empty slots with color-coded hints to guide your selection</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Pin:</span> Lock specific items during Auto Select
                  <p className="text-xs ml-5 text-gray-400">Forces the calculator to include these items in the final selection</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Override:</span> Adjust flea prices manually
                  <p className="text-xs ml-5 text-gray-400">Useful when market prices differ from API data</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Share:</span> Save/share your selection
                  <p className="text-xs ml-5 text-gray-400">Creates a compact code you can save or share with others</p>
                </li>
                
                <li>
                  <span className="font-medium text-green-400">Refresh:</span> Update item prices from Tarkov.dev API
                  <p className="text-xs ml-5 text-gray-400">Subject to cooldown to prevent API abuse</p>
                </li>
              </ol>
            </TabsContent>
            
            <TabsContent value="tips" className="space-y-3 mt-4 text-sm">
              <h3 className="text-lg font-semibold text-yellow-500">Tips & Tricks</h3>
              
              <div className="space-y-3">
                <div className="bg-gray-800/50 p-3 rounded">
                  <h4 className="font-medium text-green-400 mb-1">Optimal Strategy:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Aim for just over 400,000₽ for the best chance at quest/hideout items</li>
                    <li>Use the <span className="font-medium text-yellow-300">Auto Select</span> button to find the most cost-effective combination</li>
                    <li>Pin valuable items you already own to include them in calculations</li>
                    <li>For quest items, ensure the related quest is active on your character</li>
                  </ul>
                </div>
                
                <div className="bg-gray-800/50 p-3 rounded">
                  <h4 className="font-medium text-green-400 mb-1">Calculator Features:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><span className="text-red-500">Red price text</span> = Unstable flea price due to low offer count at time of capture</li>
                    <li><span className="text-yellow-300">Yellow price text</span> = manually overridden prices</li>
                    <li>Use share codes to save your favorite combinations</li>
                    <li>Prices from tarkov.dev API are the most accurate and up-to-date available.</li>
                    <li>Exclude categories of items you&apos;re not willing to sacrifice</li>
                    <li>Use sorting options to sort by <span className="font-medium text-green-400">most recently updated</span> or <span className="font-medium text-green-400">best value for rubles</span></li>
                  </ul>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </ScrollArea>
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
