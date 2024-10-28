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

// Escape from Tarkov related items and recipes
const tarkovItems: { input: string; time: string; output: string }[] = [
  {
    input: "Secure container Gamma (The Unheard Edition)",
    time: "6 min",
    output: "Secure container Gamma (Edge of Darkness Edition)",
  },
  { input: "Secure container Kappa", time: "66 mins", output: "Waist pouch" },
  {
    input: "Cultist figurine ×1",
    time: "66 mins",
    output: "Spooky skull mask",
  },
  { input: "Cultist figurine ×5", time: "66 mins", output: "Cultist knife" },
  {
    input: "Killa figurine",
    time: "66 mins",
    output:
      "Maska-1SCh bulletproof helmet (Killa Edition), Maska-1SCh face shield (Killa Edition)",
  },
  {
    input: "Tagilla figurine",
    time: "66 mins",
    output: 'Tagilla\'s welding mask "Gorilla", Tagilla\'s welding mask "UBEY"',
  },
  {
    input: "Reshala figurine",
    time: "66 mins",
    output: "TT-33 7.62x25 TT pistol (Golden)",
  },
  {
    input: "Den figurine",
    time: "66 mins",
    output: "Deadlyslob's beard oil, Baddie's red beard",
  },
  {
    input: "Politician Mutkevich figurine",
    time: "66 mins",
    output: "Bottle of Tarkovskaya vodka ×3",
  },
  {
    input: "Scav figurine",
    time: "66 mins",
    output: "Scav backpack, Scav Vest",
  },
  {
    input: "Ryzhy figurine",
    time: "66 mins",
    output: "Obdolbos cocktail injector, Pack of sugar",
  },
  {
    input: "BEAR operative figurine",
    time: "66 mins",
    output: "Grizzly medical kit",
  },
  {
    input: "USEC operative figurine",
    time: "66 mins",
    output: "HighCom Trooper TFO body armor (MultiCam)",
  },
  {
    input: "Relaxation room key",
    time: "66 mins",
    output: "Bottle of Fierce Hatchling moonshine",
  },
  {
    input: "Dundukk sport sunglasses",
    time: "66 mins",
    output: "Axel parrot figurine",
  },
  { input: "Soap", time: "66 mins", output: "Awl" },
  { input: "Zarya stun grenade", time: "66 mins", output: "Light bulb ×2" },
  {
    input: "Physical Bitcoin",
    time: "666 mins",
    output: "GreenBat lithium battery ×2, Tetriz portable game console ×2",
  },
  {
    input: "LEDX Skin Transilluminator",
    time: "666 mins",
    output: 'TerraGroup "Blue Folders" materials',
  },
];

export default function Page() {
  const [selectedRecipe, setSelectedRecipe] = useState<string | undefined>(
    "All Recipes"
  );
  const router = useRouter();

  const filteredItems =
    selectedRecipe === "All Recipes"
      ? tarkovItems
      : tarkovItems.filter((item) => item.output === selectedRecipe);

  return (
    <div className="min-h-screen grid place-items-center bg-my_bg_image bg-no-repeat bg-cover text-gray-100 p-4 overflow-auto ">
      <Card className="bg-gray-800 border-gray-700 text-secondary shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto bg-opacity-50 ">
        <CardHeader className="relative">
          <button
            className="absolute top-0 left-0 p-2 text-white"
            onClick={() => router.back()}
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
                {tarkovItems.map((item, index) => (
                  <SelectItem key={index} value={item.output}>
                    {item.output}
                    {selectedRecipe === item.output && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectScrollDownButton />
            </SelectContent>
          </Select>
          <div className="mt-6">
            <div className="space-y-6">
              {filteredItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-700 rounded-lg shadow-md"
                >
                  <h4 className="font-semibold text-red-400 text-lg">
                    {item.output}
                  </h4>
                  <h4 className="font-semibold mt-2">Ingredients:</h4>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {item.input.split(", ").map((ingredient, idx) => (
                      <li key={idx}>{ingredient}</li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    <span className="font-semibold text-sm">
                      Time Required:
                    </span>{" "}
                    {item.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
