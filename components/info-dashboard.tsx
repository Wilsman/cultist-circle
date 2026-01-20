"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { MaintenanceNotice } from "./maintenance-notice";
import { NOTIFICATIONS, NotificationCard } from "./notification-panel";
import { HOT_SACRIFICES, ComboRow } from "./hot-sacrifices-panel";
import { useDynamicNotifications } from "./dynamic-notification-system";
import { SHOW_MAINTENANCE_NOTICE } from "@/config/maintenance";
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

  const hasUpdates = SHOW_MAINTENANCE_NOTICE || allNotifications.length > 0;
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
  const maintenanceCount = SHOW_MAINTENANCE_NOTICE ? 1 : 0;
  const updatesTotalCount = maintenanceCount + allNotifications.length;
  const priorityNotifications = allNotifications.filter(
    (notification) => notification.priority === 0
  );
  const primaryNotifications =
    priorityNotifications.length > 0
      ? priorityNotifications
      : allNotifications.slice(0, 2);
  const primaryIds = new Set(primaryNotifications.map((notification) => notification.id));
  const remainingNotifications = allNotifications.filter(
    (notification) => !primaryIds.has(notification.id)
  );
  const showMaintenanceInPrimary =
    primaryNotifications.length === 0 && maintenanceCount > 0;
  const remainingUpdatesCount =
    remainingNotifications.length + (showMaintenanceInPrimary ? 0 : maintenanceCount);
  const showUpdatesExpand = remainingUpdatesCount > 0;

  // Recipes logic
  const recipesTotalCount = HOT_SACRIFICES.length;
  const showRecipesExpand = recipesTotalCount > 1;

  return (
    <div className="w-full max-w-3xl mx-auto mb-4 z-10">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/40 p-1 rounded-xl h-auto border-0 mb-2 z-10">
          <TabsTrigger
            value="updates"
            className="relative flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-slate-700/70 data-[state=active]:text-slate-100 data-[state=active]:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all duration-200 border-0 z-10"
          >
            <Bell className="h-4 w-4" />
            {t("Updates & Alerts")}
            {updatesTotalCount > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-500 ring-1 ring-amber-400/40">
                {updatesTotalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="recipes"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-300 data-[state=active]:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all duration-300 border-0"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [-5, 5, -5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Flame className="h-4 w-4" />
            </motion.div>
            {t("Hot Sacrifices")}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="updates"
          className="space-y-3 focus-visible:ring-0 mt-0"
        >
          {/* Always show priority items */}
          {showMaintenanceInPrimary && <MaintenanceNotice />}
          {primaryNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={handleUpdatesToggle}
            />
          ))}

          {/* Collapsible section for the remaining items */}
          {showUpdatesExpand && (
            <>
              <div
                className={`space-y-2 ${updatesExpanded ? "block" : "hidden"}`}
              >
                {!showMaintenanceInPrimary && SHOW_MAINTENANCE_NOTICE && (
                  <MaintenanceNotice />
                )}
                {remainingNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={handleUpdatesToggle}
                  />
                ))}
              </div>
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUpdatesExpanded(!updatesExpanded)}
                  className="text-[10px] font-medium text-slate-300 bg-slate-800/30 hover:bg-slate-800/60 hover:text-slate-200 h-6 px-3 border border-slate-700/30 rounded-full transition-all duration-200"
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
          className="space-y-3 focus-visible:ring-0 mt-0"
        >
          {/* Always show the first combo */}
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
                className={`space-y-3 ${recipesExpanded ? "block" : "hidden"}`}
              >
                {HOT_SACRIFICES.slice(1).map((combo) => (
                  <ComboRow
                    key={combo.id}
                    combo={combo}
                    onUseThis={onUseThis}
                    estimatedCost={sacrificeCosts[combo.id]}
                  />
                ))}
                <div className="mt-3 pt-3 border-t border-slate-700/30 text-center">
                  <p className="text-[10px] text-slate-500">
                    {t("Values based on vendor sell prices and trading multipliers.")}
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecipesExpanded(!recipesExpanded)}
                  className="text-[10px] font-bold text-slate-400 bg-white/[0.03] hover:bg-indigo-500/10 hover:text-indigo-300 h-7 px-4 border border-white/5 hover:border-indigo-500/20 rounded-full transition-all duration-300"
                >
                  {recipesExpanded
                    ? t("Show Less")
                    : t("Show {count} More", { count: recipesTotalCount - 1 })}
                  <ChevronDown
                    className={`ml-2 h-3 w-3 transition-transform duration-300 ${
                      recipesExpanded ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
