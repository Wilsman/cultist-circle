// recipes/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

// Escape from Tarkov crafting recipes
const tarkovRecipes = [
  {
    requiredItems: ["1x Nailhead figurine", "1x Xenoalien figurine", "1x Pointy guy figurine", "1x Petya Crooker figurine", "1x Count Bloodsucker figurine"],
    craftingTime: "66 min",
    producedItems: ["Tagilla's welding mask \"ZABEY\" (Replica)"],
  },
  {
    requiredItems: ["1x Nailhead figurine"],
    craftingTime: "66 min",
    producedItems: ["Pack of nails"],
  },
  {
    requiredItems: ["1x Xenoalien figurine"],
    craftingTime: "66 min",
    producedItems: ["Xenomorph sealing foam"],
  },
  {
    requiredItems: ["1x Pointy guy figurine"],
    craftingTime: "66 min",
    producedItems: ["Rusty bloody key"],
  },
  {
    requiredItems: ["1x Petya Crooker figurine"],
    craftingTime: "66 min",
    producedItems: ["Video cassette with the Cyborg Killer movie"],
  },
  {
    requiredItems: ["1x Count Bloodsucker figurine"],
    craftingTime: "66 min",
    producedItems: ["Medical bloodset"],
  },
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
      "Maska-1SCh bulletproof helmet (Killa Edition), Maska-1SCh face shield (Killa Edition)",
    ],
  },
  {
    requiredItems: ["Tagilla figurine"],
    craftingTime: "66 mins",
    producedItems: [
      'Tagilla\'s welding mask "Gorilla", Tagilla\'s welding mask "UBEY"',
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
    producedItems: ["Deadlyslob's beard oil, Baddie's red beard"],
  },
  {
    requiredItems: ["Politician Mutkevich figurine"],
    craftingTime: "66 mins",
    producedItems: ["Bottle of Tarkovskaya vodka ×3"],
  },
  {
    requiredItems: ["Scav figurine"],
    craftingTime: "66 mins",
    producedItems: ["Scav backpack, Scav Vest"],
  },
  {
    requiredItems: ["Ryzhy figurine"],
    craftingTime: "66 mins",
    producedItems: ["Obdolbos cocktail injector, Pack of sugar"],
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
  { requiredItems: ["Soap"], craftingTime: "66 mins", producedItems: ["Awl"] },
  {
    requiredItems: ["Zarya stun grenade"],
    craftingTime: "66 mins",
    producedItems: ["Light bulb ×2"],
  },
  {
    requiredItems: ["Physical Bitcoin"],
    craftingTime: "666 mins",
    producedItems: [
      "GreenBat lithium battery ×2, Tetriz portable game console ×2",
    ],
  },
  {
    requiredItems: ["LEDX Skin Transilluminator"],
    craftingTime: "666 mins",
    producedItems: ['TerraGroup "Blue Folders" materials'],
  },
];

// Track new recipes (top 5)
const newRecipes = new Set([0, 1, 2, 3, 4, 5]); // Indices of new recipes

export default function Page() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push("/");
    }
  }

  const filteredItems = tarkovRecipes.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      // Search in inputs
      item.requiredItems.some((input) =>
        input.toLowerCase().includes(searchLower)
      ) ||
      // Search in outputs
      item.producedItems.some((output) =>
        output.toLowerCase().includes(searchLower)
      )
    );
  });

  // NewBadge component
  function NewBadge() {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white absolute -top-1 -right-1 shadow-lg animate-pulse">
        NEW
      </span>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-my_bg_image bg-no-repeat bg-cover text-gray-100 p-4">
      <Card className="bg-gray-800 border-gray-700 text-secondary shadow-lg h-[90vh] w-full max-w-2xl mx-auto bg-opacity-50 flex flex-col">
        <div className="sticky top-0 z-10 bg-gray-800/95 border-b border-gray-700 py-8 px-6 rounded-t-lg">
          <CardHeader className="relative p-0 mb-6">
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
          <div className="bg-yellow-200 text-black p-4 rounded-md mb-6">
            ⚠️ Note: Some recipes may only work on the first attempt.
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search recipes by input or output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 focus:border-gray-500 placeholder-gray-400"
            />
          </div>
        </div>
        <CardContent className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-2">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                className="relative bg-gray-700/60 rounded-lg p-4 hover:bg-gray-700/80 transition-colors"
              >
                {newRecipes.has(index) && <NewBadge />}
                <div className="grid grid-cols-[2fr,auto,3fr] gap-6 items-start min-h-[3rem]">
                  {/* Input Section */}
                  <div>
                    <div className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                      Input
                    </div>
                    <div>
                      {item.requiredItems.map((ingredient, idx) => (
                        <div
                          key={idx}
                          className="text-gray-100 text-sm leading-relaxed"
                        >
                          {ingredient}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Section - Center */}
                  <div className="flex flex-col items-center text-gray-500 mt-5 -mx-2">
                    <div className="flex items-center mb-0.5 opacity-60">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-xs">{item.craftingTime}</span>
                    </div>
                    <div className="text-xs mt-0.5">→</div>
                  </div>

                  {/* Output Section */}
                  <div>
                    <div className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                      Output
                    </div>
                    <div className="space-y-1">
                      {item.producedItems.map((product, idx) => (
                        <div
                          key={idx}
                          className="text-green-400 text-sm leading-relaxed"
                        >
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
        <CardFooter className="text-center text-sm text-gray-400 mt-4 border-t border-gray-700 px-6 py-4">
          Data combined with the&nbsp;
          <a
            href="https://escapefromtarkov.fandom.com/wiki/Escape_from_Tarkov_Wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Escape from Tarkov Wiki
          </a>
          . Thank you all contributors! ❣️
        </CardFooter>
      </Card>
    </div>
  );
}
