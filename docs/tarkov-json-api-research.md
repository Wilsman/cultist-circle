# Tarkov JSON API Research

Research run: 2026-04-08

## Current repo usage

The current live API surface in this repo is narrower than the full `json.tarkov.dev` endpoint list.

- Runtime item loading is centered in `hooks/use-tarkov-api.ts`.
- UI consumption is mainly `hooks/use-items-data.ts`, `components/app.tsx`, `components/item-selector.tsx`, and `app/base-values/page.tsx`.
- Secondary CLI/script consumers are `scripts/generate-recipe-icons.ts`, `tools/lookup-item.ts`, and `tools/add-recipe.ts`.

From that usage, the current repo only needs item data plus translations to replace the GraphQL fetchers.

## Endpoints we actually need now

Required for runtime parity:

- `/regular/items`
- `/pve/items`
- `/regular/items_en`
- `/regular/items_{lang}` when localized item names are requested

Optional:

- `/lang` if we want the UI to discover available languages from the API instead of keeping a local language list

Not currently used by this repo:

- `/regular/maps`
- `/regular/tasks`
- `/regular/hideout`
- `/regular/crafts`
- `/regular/barters`
- `/regular/traders`
- `/status`
- `/regular/prices/{itemId}`

## Confirmed shape differences vs current GraphQL code

### `items` is not a flat array

`/regular/items` returns:

- `data.items` as an object keyed by item id
- `data.itemCategories` as a second dictionary keyed by category id
- `data.handbookCategories` as another dictionary keyed by handbook id

The current GraphQL code expects an `items[]` array. A migration needs a flattening step with `Object.values(data.items)`.

### Base item strings are translation keys, not final display strings

The base endpoint returns placeholder-ish translation keys such as:

- item `name`
- item `shortName`
- category `name`
- trader `name`

Those are resolved by separate translation endpoints like `/regular/items_en` and `/regular/items_fr`.

### Trader offers use different field names

The JSON `items` endpoint exposes:

- `buyFromTrader`
- `sellToTrader`

The current app expects:

- `buyFor`
- `sellFor`

That mapping is straightforward, but the nested trader reference is an id string instead of an inline vendor object. To rebuild `normalizedName`, a local trader lookup is needed or we can rely on the static trader-name mapping already used in the UI.

### Categories come through as ids

The JSON item shape uses:

- `categories: string[]`

The current app already prefers stable category ids for filtering, so this is actually helpful. We still need a lookup step to rebuild the current `categories_display` shape for the UI.

## Confirmed parity gap

The current GraphQL implementation exposes `buyLimit` on direct trader offers inside `buyFor.vendor`.

Live JSON findings from `2026-04-08`:

- `items[*].buyFromTrader[*]` does not expose `buyLimit`
- `traders` does not expose `buyLimit`
- `barters` does expose `buyLimit`, but that only covers barter offers, not all direct trader buys

That means the current base-values table cannot be migrated with full parity using only the JSON `items` endpoint. The `buyLimit` column/export behavior needs one of these decisions:

1. Accept a temporary regression for direct trader buy limits.
2. Supplement with another upstream source if one becomes available.
3. Change the UI so `buyLimit` is only shown when the API actually provides it.

This is the main blocker I found.

## Recommended migration shape

For this repo, the lowest-risk approach is a repo-specific adapter rather than a generic GraphQL emulation layer.

Implemented adapter responsibilities:

- fetch `/{mode}/items`
- fetch `/regular/items_en`
- fetch `/regular/items_{lang}` when `lang !== en`
- flatten `data.items`
- translate `name`, `shortName`, and category names with the translation maps
- map `buyFromTrader -> buyFor`
- map `sellToTrader -> sellFor`
- rebuild `categories_display` from `itemCategories`
- preserve `buyLimit` as optional because direct trader offers do not provide it in the JSON item payload

That is enough to replace the existing item fetchers used by the current app and scripts.

## Benchmark note

The production benchmark harness lives in `scripts/benchmark-load.mjs`.

Measured on 2026-04-08 with a 1500 ms post-load settle window:

- GraphQL baseline artifact: `benchmark-results/benchmark-graphql-baseline.json`
- JSON final artifact: `benchmark-results/benchmark-json-final.json`
- JSON performance pass 2 artifact: `benchmark-results/benchmark-json-perf-pass2.json`

The second performance pass kept everything client-side and improved the first JSON implementation by:

- switching the main app route to one mode-specific fetch instead of a combined dual-mode fetch
- reusing shared translation requests across concurrent mode fetches
- loading only the active mode on `/base-values` and deferring the other mode until the user switches

That dropped the initial request count:

- `/`: `3 -> 2`
- `/base-values`: `3 -> 2`

In this harness, the second pass recovered most of the lost performance:

- `/` average settled time: GraphQL `2291 ms`, first JSON `2729 ms`, performance pass 2 `2237 ms`
- `/base-values` average settled time: GraphQL `2062 ms`, first JSON `2406 ms`, performance pass 2 `2078 ms`

The JSON path is now much closer to the GraphQL baseline without adding any server-side work, but warm loads are still slower than GraphQL.

## Probe command

Use the live probe to refresh this research:

```bash
bun run probe:json-api
```

You can pass a non-English language code as the first argument:

```bash
bun run probe:json-api de
```
