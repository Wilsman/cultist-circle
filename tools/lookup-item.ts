#!/usr/bin/env bun
/**
 * Quick item/category lookup tool
 * Usage:
 *   bun tools/lookup-item.ts <search term>        - Search items by name
 *   bun tools/lookup-item.ts -c <category name>   - List items in a category
 * Examples:
 *   bun tools/lookup-item.ts "teapot"
 *   bun tools/lookup-item.ts -c "Jewelry"
 */

const TARKOV_API = "https://api.tarkov.dev/graphql";

interface ItemCategory {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  categories: ItemCategory[];
}

interface ApiResponse {
  data: {
    items: Item[];
  };
}

async function searchItems(searchTerm: string): Promise<Item[]> {
  const query = `
    query {
      items(name: "${searchTerm}", lang: en) {
        id
        name
        shortName
        basePrice
        categories {
          id
          name
        }
      }
    }
  `;

  const response = await fetch(TARKOV_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const json = (await response.json()) as ApiResponse;
  return json.data?.items ?? [];
}

async function getItemsByCategory(
  categorySearch: string
): Promise<{ items: Item[]; matchedCategory: ItemCategory | null }> {
  // Fetch all items and filter locally (API categoryNames filter is unreliable)
  const query = `
    query {
      items(lang: en) {
        id
        name
        shortName
        basePrice
        categories {
          id
          name
        }
      }
    }
  `;

  const response = await fetch(TARKOV_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const json = (await response.json()) as ApiResponse;
  const allItems = json.data?.items ?? [];

  // Find matching category (by name or ID, case-insensitive)
  const searchLower = categorySearch.toLowerCase();
  let matchedCategory: ItemCategory | null = null;

  for (const item of allItems) {
    for (const cat of item.categories) {
      if (cat.name.toLowerCase() === searchLower || cat.id === categorySearch) {
        matchedCategory = cat;
        break;
      }
    }
    if (matchedCategory) break;
  }

  if (!matchedCategory) {
    return { items: [], matchedCategory: null };
  }

  // Filter items that have this category
  const items = allItems.filter((item) =>
    item.categories.some((c) => c.id === matchedCategory!.id)
  );

  return { items, matchedCategory };
}

function formatItem(item: Item): string {
  const categories = item.categories
    .map((c) => `    - ${c.name} (${c.id})`)
    .join("\n");

  return `
┌─────────────────────────────────────────────────────────────
│ ${item.name}
│ Short: ${item.shortName}
│ ID: ${item.id}
│ Base Price: ${item.basePrice.toLocaleString()}₽
├─────────────────────────────────────────────────────────────
│ Categories:
${categories}
└─────────────────────────────────────────────────────────────`;
}

function formatItemCompact(item: Item): string {
  return `  ${item.name.padEnd(45)} ${item.basePrice
    .toLocaleString()
    .padStart(10)}₽`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage:");
    console.log(
      "  bun tools/lookup-item.ts <search term>        - Search items by name"
    );
    console.log(
      "  bun tools/lookup-item.ts -c <category name>   - List items in a category"
    );
    console.log("\nExamples:");
    console.log('  bun tools/lookup-item.ts "teapot"');
    console.log('  bun tools/lookup-item.ts -c "Jewelry"');
    process.exit(1);
  }

  // Check for category mode
  if (args[0] === "-c") {
    const categoryName = args.slice(1).join(" ");
    if (!categoryName) {
      console.log("Please provide a category name after -c");
      process.exit(1);
    }

    console.log(`\nFetching items in category: "${categoryName}"...\n`);

    const { items, matchedCategory } = await getItemsByCategory(categoryName);

    if (items.length === 0) {
      console.log("No items found in this category.");
      process.exit(0);
    }

    console.log(`Category: ${matchedCategory?.name ?? categoryName}`);
    if (matchedCategory) {
      console.log(`ID: ${matchedCategory.id}`);
    }
    console.log(`Found ${items.length} item(s):\n`);
    console.log("  " + "Name".padEnd(45) + "Base Price".padStart(11));
    console.log("  " + "─".repeat(56));

    // Sort by base price descending
    items
      .sort((a, b) => b.basePrice - a.basePrice)
      .forEach((item) => console.log(formatItemCompact(item)));

    process.exit(0);
  }

  // Item search mode
  const searchTerm = args.join(" ");

  console.log(`\nSearching for: "${searchTerm}"...\n`);

  const items = await searchItems(searchTerm);

  if (items.length === 0) {
    console.log("No items found.");
    process.exit(0);
  }

  console.log(`Found ${items.length} item(s):\n`);
  items.forEach((item) => console.log(formatItem(item)));
}

main().catch(console.error);
