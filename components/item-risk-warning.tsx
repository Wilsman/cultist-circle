"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { useLanguage } from "@/contexts/language-context";
import { formatMessageSlots } from "@/lib/format-message-slots";
import { getItemRisks, ITEM_RISK_ORDER, type ItemRisk } from "@/lib/item-risk";

interface ItemRiskWarningProps {
  selectedItems: SimplifiedItem[];
}

/** One card that groups selected items by why their result may be off. */
export function ItemRiskWarning({ selectedItems }: ItemRiskWarningProps) {
  const { t } = useLanguage();

  const groups = new Map<ItemRisk, string[]>();
  for (const item of selectedItems) {
    for (const risk of getItemRisks(item)) {
      const names = groups.get(risk) ?? [];
      const name = item.shortName || item.name;
      if (!names.includes(name)) names.push(name);
      groups.set(risk, names);
    }
  }

  if (groups.size === 0) return null;

  const explain = (risk: ItemRisk) => {
    if (risk === "unverified-value") {
      return t(
        "Base values for weapons, armour and rigs aren't confirmed, so the timer may not match."
      );
    }
    if (risk === "has-uses") {
      return t(
        "The cheapest flea listing may be a partly used copy. A full one can cost a lot more."
      );
    }
    return t(
      "Price and base value shown are for a single round. A stack is worth more and costs more."
    );
  };

  return (
    <Alert className="mb-4 border-amber-500/20 bg-amber-950/30 text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-400" />
      <AlertDescription className="space-y-2 text-xs">
        <strong className="block">
          {t("These items may not give the expected result")}
        </strong>
        <ul className="space-y-2">
          {ITEM_RISK_ORDER.filter((risk) => groups.has(risk)).map((risk) => (
            <li key={risk} data-risk={risk}>
              <div>{explain(risk)}</div>
              <div className="text-amber-400">
                {groups.get(risk)!.join(", ")}
              </div>
              {risk === "unverified-value" && (
                <div className="mt-1">
                  {formatMessageSlots(
                    t(
                      "You can check the {list} list for known, community-tested combos."
                    ),
                    { list: <strong>{t("Hot Sacrifices")}</strong> }
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
