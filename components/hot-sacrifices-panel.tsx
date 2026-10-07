export interface Ingredient {
  name: string;
  shortName?: string;
  count: number;
  imageUrl: string;
  vendor?: {
    name: string;
    level: string;
    imageUrl: string;
  };
}

export interface SacrificeCombo {
  id: string;
  ingredients: Ingredient[];
  resultText: string;
  /** Lowest total base value the combo reaches, for threshold matching. */
  minBaseValue: number;
  highlight?: boolean;
  separator?: string; // For custom separators like "➡️"
  availabilityNote?: string;
  /** Combo no longer works in any game mode; shown greyed out and not usable. */
  disabled?: boolean;
}

export const HOT_SACRIFICES: SacrificeCombo[] = [
  {
    id: "5x-mp5",
    ingredients: [
      {
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) Default",
        shortName: "MP5",
        count: 5,
        imageUrl:
          "https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    minBaseValue: 400_000,
    highlight: true,
  },
  {
    id: "4x-mp5-diary",
    ingredients: [
      {
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) Default",
        shortName: "MP5",
        count: 4,
        imageUrl:
          "https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
      {
        name: "Diary",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/590c645c86f77412b01304d9-icon.webp",
      },
    ],
    resultText: "400K+ (6h & 14h)",
    minBaseValue: 400_000,
  },
  {
    id: "2x-mp5sd-diary",
    ingredients: [
      {
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) SD",
        shortName: "MP5 SD",
        count: 2,
        imageUrl:
          "https://assets.tarkov.dev/59411abb86f77478f702b5d2-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL2",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
      {
        name: "Diary",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/590c645c86f77412b01304d9-icon.webp",
      },
    ],
    resultText: "400K+ (6h & 14h)",
    minBaseValue: 400_000,
  },
  {
    id: "3x-stm-saiga",
    ingredients: [
      {
        name: "Soyuz-TM STM-9 Gen.2 9x19 carbine Default",
        shortName: "STM-9",
        count: 3,
        imageUrl:
          "https://assets.tarkov.dev/60479c3f420fac5ebc199f86-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL2",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
      {
        name: "Saiga-9 9x19 carbine Default",
        shortName: "Saiga-9",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/5a13df5286f774032f5454a0-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
    ],
    resultText: "350K+ (14h)",
    minBaseValue: 350_000,
  },
  {
    id: "4x-stm-saiga",
    ingredients: [
      {
        name: "Soyuz-TM STM-9 Gen.2 9x19 carbine Default",
        shortName: "STM-9",
        count: 4,
        imageUrl:
          "https://assets.tarkov.dev/60479c3f420fac5ebc199f86-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL2",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
      {
        name: "Saiga-9 9x19 carbine Default",
        shortName: "Saiga-9",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/5a13df5286f774032f5454a0-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    minBaseValue: 400_000,
  },
  {
    id: "labs-g28",
    ingredients: [
      {
        name: "Labs Access",
        shortName: "Labs Card",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/5c94bbff86f7747ee735c08f-icon.webp",
      },
      {
        name: "HK G28 7.62x51 marksman rifle Patrol",
        shortName: "G28",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/6193e5f3aa34a3034236bdb3-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL3",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    minBaseValue: 400_000,
    separator: "➡️",
  },
  {
    id: "sas-thor",
    ingredients: [
      {
        name: "SAS drive",
        shortName: "SAS",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/590c37d286f77443be3d7827-icon.webp",
      },
      {
        name: "NFM THOR Integrated Carrier body armor",
        shortName: "THOR IC",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/60a283193cb70855c43a381d-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL4",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    minBaseValue: 400_000,
    separator: "➡️",
    disabled: true,
    // availabilityNote:
    //   "No longer works in PVP or PVE after the THOR IC base value change.",
  },
];

/**
 * Working combos sorted by estimated cost, cheapest first. Combos without a
 * cost yet keep their listed order after the priced ones.
 */
export function sortCombosByCost(
  combos: SacrificeCombo[],
  costs: Record<string, number>,
): SacrificeCombo[] {
  return combos
    .filter((combo) => !combo.disabled)
    .sort((a, b) => {
      const costA = costs[a.id] ?? 0;
      const costB = costs[b.id] ?? 0;
      if (costA === 0 && costB === 0) return 0;
      if (costA === 0) return 1;
      if (costB === 0) return -1;
      return costA - costB;
    });
}

/** Whether a combo reaches the selected threshold. */
export function meetsThreshold(combo: SacrificeCombo, threshold: number) {
  return combo.minBaseValue >= threshold;
}

/**
 * Working combos for a threshold: the ones that reach it first, then the
 * rest, each group cheapest first.
 */
export function orderCombosForThreshold(
  combos: SacrificeCombo[],
  costs: Record<string, number>,
  threshold: number,
): SacrificeCombo[] {
  const sorted = sortCombosByCost(combos, costs);
  return [
    ...sorted.filter((combo) => meetsThreshold(combo, threshold)),
    ...sorted.filter((combo) => !meetsThreshold(combo, threshold)),
  ];
}

/**
 * Ingredients that go into the sacrifice slots. The Labs card for the G28
 * combo is the price of entry to Labs, not a slot item.
 */
export function comboSlotIngredients(combo: SacrificeCombo): Ingredient[] {
  return combo.ingredients.filter(
    (ingredient) =>
      !(combo.id === "labs-g28" && ingredient.name === "Labs Access"),
  );
}

/**
 * The combo whose slot items exactly match the selected item ids (in any
 * order), or null. `resolveId` maps an ingredient name to its item id.
 */
export function findLoadedCombo(
  combos: SacrificeCombo[],
  selectedIds: string[],
  resolveId: (ingredientName: string) => string | null,
): SacrificeCombo | null {
  if (selectedIds.length === 0) return null;
  const sortedSelected = [...selectedIds].sort();
  return (
    combos.find((combo) => {
      if (combo.disabled) return false;
      const comboIds: string[] = [];
      for (const ingredient of comboSlotIngredients(combo)) {
        const id = resolveId(ingredient.name);
        if (!id) return false;
        for (let i = 0; i < ingredient.count; i++) comboIds.push(id);
      }
      comboIds.sort();
      return (
        comboIds.length === sortedSelected.length &&
        comboIds.every((id, index) => id === sortedSelected[index])
      );
    }) ?? null
  );
}

/**
 * Total base value to show for the slots. An exact community-verified combo
 * reaches at least its tested value, even when item data (often weapon or
 * armor base prices) adds up to less.
 */
export function verifiedTotal(
  calculatedTotal: number,
  loadedCombo: SacrificeCombo | null,
): number {
  return loadedCombo
    ? Math.max(calculatedTotal, loadedCombo.minBaseValue)
    : calculatedTotal;
}

/** Short label such as "4× MP5 + Diary" or "Labs Card → G28". */
export function comboLabel(combo: SacrificeCombo): string {
  return combo.ingredients
    .map(
      (ingredient) =>
        `${ingredient.count > 1 ? `${ingredient.count}× ` : ""}${
          ingredient.shortName || ingredient.name
        }`,
    )
    .join(combo.separator === "➡️" ? " → " : " + ");
}
