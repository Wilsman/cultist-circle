// recipes/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";

// Escape from Tarkov crafting recipes
const tarkovRecipes = [
  {
    requiredItems: ["Secure container Gamma (The Unheard Edition)"],
    craftingTime: "6 min",
    producedItems: ["Secure container Gamma (Edge of Darkness Edition)"],
  },
  {
    requiredItems: ["Secure container Kappa"],
    craftingTime: "66 mins",
    producedItems: ["Secure container Kappa (Desecrated)"],
  },
  {
    requiredItems: ["Cultist figurine ×1"],
    craftingTime: "66 mins",
    producedItems: ["Spooky skull mask"],
  },
  {
    requiredItems: ["Cultist figurine ×5"],
    craftingTime: "66 mins",
    producedItems: ["Cultist knife"],
  },
  {
    requiredItems: ["Killa figurine"],
    craftingTime: "66 mins",
    producedItems: [
      "Maska-1SCh bulletproof helmet (Killa Edition)",
      "Maska-1SCh face shield (Killa Edition)",
    ],
  },
  {
    requiredItems: ["Tagilla figurine"],
    craftingTime: "66 mins",
    producedItems: [
      'Tagilla\'s welding mask "Gorilla"',
      'Tagilla\'s welding mask "UBEY"',
    ],
  },
  {
    requiredItems: ["Reshala figurine"],
    craftingTime: "66 mins",
    producedItems: ["TT-33 7.62x25 TT pistol (Golden)"],
  },
  {
    requiredItems: ["Den figurine"],
    craftingTime: "66 mins",
    producedItems: ["Deadlyslob's beard oil", "Baddie's red beard"],
  },
  {
    requiredItems: ["Politician Mutkevich figurine"],
    craftingTime: "66 mins",
    producedItems: ["Bottle of Tarkovskaya vodka ×3"],
  },
  {
    requiredItems: ["Scav figurine"],
    craftingTime: "66 mins",
    producedItems: ["Scav backpack", "Scav Vest"],
  },
  {
    requiredItems: ["Ryzhy figurine"],
    craftingTime: "66 mins",
    producedItems: ["Obdolbos cocktail injector", "Pack of sugar"],
  },
  {
    requiredItems: ["BEAR operative figurine"],
    craftingTime: "66 mins",
    producedItems: ["Grizzly medical kit"],
  },
  {
    requiredItems: ["USEC operative figurine"],
    craftingTime: "66 mins",
    producedItems: ["HighCom Trooper TFO body armor (MultiCam)"],
  },
  {
    requiredItems: ["Relaxation room key"],
    craftingTime: "66 mins",
    producedItems: ["Bottle of Fierce Hatchling moonshine"],
  },
  {
    requiredItems: ["Dundukk sport sunglasses"],
    craftingTime: "66 mins",
    producedItems: ["Axel parrot figurine"],
  },
  {
    requiredItems: ["Soap"],
    craftingTime: "66 mins",
    producedItems: ["Awl"],
  },
  {
    requiredItems: ["Zarya stun grenade"],
    craftingTime: "66 mins",
    producedItems: ["Light bulb ×2"],
  },
  {
    requiredItems: ["Physical Bitcoin"],
    craftingTime: "666 mins",
    producedItems: [
      "GreenBat lithium battery ×2",
      "Tetriz portable game console ×2",
    ],
  },
  {
    requiredItems: ["LEDX Skin Transilluminator"],
    craftingTime: "666 mins",
    producedItems: ['TerraGroup "Blue Folders" materials'],
  },
];

export default function Page() {
  const [selectedRecipe, setSelectedRecipe] = useState<string>("All Recipes");
  const router = useRouter();

  function handleBack() {
    // Check if we came from another page
    if (window.history.length > 2) {
      router.back();
    } else {
      // If we came directly to /recipes, go to home
      router.push("/");
    }
  }

  const filteredItems =
    selectedRecipe === "All Recipes"
      ? tarkovRecipes
      : tarkovRecipes.filter((item) =>
        item.producedItems.includes(selectedRecipe)
      );

  return (
    <div className="min-h-screen grid place-items-center bg-my_bg_image bg-no-repeat bg-cover text-gray-100 p-4 overflow-auto ">
      <Card className="bg-gray-800 border-gray-700 text-secondary shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto bg-opacity-50 ">
        <CardHeader className="relative">
          <button
            className="absolute top-0 left-0 p-2 text-white"
            onClick={handleBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <CardTitle className="text-3xl sm:text-4xl lg:text-5xl text-center text-red-500">
            👩‍🍳 Recipes 👨‍🍳
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="bg-yellow-200 text-black p-4 rounded-md mb-6">
            ⚠️ Note: Some recipes may only work on the first attempt.
          </div>
          <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
            <SelectTrigger className="w-full justify-between bg-gray-800 text-white">
              {selectedRecipe || "Select a recipe..."}
            </SelectTrigger>
            <SelectContent>
              <SelectScrollUpButton />
              <SelectGroup>
                <SelectLabel>Select a Recipe</SelectLabel>
                <SelectItem
                  value="All Recipes"
                  className="font-bold text-blue-500"
                >
                  All Recipes
                </SelectItem>
                {tarkovRecipes.map((item, index) => (
                  <SelectItem key={index} value={item.producedItems[0]}>
                    {item.producedItems[0]}
                    {selectedRecipe === item.producedItems[0] && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectScrollDownButton />
            </SelectContent>
          </Select>
          <div className="grid gap-2 mt-4">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-gray-800/90 rounded-lg shadow-md hover:bg-gray-800/95 transition-colors"
              >
                <div className="grid grid-cols-[2fr,auto,3fr] gap-6 items-start min-h-[3rem]">
                  {/* Input Section */}
                  <div>
                    <div className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1.5">Input</div>
                    <div>
                      {item.requiredItems.map((ingredient, idx) => (
                        <div key={idx} className="text-gray-100 text-sm leading-relaxed">
                          {ingredient}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Section - Center */}
                  <div className="flex flex-col items-center text-gray-500 mt-5 -mx-2">
                    <div className="flex items-center mb-0.5 opacity-60">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs">{item.craftingTime}</span>
                    </div>
                    <div className="text-xs mt-0.5">→</div>
                  </div>

                  {/* Output Section */}
                  <div>
                    <div className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1.5">Output</div>
                    <div className="space-y-1">
                      {item.producedItems.map((product, idx) => (
                        <div key={idx} className="text-green-400 text-sm leading-relaxed">
                          {product}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
