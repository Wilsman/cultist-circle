"use client";

import { useState, useMemo } from "react";
import { Search, AlertTriangle, Package, Clock, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { RITUAL_6H_EXCLUSIONS } from "@/config/ritual-exclusions";

export default function IncompatibleItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const incompatibleItems = Array.from(DEFAULT_EXCLUDED_ITEMS).sort();
  const ritual6hExclusions = Array.from(RITUAL_6H_EXCLUSIONS).sort();

  // Simple grouping based on the categories in excluded-items.ts
  const incompatibleItemGroups = useMemo(() => {
    const groups = {
      "Ammunition & Explosives": ["26x75 mm flares cartridges", "40x46mm grenade"],
      "Currency & Valuables": ["Roubles", "Dollars", "Euros", "GP coin"],
      "Tools & Equipment": [
        "MS2000 Marker", "Leatherman Multitool", "Tripwire installation kit", 
        "Vortes Ranger 1500 rangefinder", "Digital secure DSP radio transmitter",
        '"The Eye" mortar strike signaling device', "Mark of the unheard",
        "Radar station spare parts", "GARY ZONT portable electronic warfare device",
        "Sacred Amulet", "WI-FI Camera", "Signal Jammer", 
        "EYE MK2 professional hand-held compass", "KOSA UAV electronic jamming device"
      ],
      "Backpacks": [
        "Takedown sling backpack (MultiCam)", "Takedown sling backpack (Black)",
        "Blackjack 50", "Pilgrim", "SSO Attack 2 raid backpack (Khaki)",
        "6SH118 raid backpack", "Mystery Ranch SATL", "F4 Terminator",
        "Gunslinger II", "RUSH 100", "Santa's Bag"
      ],
      "Signal Cartridges": [
        "RSP-30 reactive signal cartirdge (Blue)", 
        "RSP-30 reactive signal cartridge (Special Yellow)",
        "RSP-30 reactive signal cartridge (Firework)"
      ],
      "Weapons": [
        "M60E6 (FDE)", "M60E6", "M60E4", "SR-3M", "Desert Eagle L5 .357",
        "Desert Eagle L5 .50 AE", "Desert Eagle L6 .50 AE", "Desert Eagle L6 .50 AE WTS",
        "Desert Deagle Mk XIX .50 AE", "UZI 9x19 submachine gun", 
        "UZI PRO SMG 9x19 submachine gun", "UZI PRO Pistol 9x19 submachine gun", "Saiko TRG M10"
      ],
      "Containers & Special Items": [
        "Sealed box", "Contraband box", "Locked case", "Case key",
        "Special 40-degree fuel", "Mr Kerman's cat hologram"
      ],
      "Food & Holiday Items": [
        "Jar of pickles", "Olivier salad box", "SHYSHKA Christmas tree life extender",
        "Christmas gift", "Small Christmas gift"
      ],
      "Keys & Documents": [
        "Key 01", "Key 02", "Key 03", "Key 04", "Labrys research notes",
        "Final Moment poster", "Taurus poster", "Tark Souls poster",
        "Last Breath poster", "Sealed weapon case", "Key case", "Thumb drive with military data"
      ]
    };

    // Filter groups to only include items that exist in the current incompatible items
    const filteredGroups: { [key: string]: string[] } = {};
    Object.entries(groups).forEach(([groupName, groupItems]) => {
      const existingItems = groupItems.filter(item => incompatibleItems.includes(item));
      if (existingItems.length > 0) {
        filteredGroups[groupName] = existingItems;
      }
    });

    return filteredGroups;
  }, [incompatibleItems]);
  
  const filteredIncompatibleItems = useMemo(() => {
    if (!searchTerm.trim()) return incompatibleItems;
    
    const term = searchTerm.toLowerCase();
    return incompatibleItems.filter(item => 
      item.toLowerCase().includes(term)
    );
  }, [searchTerm, incompatibleItems]);

  const filteredRitual6hItems = useMemo(() => {
    if (!searchTerm.trim()) return ritual6hExclusions;
    
    const term = searchTerm.toLowerCase();
    return ritual6hExclusions.filter(item => 
      item.toLowerCase().includes(term)
    );
  }, [searchTerm, ritual6hExclusions]);


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Item Exclusions Guide</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Check which items cannot be used in rituals and which items cannot be returned from 6h rituals.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="incompatible" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incompatible" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Incompatible Items
          </TabsTrigger>
          <TabsTrigger value="ritual6h" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            6h Ritual Exclusions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incompatible" className="mt-6">
          <Card className="mb-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-500">{incompatibleItems.length}</div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-green-500">{filteredIncompatibleItems.length}</div>
                  <div className="text-sm text-muted-foreground">Matching Items</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Cannot be used in any Cultist Circle ritual</h3>
                <p className="text-sm text-muted-foreground">
                  These items are completely incompatible with ritual mechanics and are automatically excluded from calculations.
                </p>
              </div>
              {searchTerm.trim() ? (
                // Show filtered results when searching
                filteredIncompatibleItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No items found</p>
                    <p className="text-muted-foreground">Try adjusting your search term.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredIncompatibleItems.map((item) => (
                      <div
                        key={item}
                        className="p-3 rounded-lg bg-red-500/10 hover:bg-red-500/15 transition-colors border border-red-500/20"
                      >
                        <span className="text-sm font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Show grouped results when not searching
                <div className="space-y-4">
                  {Object.entries(incompatibleItemGroups).map(([groupName, groupItems]) => (
                    <div key={groupName}>
                      <h4 className="text-sm font-semibold text-red-300 mb-2 px-1">{groupName}</h4>
                      <div className="space-y-1">
                        {groupItems.map((item) => (
                          <div
                            key={item}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 transition-colors border border-red-500/20"
                          >
                            <span className="text-sm font-medium">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ritual6h" className="mt-6">
          <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-500">{ritual6hExclusions.length}</div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-green-500">{filteredRitual6hItems.length}</div>
                  <div className="text-sm text-muted-foreground">Matching Items</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Cannot be returned from 6h rituals</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  These high-value quest/hideout items can be used in rituals but will never be returned as rewards from 6h rituals.
                </p>
              </div>
              {filteredRitual6hItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No items found</p>
                  <p className="text-muted-foreground">Try adjusting your search term.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRitual6hItems.map((item) => (
                    <div
                      key={item}
                      className="p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/15 transition-colors border border-blue-500/20"
                    >
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                <div className="p-1">
                  <p className="text-xs text-yellow-300">
                    <span className="font-medium">*</span> can still be received as a reward from 14h rituals
                  </p>
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
