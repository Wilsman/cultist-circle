// Cultist Circle recipe data extracted from app/recipes/page.tsx

/**
 * Recipe type definition for Cultist Circle crafting recipes
 */
export interface Recipe {
  requiredItems: string[];
  craftingTime: string;
  producedItems:
    | string[]
    | { type: "multiple_possible"; items: string[]; explanation: string }[];
  isNew?: boolean;
  roomInfo?: {
    itemName: string;
    spawnInfo: string;
  };
}

/**
 * Escape from Tarkov Cultist Circle crafting recipes
 */
export const tarkovRecipes: Recipe[] = [
    {
        requiredItems: ["1x Labrys research notes"],
        craftingTime: "66 mins",
        producedItems: [
            "1x Labrys access keycard"
        ],
        isNew: true,
    },
    {
        requiredItems: ["1x Elvisvista figurine"],
        craftingTime: "66 mins",
        producedItems: [
            "1x Elvisvista figurine",
            "1x Baseball cap"
        ],
        isNew: true,
    },
  {
    requiredItems: [
      "1x Christmas tree ornament (Silver)",
      "1x Christmas tree ornament (Red)",
      "1x Christmas tree ornament (Violet)",
    ],
    craftingTime: "66 mins",
    producedItems: ["1x Ded Moroz hat", "1x Ded Moroz figurine"],
    isNew: true,
  },
  {
    requiredItems: ["1x Mastichin figurine"],
    craftingTime: "66 mins",
    producedItems: [
      "1x Voron's Hideout key",
      "1x Note with code word Voron",
      "1x Raven",
    ],
    isNew: true,
  },
  {
    requiredItems: ["1x 6-STEN-140-M military battery"],
    craftingTime: "66 mins",
    producedItems: ["1x Old house toilet key"],
    isNew: true,
    roomInfo: {
      itemName: "Old house toilet key",
      spawnInfo: "Room has 100% spawn chance for 6-STEN-140-M military battery",
    },
  },
  {
    requiredItems: ["1x Domontovich ushanka hat"],
    craftingTime: "66 mins",
    producedItems: [
      "1x Supply department director's office key",
      "1x ZiD SP-81 26x75 signal pistol",
      "1x Bottle of Dan Jackiel whiskey",
    ],
    isNew: true,
  },
  {
    requiredItems: ["1x Nut sack"],
    craftingTime: "66 mins",
    producedItems: [
      {
        type: "multiple_possible",
        items: [
          "1x SSh-68 steel helmet (Olive Drab)",
          "1x BOSS cap",
          "2x Ushanka ear flap hat",
          "1x Bomber beanie",
        ],
        explanation: "Outcome 1: Mixed headwear",
      },
      {
        type: "multiple_possible",
        items: [
          "1x SSh-68 steel helmet (Olive Drab)",
          "1x BOSS cap",
          "1x Ushanka ear flap hat",
          "1x Kinda cowboy hat",
          "1x Bomber beanie",
        ],
        explanation: "Outcome 2: Different headwear set",
      },
    ],
    isNew: true,
  },
  {
    requiredItems: ["1x Christmas tree ornament (White)"],
    craftingTime: "66 mins",
    producedItems: ["1x Christmas tree ornament (Violet)"],
    isNew: true,
  },
  {
    requiredItems: ["1x Christmas tree ornament (Violet)"],
    craftingTime: "66 mins",
    producedItems: ["1x Christmas tree ornament (Red)"],
    isNew: true,
  },
  {
    requiredItems: ["1x Christmas tree ornament (Red)"],
    craftingTime: "66 mins",
    producedItems: ["1x Christmas tree ornament (White)"],
    isNew: true,
  },
  {
    requiredItems: ["1x Tigzresq splint"],
    craftingTime: "66 mins",
    producedItems: ["1x Golden egg"],
    isNew: true,
  },
  {
    requiredItems: ["1x Mazoni golden dumbbell"],
    craftingTime: "66 mins",
    producedItems: ["1x Mazoni golden dumbbell"],
    isNew: true,
  },
  {
    requiredItems: ["1x Augmentin antibiotic pills"],
    craftingTime: "66 mins",
    producedItems: ["1x xTG-12 antidote injector"],
    isNew: true,
  },
  {
    requiredItems: ["1x Pumpkin with sweets"],
    craftingTime: "66 mins",
    producedItems: ["1x Jack-o'-lantern tactical pumpkin helmet"],
  },
  {
    requiredItems: ["1x Jack-o'-lantern tactical pumpkin helmet"],
    craftingTime: "66 mins",
    producedItems: ["Random foods🍴", "Random drinks 🍹"],
  },
  {
    requiredItems: ["1x WD-40 (400ml)"],
    craftingTime: "66 mins",
    producedItems: ["WD-40 (100ml)"],
  },
  {
    requiredItems: ["1x Bottle of water (0.6L)"],
    craftingTime: "66 mins",
    producedItems: ["Fleece fabric"],
  },
  {
    requiredItems: [
      "1x Nailhead figurine",
      "1x Xenoalien figurine",
      "1x Pointy guy figurine",
      "1x Petya Crooker figurine",
      "1x Count Bloodsucker figurine",
    ],
    craftingTime: "66 mins",
    producedItems: ['Tagilla\'s welding mask "ZABEY" (Replica)'],
  },
  {
    requiredItems: ["1x Nailhead figurine"],
    craftingTime: "66 mins",
    producedItems: ["Pack of nails"],
  },
  {
    requiredItems: ["1x Xenoalien figurine"],
    craftingTime: "66 mins",
    producedItems: ["Xenomorph sealing foam"],
  },
  {
    requiredItems: ["1x Pointy guy figurine"],
    craftingTime: "66 mins",
    producedItems: ["Rusty bloody key"],
  },
  {
    requiredItems: ["1x Petya Crooker figurine"],
    craftingTime: "66 mins",
    producedItems: ["Video cassette with the Cyborg Killer movie"],
  },
  {
    requiredItems: ["1x Count Bloodsucker figurine"],
    craftingTime: "66 mins",
    producedItems: ["Medical bloodset"],
  },
  {
    requiredItems: ["Secure container Gamma (The Unheard Edition)"],
    craftingTime: "6 mins",
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
    craftingTime: "666 mins",
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
      {
        type: "multiple_possible",
        items: [
          'Tagilla\'s welding mask "Gorilla"',
          'Tagilla\'s welding mask "UBEY"',
        ],
        explanation:
          "You get 1 item. Either Gorilla mask or UBEY mask (random)",
      },
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
    producedItems: [
      {
        type: "multiple_possible",
        items: ["Deadlyslob's beard oil", "Baddie's red beard"],
        explanation:
          "You always get 2 items. Possible combinations: oil + beard, oil + oil, or beard + beard",
      },
    ],
  },
  {
    requiredItems: ["Politician Mutkevich figurine"],
    craftingTime: "66 mins",
    producedItems: ["Bottle of Tarkovskaya vodka ×3"],
  },
  {
    requiredItems: ["Scav figurine"],
    craftingTime: "66 mins",
    producedItems: [
      {
        type: "multiple_possible",
        items: ["Scav backpack", "Scav Vest"],
        explanation:
          "You always get 2 items. Possible combinations: backpack + vest, backpack + backpack, or vest + vest",
      },
    ],
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
    requiredItems: ["Mr Kerman's cat hologram"],
    craftingTime: "66 mins",
    producedItems: [
      "Mr Kerman's cat hologram",
      "TerraGroup Labs access keycard",
    ],
  },
  {
    requiredItems: ["Ded Moroz figurine"],
    craftingTime: "66 mins",
    producedItems: ["Santa's Bag"],
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
