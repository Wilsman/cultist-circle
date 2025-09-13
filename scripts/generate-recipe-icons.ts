import { fetchCombinedTarkovData } from '@/hooks/use-tarkov-api';
import { RecipeItemMatcher, extractItemName } from '@/lib/recipe-item-matcher';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Recipe data (copied from recipes page)
const tarkovRecipes = [
  {
    requiredItems: ["1x WD-40 (400ml)"],
    craftingTime: "66 mins",
    producedItems: ["WD-40 (100ml)"],
    isNew: true,
  },
  {
    requiredItems: ["1x Bottle of water (0.6L)"],
    craftingTime: "66 mins",
    producedItems: ["Fleece fabric"],
  },
  {
    requiredItems: ["1x Nailhead figurine", "1x Xenoalien figurine", "1x Pointy guy figurine", "1x Petya Crooker figurine", "1x Count Bloodsucker figurine"],
    craftingTime: "66 mins",
    producedItems: ["Tagilla's welding mask \"ZABEY\" (Replica)"],
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

interface IconMapping {
  itemName: string;
  cleanName: string;
  iconUrl: string | null;
  matchScore: number | null;
  matchedApiName: string | null;
}

async function generateRecipeIconMappings() {
  console.log('🔄 Fetching Tarkov API data...');
  
  try {
    // Fetch API data
    const apiData = await fetchCombinedTarkovData('en');
    const items = apiData.pvp; // Use PVP items
    
    console.log(`✅ Fetched ${items.length} items from API`);
    
    // Create matcher
    const matcher = new RecipeItemMatcher(items);
    
    // Collect all unique item names from recipes
    const allItemNames = new Set<string>();
    
    tarkovRecipes.forEach(recipe => {
      recipe.requiredItems.forEach(item => allItemNames.add(item));
      recipe.producedItems.forEach(item => {
        // Split comma-separated items
        item.split(',').forEach(subItem => allItemNames.add(subItem.trim()));
      });
    });
    
    console.log(`🔍 Processing ${allItemNames.size} unique item names...`);
    
    // Generate mappings
    const mappings: IconMapping[] = [];
    
    for (const itemName of allItemNames) {
      const cleanName = extractItemName(itemName);
      const match = matcher.findMatch(itemName);
      
      mappings.push({
        itemName,
        cleanName,
        iconUrl: match?.item.iconLink || null,
        matchScore: match?.score || null,
        matchedApiName: match?.item.name || null
      });
    }
    
    // Sort by match quality (lower score = better match)
    mappings.sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return a.matchScore - b.matchScore;
    });
    
    // Write to file
    const outputPath = join(process.cwd(), 'recipe-icon-mappings.json');
    writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
    
    console.log(`📝 Generated mappings written to: ${outputPath}`);
    
    // Print summary
    const matched = mappings.filter(m => m.iconUrl !== null);
    const unmatched = mappings.filter(m => m.iconUrl === null);
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Matched: ${matched.length}`);
    console.log(`   ❌ Unmatched: ${unmatched.length}`);
    console.log(`   📈 Match rate: ${((matched.length / mappings.length) * 100).toFixed(1)}%`);
    
    if (unmatched.length > 0) {
      console.log(`\n❌ Unmatched items:`);
      unmatched.forEach(item => {
        console.log(`   - "${item.itemName}" (cleaned: "${item.cleanName}")`);
      });
    }
    
    console.log(`\n✨ You can now copy the iconUrl values from recipe-icon-mappings.json into your recipe data structure!`);
    
  } catch (error) {
    console.error('❌ Error generating mappings:', error);
    process.exit(1);
  }
}

// Run the script
generateRecipeIconMappings();
