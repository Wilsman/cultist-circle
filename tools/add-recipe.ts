#!/usr/bin/env bun
/**
 * Interactive Recipe CLI Tool
 *
 * Simplifies adding new recipes to the Cultist Circle app by:
 * 1. Looking up items via the Tarkov API
 * 2. Automatically resolving icon URLs
 * 3. Generating recipe and icon mapping code
 * 4. Optionally writing to source files
 *
 * Usage:
 *   bun tools/add-recipe.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

const TARKOV_API = "https://api.tarkov.dev/graphql";

interface ItemResult {
  id: string;
  name: string;
  shortName: string;
  iconLink: string;
  basePrice: number;
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function searchItem(searchTerm: string): Promise<ItemResult[]> {
  // Search both PVP and PVE game modes since some items only exist in one
  // Escape quotes for GraphQL string
  const escapedTerm = searchTerm.replace(/"/g, '\\"');
  const query = `
    query {
      pvp: items(name: "${escapedTerm}", lang: en, gameMode: regular) {
        id
        name
        shortName
        iconLink
        basePrice
      }
      pve: items(name: "${escapedTerm}", lang: en, gameMode: pve) {
        id
        name
        shortName
        iconLink
        basePrice
      }
    }
  `;

  try {
    const response = await fetch(TARKOV_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error(
        `❌ API HTTP error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const text = await response.text();
    let json: {
      data?: { pvp: ItemResult[]; pve: ItemResult[] };
      errors?: unknown[];
    };
    try {
      json = JSON.parse(text);
    } catch {
      console.error(`❌ Failed to parse API response`);
      return [];
    }

    if (json.errors) {
      console.error(`❌ GraphQL errors:`, json.errors);
    }

    // Combine and deduplicate by ID
    const pvpItems = json.data?.pvp ?? [];
    const pveItems = json.data?.pve ?? [];
    const seen = new Set<string>();
    const combined: ItemResult[] = [];

    for (const item of [...pvpItems, ...pveItems]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }

    return combined;
  } catch (error) {
    console.error(`❌ API error: ${error}`);
    return [];
  }
}

async function lookupItem(
  itemName: string
): Promise<{ displayName: string; iconUrl: string } | null> {
  console.log(`\n🔍 Searching for "${itemName}"...`);

  const results = await searchItem(itemName);

  if (results.length === 0) {
    console.log(`   ❌ No results found for "${itemName}"`);
    const manual = await prompt(
      `   Enter icon URL manually (or press Enter to use placeholder): `
    );
    const iconUrl = manual || "https://assets.tarkov.dev/unknown-item-512.webp";
    return { displayName: `1x ${itemName}`, iconUrl };
  }

  // Show all matches and let user choose
  const maxShow = 15;
  console.log(`   Found ${results.length} matches:`);
  results.slice(0, maxShow).forEach((item, idx) => {
    console.log(`   ${String(idx + 1).padStart(2)}. ${item.name}`);
  });
  if (results.length > maxShow) {
    console.log(`   ... and ${results.length - maxShow} more`);
  }

  const choice = await prompt(
    `   Select (1-${Math.min(maxShow, results.length)}): `
  );
  const idx = parseInt(choice) - 1;

  if (idx >= 0 && idx < Math.min(maxShow, results.length)) {
    const item = results[idx];
    console.log(`   ✅ Selected: ${item.name}`);
    console.log(`      Icon: ${item.iconLink}`);
    return { displayName: `1x ${item.name}`, iconUrl: item.iconLink };
  }

  console.log(`   ❌ Invalid selection, using first result`);
  const item = results[0];
  return { displayName: `1x ${item.name}`, iconUrl: item.iconLink };
}

interface ResolvedItem {
  displayName: string;
  iconUrl: string;
}

async function main() {
  console.log("\n🔮 Cultist Circle Recipe Tool\n");
  console.log(
    "This tool helps you add new recipes by looking up items in the API.\n"
  );

  // Collect input items
  const inputStr = await prompt("Enter INPUT items (comma-separated):\n> ");
  const inputNames = inputStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (inputNames.length === 0) {
    console.log("❌ No input items provided. Exiting.");
    rl.close();
    return;
  }

  const inputItems: ResolvedItem[] = [];
  for (const name of inputNames) {
    const result = await lookupItem(name);
    if (result) {
      inputItems.push(result);
    }
  }

  // Collect output items
  console.log("");
  const outputStr = await prompt("Enter OUTPUT items (comma-separated):\n> ");
  const outputNames = outputStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (outputNames.length === 0) {
    console.log("❌ No output items provided. Exiting.");
    rl.close();
    return;
  }

  const outputItems: ResolvedItem[] = [];
  for (const name of outputNames) {
    const result = await lookupItem(name);
    if (result) {
      outputItems.push(result);
    }
  }

  // Crafting time
  console.log("");
  const craftingTimeInput = await prompt(
    "Crafting time (default: 66 mins):\n> "
  );
  const craftingTime = craftingTimeInput || "66 mins";

  // Is new?
  const isNewInput = await prompt("\nIs this a NEW recipe? (Y/n): ");
  const isNew = isNewInput.toLowerCase() !== "n";

  // Room info (optional)
  const hasRoomInfo = await prompt(
    "\nDoes this recipe have room spawn info? (y/N): "
  );
  let roomInfo: { itemName: string; spawnInfo: string } | null = null;

  if (hasRoomInfo.toLowerCase() === "y") {
    const roomItemName = await prompt("Room item name (e.g., the key name): ");
    const spawnInfo = await prompt("Spawn info text: ");
    roomInfo = { itemName: roomItemName, spawnInfo };
  }

  // Generate recipe object
  console.log("\n" + "=".repeat(60));
  console.log("📋 GENERATED RECIPE:");
  console.log("=".repeat(60) + "\n");

  const recipeLines: string[] = [];
  recipeLines.push("    {");
  recipeLines.push(
    `        requiredItems: [${inputItems
      .map((i) => `"${i.displayName}"`)
      .join(", ")}],`
  );
  recipeLines.push(`        craftingTime: "${craftingTime}",`);
  recipeLines.push("        producedItems: [");
  outputItems.forEach((item, idx) => {
    const comma = idx < outputItems.length - 1 ? "," : "";
    recipeLines.push(`            "${item.displayName}"${comma}`);
  });
  recipeLines.push("        ],");
  if (isNew) {
    recipeLines.push("        isNew: true,");
  }
  if (roomInfo) {
    recipeLines.push("        roomInfo: {");
    recipeLines.push(`            itemName: "${roomInfo.itemName}",`);
    recipeLines.push(`            spawnInfo: "${roomInfo.spawnInfo}",`);
    recipeLines.push("        },");
  }
  recipeLines.push("    },");

  const recipeCode = recipeLines.join("\n");
  console.log(recipeCode);

  // Generate icon mappings
  console.log("\n" + "=".repeat(60));
  console.log("🖼️  ICON MAPPINGS:");
  console.log("=".repeat(60) + "\n");

  const allItems = [...inputItems, ...outputItems];
  const iconMappings: string[] = [];

  for (const item of allItems) {
    const line = `  "${item.displayName}": "${item.iconUrl}",`;
    iconMappings.push(line);
    console.log(line);
  }

  // Ask to add to files
  console.log("\n" + "=".repeat(60));
  const addToFiles = await prompt("\nAdd to source files? (y/N): ");

  if (addToFiles.toLowerCase() === "y") {
    try {
      // Add recipe to recipes.ts (at the TOP of the array)
      const recipesPath = join(process.cwd(), "data/recipes.ts");
      const recipesContent = readFileSync(recipesPath, "utf-8");

      // Find the opening of the array (export const tarkovRecipes: Recipe[] = [)
      const arrayStartMatch = recipesContent.match(
        /export const tarkovRecipes:\s*Recipe\[\]\s*=\s*\[/
      );
      if (!arrayStartMatch || arrayStartMatch.index === undefined) {
        console.log("❌ Could not find tarkovRecipes array in recipes.ts");
      } else {
        const insertionPoint =
          arrayStartMatch.index + arrayStartMatch[0].length;
        const newRecipesContent =
          recipesContent.slice(0, insertionPoint) +
          "\n" +
          recipeCode +
          recipesContent.slice(insertionPoint);
        writeFileSync(recipesPath, newRecipesContent);
        console.log("✅ Added recipe to TOP of data/recipes.ts");
      }

      // Add icon mappings to recipe-icons.ts
      const iconsPath = join(process.cwd(), "data/recipe-icons.ts");
      const iconsContent = readFileSync(iconsPath, "utf-8");

      // Find the closing of the object (last "};")
      const iconInsertPoint = iconsContent.lastIndexOf("};");
      if (iconInsertPoint === -1) {
        console.log("❌ Could not find insertion point in recipe-icons.ts");
      } else {
        // Check which mappings already exist
        const newMappings = iconMappings.filter((mapping) => {
          const itemName = mapping.match(/"([^"]+)":/)?.[1];
          return itemName && !iconsContent.includes(`"${itemName}":`);
        });

        if (newMappings.length === 0) {
          console.log("ℹ️  All icon mappings already exist in recipe-icons.ts");
        } else {
          const newIconsContent =
            iconsContent.slice(0, iconInsertPoint) +
            newMappings.join("\n") +
            "\n" +
            iconsContent.slice(iconInsertPoint);
          writeFileSync(iconsPath, newIconsContent);
          console.log(
            `✅ Added ${newMappings.length} new icon mapping(s) to data/recipe-icons.ts`
          );
        }
      }
    } catch (error) {
      console.error("❌ Error writing to files:", error);
    }
  } else {
    console.log("\n📋 Copy the code above manually into your source files.");
  }

  console.log("\n✨ Done!\n");
  rl.close();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  rl.close();
  process.exit(1);
});
