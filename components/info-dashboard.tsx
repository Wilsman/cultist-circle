"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOTIFICATIONS, NotificationCard } from "./notification-panel";
import { HOT_SACRIFICES, ComboRow } from "./hot-sacrifices-panel";
import { useDynamicNotifications } from "./dynamic-notification-system";
import { Bell, Flame, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { SacrificeCombo } from "./hot-sacrifices-panel";
import { useLanguage } from "@/contexts/language-context";

interface InfoDashboardProps {
  selectedItems?: SimplifiedItem[];
  onUseThis?: (combo: SacrificeCombo) => void;
  availableItems?: SimplifiedItem[];
  sacrificeCosts?: Record<string, number>;
}

export function InfoDashboard({
  selectedItems = [],
  onUseThis,
  sacrificeCosts = {},
}: InfoDashboardProps) {
  const { t } = useLanguage();
  const dynamicNotifications = useDynamicNotifications(selectedItems);

  const allNotifications = [...NOTIFICATIONS, ...dynamicNotifications];

  const hasUpdates = allNotifications.length > 0;
  const defaultTab = hasUpdates ? "updates" : "recipes";

  const [updatesExpanded, setUpdatesExpanded] = useState(false);
  const [recipesExpanded, setRecipesExpanded] = useState(false);

  const handleUpdatesToggle = () => {
    if (!showUpdatesExpand) {
      return;
    }
    setUpdatesExpanded((prev) => !prev);
  };

  // Updates logic
  const updatesTotalCount = allNotifications.length;
  const priorityNotifications = allNotifications.filter(
    (notification) => notification.priority === 0,
  );
  const primaryNotifications =
    priorityNotifications.length > 0
      ? priorityNotifications
      : allNotifications.slice(0, 2);
  const primaryIds = new Set(
    primaryNotifications.map((notification) => notification.id),
  );
  const remainingNotifications = allNotifications.filter(
    (notification) => !primaryIds.has(notification.id),
  );
  const remainingUpdatesCount = remainingNotifications.length;
  const showUpdatesExpand = remainingUpdatesCount > 0;

  // Recipes logic
  const recipesTotalCount = HOT_SACRIFICES.length;
  const showRecipesExpand = recipesTotalCount > 1;

  return (
    <section className="w-full max-w-3xl mx-auto mb-4 z-10">
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-950/45 shadow-xl shadow-black/20 backdrop-blur-md">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b border-slate-700/50 bg-slate-900/60 p-1">
            <TabsTrigger
              value="updates"
              className="relative flex items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs font-semibold text-slate-400 transition-all duration-200 data-[state=active]:border-slate-600/60 data-[state=active]:bg-slate-800/80 data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
            >
              <Bell className="h-4 w-4" />
              {t("Updates & Alerts")}
              {updatesTotalCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 text-[10px] font-bold text-amber-200">
                  {updatesTotalCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="recipes"
              className="flex items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2 text-xs font-semibold text-slate-400 transition-all duration-200 data-[state=active]:border-slate-600/60 data-[state=active]:bg-slate-800/80 data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
            >
              <Flame className="h-4 w-4" />
              {t("Hot Sacrifices")}
              <span className="ml-1 hidden rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200 sm:inline-flex">
                {recipesTotalCount}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="updates"
            className="mt-0 space-y-2 p-3 focus-visible:ring-0 sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-slate-400">
                Current calculator notes and reward warnings.
              </p>
              {showUpdatesExpand && (
                <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:block">
                  {remainingUpdatesCount} hidden
                </span>
              )}
            </div>

            {primaryNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={handleUpdatesToggle}
              />
            ))}

            {showUpdatesExpand && (
              <>
                <div
                  className={`space-y-2 ${updatesExpanded ? "block" : "hidden"}`}
                >
                  {remainingNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onClick={handleUpdatesToggle}
                    />
                  ))}
                </div>
                <div className="flex justify-center pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUpdatesExpanded(!updatesExpanded)}
                    className="h-7 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  >
                    {updatesExpanded
                      ? t("Show Less Updates")
                      : t("Show {count} More Updates", {
                          count: remainingUpdatesCount,
                        })}
                    <ChevronDown
                      className={`ml-2 h-3 w-3 transition-transform duration-200 ${
                        updatesExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent
            value="recipes"
            className="mt-0 space-y-2 p-3 focus-visible:ring-0 sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-slate-400">
                Community-tested inputs for target reward thresholds.
              </p>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:block">
                Lowest cost first
              </span>
            </div>

            {HOT_SACRIFICES.length > 0 && (
              <ComboRow
                combo={HOT_SACRIFICES[0]}
                onUseThis={onUseThis}
                estimatedCost={sacrificeCosts[HOT_SACRIFICES[0].id]}
              />
            )}

            {showRecipesExpand && (
              <>
                <div
                  className={`space-y-2 ${recipesExpanded ? "block" : "hidden"}`}
                >
                  {HOT_SACRIFICES.slice(1).map((combo) => (
                    <ComboRow
                      key={combo.id}
                      combo={combo}
                      onUseThis={onUseThis}
                      estimatedCost={sacrificeCosts[combo.id]}
                    />
                  ))}
                  <div className="pt-2 text-center">
                    <p className="text-[10px] text-slate-500">
                      {t(
                        "Values based on vendor sell prices and trading multipliers.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex justify-center pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecipesExpanded(!recipesExpanded)}
                    className="h-7 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  >
                    {recipesExpanded
                      ? t("Show Less")
                      : t("Show {count} More", {
                          count: recipesTotalCount - 1,
                        })}
                    <ChevronDown
                      className={`ml-2 h-3 w-3 transition-transform duration-200 ${
                        recipesExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
