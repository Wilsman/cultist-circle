# Cultist Circle Calculator — Project Design Report (PDR)

---

## Overview

- __Purpose__: Help users choose 1–5 items whose combined base value meets the Cultist Circle thresholds to influence ritual outcomes.
- __Ritual thresholds__:
  - 350,000+ enables chance for 14h ritual (better loot).
  - 400,000+ enables 25% chance for 6h (quest/hideout) and 75% for 14h. 12h otherwise.
  - Values beyond 400k don’t further increase 6h chance.
- __Base value__: Derived from vendor sell price divided by vendor multiplier (not Fence). The app operates on base values from the Tarkov.dev API.

---

## Core App Flows

- __Base value explanation__:
  - The app operates on base values from the Tarkov.dev API. which is the basePrice field.
- __Item selection__:
  - Search via fuzzy matching.
  - Choose up to 5 items, with pinning support to preserve certain slots.
  - Per-item price override to manually adjust calculation.
  - Exclude specific items and/or item categories from suggestions and search.
- __Threshold setting__:
  - Quick presets (350,001 and 400,000).
  - Custom input supported.
- __Price sources__:
  - Toggle flea market price type: `lastLowPrice` or `avg24hPrice`.
- __Auto-select__:
  - Fills remaining slots with cost-effective items to meet the chosen threshold, honoring exclusions and pins.
  - Uses a bounded dynamic programming (DP) approach over item count (`maxItems`) and value up to `threshold + 5000` to minimize total flea cost.
  - Applies an `itemBonus` multiplier to each item's `basePrice` for DP value: `adjustedBasePrice = floor(basePrice * (1 + itemBonus/100))`.
  - Treats cost as the chosen flea metric per item: `fleaPrice = item[fleaPriceType]`.
  - Skips invalid items: non-positive `basePrice`, missing/negative `fleaPrice`, and (optionally) low market depth (`lastOfferCount < 5`) when that filter is enabled.
  - Builds DP tables `dp[c][v]` (min total cost using `c` items to reach value `v`) and backtracking indices to reconstruct selections.
  - Collects valid combos for `v ∈ [threshold, threshold+5000]`, prioritizes higher `c`, sorts by minimal cost, then randomly picks one among the top few to avoid deterministic ties.
- __Sharing__:
  - Compact share code encodes game mode + shortened item IDs (Base64).
- __Localization__:
  - Dual-fetch strategy to keep English-only configs usable while showing localized names.
  - 16 supported languages; selection persisted and used in API queries.
- __Persistence__:
  - LocalStorage for sort options, thresholds, price options, overrides, exclusions, mode, and various UI settings.
- __Feedback__:
  - Toast notifications for errors and actions (copy, validation, etc.).
  - Inline alerts and loading skeletons.

---

 
## Tarkov.dev GraphQL query

```graphql
{
  pvpItems: items(gameMode: regular) {
    id
    name
    shortName
    basePrice
    lastLowPrice
    updated
    width
    height
    lastOfferCount
    iconLink
    avg24hPrice
    categories {
      name
    }
  }
  pveItems: items(gameMode: pve) {
    id
    name
    shortName
    basePrice
    lastLowPrice
    updated
    width
    height
    lastOfferCount
    avg24hPrice
    iconLink
    categories {
      name
    }
  }
}
```
