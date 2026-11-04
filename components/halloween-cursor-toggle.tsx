"use client";

import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/language-context";
import { useHalloweenCursor } from "@/hooks/use-halloween-cursor";

/** Header switch for the Halloween cursor. Hidden outside the season. */
export function HalloweenCursorToggle() {
  const { t } = useLanguage();
  const { inSeason, enabled, setEnabled } = useHalloweenCursor();

  if (!inSeason) return null;

  return (
    <label
      htmlFor="halloween-cursor-toggle"
      className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400 hover:text-orange-300 transition-colors"
    >
      <span aria-hidden="true">🎃</span>
      {t("Candy cursor")}
      <Switch
        id="halloween-cursor-toggle"
        checked={enabled}
        onCheckedChange={setEnabled}
        className="data-[state=checked]:bg-orange-500"
      />
    </label>
  );
}
