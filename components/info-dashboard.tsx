"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceNotice } from "./maintenance-notice";
import { NOTIFICATIONS, NotificationCard } from "./notification-panel";
import { HOT_SACRIFICES, ComboRow } from "./hot-sacrifices-panel";
import { SHOW_MAINTENANCE_NOTICE } from "@/config/maintenance";
import { Bell, Flame, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InfoDashboard() {
  const hasUpdates = SHOW_MAINTENANCE_NOTICE || NOTIFICATIONS.length > 0;
  const defaultTab = hasUpdates ? "updates" : "recipes";

  const [updatesExpanded, setUpdatesExpanded] = useState(false);
  const [recipesExpanded, setRecipesExpanded] = useState(false);

  // Updates logic
  const updatesTotalCount =
    (SHOW_MAINTENANCE_NOTICE ? 1 : 0) + NOTIFICATIONS.length;
  const showUpdatesExpand = updatesTotalCount > 1;

  // Recipes logic
  const recipesTotalCount = HOT_SACRIFICES.length;
  const showRecipesExpand = recipesTotalCount > 1;

  return (
    <div className="w-full max-w-3xl mx-auto mb-4">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/40 p-1 rounded-xl h-auto border-0 mb-2">
          <TabsTrigger
            value="updates"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-slate-700/60 data-[state=active]:text-slate-100 data-[state=active]:shadow-sm transition-all duration-200 border-0"
          >
            <Bell className="h-4 w-4" />
            Updates & Alerts
            {NOTIFICATIONS.length > 0 && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-500">
                {NOTIFICATIONS.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="recipes"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-300 data-[state=active]:shadow-sm transition-all duration-200 border-0"
          >
            <Flame className="h-4 w-4" />
            Hot Sacrifices
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="updates"
          className="space-y-3 focus-visible:ring-0 mt-0"
        >
          {/* Always show the first item */}
          {SHOW_MAINTENANCE_NOTICE ? (
            <MaintenanceNotice />
          ) : (
            NOTIFICATIONS.length > 0 && (
              <NotificationCard notification={NOTIFICATIONS[0]} />
            )
          )}

          {/* Collapsible section for the remaining items */}
          {showUpdatesExpand && (
            <>
              <div
                className={`space-y-2 ${updatesExpanded ? "block" : "hidden"}`}
              >
                {SHOW_MAINTENANCE_NOTICE
                  ? // If maintenance is shown, all notifications are hidden by default
                    NOTIFICATIONS.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                      />
                    ))
                  : // If maintenance is NOT shown, the first notification is already shown above
                    NOTIFICATIONS.slice(1).map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUpdatesExpanded(!updatesExpanded)}
                className="w-full text-xs font-medium text-slate-300 bg-slate-800/30 hover:bg-slate-800/60 hover:text-slate-200 h-8 border border-slate-700/30 rounded-lg transition-all duration-200"
              >
                {updatesExpanded
                  ? "Show Less"
                  : `Show ${updatesTotalCount - 1} More`}
                <ChevronDown
                  className={`ml-2 h-3 w-3 transition-transform duration-200 ${
                    updatesExpanded ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent
          value="recipes"
          className="space-y-3 focus-visible:ring-0 mt-0"
        >
          {/* Always show the first combo */}
          {HOT_SACRIFICES.length > 0 && <ComboRow combo={HOT_SACRIFICES[0]} />}

          {showRecipesExpand && (
            <>
              <div
                className={`space-y-3 ${recipesExpanded ? "block" : "hidden"}`}
              >
                {HOT_SACRIFICES.slice(1).map((combo) => (
                  <ComboRow key={combo.id} combo={combo} />
                ))}
                <div className="mt-3 pt-3 border-t border-slate-700/30 text-center">
                  <p className="text-[10px] text-slate-500">
                    Values based on vendor sell prices and trading multipliers.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecipesExpanded(!recipesExpanded)}
                className="w-full text-xs font-medium text-slate-300 bg-slate-800/30 hover:bg-slate-800/60 hover:text-slate-200 h-8 border border-slate-700/30 rounded-lg transition-all duration-200"
              >
                {recipesExpanded
                  ? "Show Less"
                  : `Show ${recipesTotalCount - 1} More`}
                <ChevronDown
                  className={`ml-2 h-3 w-3 transition-transform duration-200 ${
                    recipesExpanded ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
