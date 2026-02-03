"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { useLanguage } from "@/contexts/language-context";
import { tarkovRecipes, Recipe } from "@/data/recipes";
import { useMemo } from "react";

// Configure which recipe items should trigger warnings
// To enable all recipes, set this to: null (or comment it out)
// To enable specific recipes only, add item names here (case-insensitive)
const ENABLED_RECIPE_ITEMS: string[] | null = ["Mazoni golden dumbbell"];

interface RecipeWarningProps {
  selectedItems: SimplifiedItem[];
}

export function RecipeWarning({ selectedItems }: RecipeWarningProps) {
  const { t } = useLanguage();

  const triggeredRecipes = useMemo(() => {
    const selectedItemNames = selectedItems
      .filter(Boolean)
      .map((item) => item.name.toLowerCase());

    return tarkovRecipes.filter((recipe) => {
      // Check if any of the selected items match any of the required items in this recipe
      const hasMatch = recipe.requiredItems.some((requiredItem) => {
        // Parse required item (format: "1x Item Name" or "Item Name")
        const itemName = requiredItem.replace(/^\d+x\s*/, "").toLowerCase();
        // Check if this exact item is selected
        return selectedItemNames.some(
          (selectedName) =>
            selectedName === itemName ||
            selectedName.includes(itemName) ||
            itemName.includes(selectedName)
        );
      });

      if (!hasMatch) return false;

      // If ENABLED_RECIPE_ITEMS is null, show all recipes
      if (ENABLED_RECIPE_ITEMS === null) return true;

      // Otherwise, only show recipes that match enabled items
      return recipe.requiredItems.some((requiredItem) => {
        const itemName = requiredItem.replace(/^\d+x\s*/, "").toLowerCase();
        return ENABLED_RECIPE_ITEMS.some(
          (enabledItem) => enabledItem.toLowerCase() === itemName
        );
      });
    });
  }, [selectedItems]);

  if (triggeredRecipes.length === 0) {
    return null;
  }

  const formatProducedItems = (recipe: Recipe): string => {
    return recipe.producedItems
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        // Handle multiple possible outcomes
        return `${item.explanation}: ${item.items.join(" or ")}`;
      })
      .join(" + ");
  };

  return (
    <Alert className="mb-4 border-amber-500/30 bg-amber-950/20 text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
      <AlertDescription className="text-xs space-y-2">
        <div className="font-semibold text-amber-300">
          {t("Known Recipe Detected")} —{" "}
          {t("Your sacrifice will trigger the following recipe(s):")}
        </div>
        <div className="space-y-2">
          {triggeredRecipes.map((recipe, index) => (
            <div
              key={index}
              className="bg-amber-950/30 border border-amber-500/20 rounded-md p-2 text-xs"
            >
              <div className="flex items-start gap-2">
                <Package className="h-3.5 w-3.5 text-amber-400/70 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-amber-200 font-medium mb-1">
                    {t("Input")}: {recipe.requiredItems.join(" + ")}
                  </div>
                  <div className="flex items-center gap-3 text-amber-400/80">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.craftingTime}
                    </span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-amber-500/20 text-emerald-400/90">
                    <span className="font-medium">{t("Reward")}:</span>{" "}
                    {formatProducedItems(recipe)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-amber-300/80 italic">
          {t(
            "You will only receive the recipe reward, not the normal threshold reward."
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
