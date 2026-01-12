"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { useLanguage } from "@/contexts/language-context";

interface WeaponWarningProps {
  selectedItems: SimplifiedItem[];
}

export function WeaponWarning({ selectedItems }: WeaponWarningProps) {
  const { t } = useLanguage();
  const weapons = selectedItems.filter(
    (item) =>
      item.categories?.includes("5422acb9af1c889c16000029") || // Weapon category ID
      item.categories_display?.some((cat) => cat.name === "Weapon") ||
      item.categories_display_en?.some((cat) => cat.name === "Weapon")
  );

  if (weapons.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-500/20 bg-amber-950/30 text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-400" />
      <AlertDescription className="text-xs">
        <div className="mb-2">
          <strong>{t("Weapon Base Values - Work in Progress:")}</strong>{" "}
          {t(
            "Weapon base values may be inaccurate. In addition to durability and attachments, weapons appear to use a special (currently unknown) multiplier that we have not fully worked out yet."
          )}
        </div>
        <div className="text-xs text-amber-400 mb-2">
          {t("Current weapons:")}{" "}
          {weapons.map((w) => w.shortName || w.name).join(", ")}
        </div>
        <div className="text-xs">
          {t("You can check the")}{" "}
          <strong>{t("Hot Sacrifices")}</strong>{" "}
          {t("panel at the top of the page for known, community-tested combos.")}
        </div>
      </AlertDescription>
    </Alert>
  );
}
