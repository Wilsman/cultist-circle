"use client";

import { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  Package,
  Clock,
  Ban,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Target,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { RITUAL_6H_EXCLUSIONS } from "@/config/ritual-exclusions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";

interface FAQItemProps {
  id?: string;
  question: string;
  answer: React.ReactNode;
  icon?: React.ReactNode;
}

function FAQItem({ id, question, answer, icon }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (
      id &&
      typeof window !== "undefined" &&
      window.location.hash === `#${id}`
    ) {
      setIsOpen(true);
    }
  }, [id]);

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id && typeof window !== "undefined") {
      const url = `${window.location.origin}/faq#${id}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  return (
    <div
      id={id}
      className={cn(
        "border rounded-xl overflow-hidden bg-white/5 mb-3 transition-all scroll-mt-24",
        isOpen ? "border-yellow-500/30" : "border-white/10"
      )}
    >
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors gap-3"
        >
          <div className="flex items-center gap-3">
            {icon && <div className="text-yellow-500">{icon}</div>}
            <span className="font-semibold text-gray-200">{question}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {id && (
          <button
            onClick={copyLink}
            className="p-3 hover:bg-white/5 text-gray-500 hover:text-yellow-400 transition-colors"
            title="Copy link to this section"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="p-4 pt-0 text-sm text-gray-400 leading-relaxed border-t border-white/5">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const incompatibleItems = Array.from(DEFAULT_EXCLUDED_ITEMS).sort();
  const ritual6hExclusions = Array.from(RITUAL_6H_EXCLUSIONS).sort();

  const incompatibleItemGroups = useMemo(() => {
    const groups = {
      "Ammunition & Explosives": [
        "26x75 mm flares cartridges",
        "40x46mm grenade",
      ],
      "Currency & Valuables": ["Roubles", "Dollars", "Euros", "GP coin"],
      "Tools & Equipment": [
        "MS2000 Marker",
        "Leatherman Multitool",
        "Tripwire installation kit",
        "Vortes Ranger 1500 rangefinder",
        "Digital secure DSP radio transmitter",
        '"The Eye" mortar strike signaling device',
        "Mark of the unheard",
        "Radar station spare parts",
        "GARY ZONT portable electronic warfare device",
        "Sacred Amulet",
        "WI-FI Camera",
        "Signal Jammer",
        "EYE MK2 professional hand-held compass",
        "KOSA UAV electronic jamming device",
      ],
      Backpacks: [
        "Takedown sling backpack (MultiCam)",
        "Takedown sling backpack (Black)",
        "Blackjack 50",
        "Pilgrim",
        "SSO Attack 2 raid backpack (Khaki)",
        "6SH118 raid backpack",
        "Mystery Ranch SATL",
        "F4 Terminator",
        "Gunslinger II",
        "RUSH 100",
        "Santa's Bag",
      ],
      "Signal Cartridges": [
        "RSP-30 reactive signal cartirdge (Blue)",
        "RSP-30 reactive signal cartridge (Special Yellow)",
        "RSP-30 reactive signal cartridge (Firework)",
      ],
      Weapons: [
        "M60E6 (FDE)",
        "M60E6",
        "M60E4",
        "SR-3M",
        "Desert Eagle L5 .357",
        "Desert Eagle L5 .50 AE",
        "Desert Eagle L6 .50 AE",
        "Desert Eagle L6 .50 AE WTS",
        "Desert Deagle Mk XIX .50 AE",
        "UZI 9x19 submachine gun",
        "UZI PRO SMG 9x19 submachine gun",
        "UZI PRO Pistol 9x19 submachine gun",
        "Saiko TRG M10",
      ],
      "Containers & Special Items": [
        "Sealed box",
        "Contraband box",
        "Locked case",
        "Case key",
        "Special 40-degree fuel",
        "Mr Kerman's cat hologram",
      ],
      "Food & Holiday Items": [
        "Jar of pickles",
        "Olivier salad box",
        "SHYSHKA Christmas tree life extender",
        "Christmas gift",
        "Small Christmas gift",
      ],
      "Keys & Documents": [
        "Key 01",
        "Key 02",
        "Key 03",
        "Key 04",
        "Labrys research notes",
        "Final Moment poster",
        "Taurus poster",
        "Tark Souls poster",
        "Last Breath poster",
        "Sealed weapon case",
        "Key case",
        "Thumb drive with military data",
      ],
    };

    const filteredGroups: { [key: string]: string[] } = {};
    Object.entries(groups).forEach(([groupName, groupItems]) => {
      const existingItems = groupItems.filter((item) =>
        incompatibleItems.includes(item)
      );
      if (existingItems.length > 0) {
        filteredGroups[groupName] = existingItems;
      }
    });

    return filteredGroups;
  }, [incompatibleItems]);

  const filteredIncompatibleItems = useMemo(() => {
    if (!searchTerm.trim()) return incompatibleItems;
    const term = searchTerm.toLowerCase();
    return incompatibleItems.filter((item) =>
      item.toLowerCase().includes(term)
    );
  }, [searchTerm, incompatibleItems]);

  const filteredRitual6hItems = useMemo(() => {
    if (!searchTerm.trim()) return ritual6hExclusions;
    const term = searchTerm.toLowerCase();
    return ritual6hExclusions.filter((item) =>
      item.toLowerCase().includes(term)
    );
  }, [searchTerm, ritual6hExclusions]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <HelpCircle className="h-10 w-10 text-yellow-500" />
          <h1 className="text-4xl font-bold tracking-tight">Help & FAQ</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Everything you need to know about the Cultist Circle rituals, item
          values, and calculator mechanics.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="general" className="gap-2">
            <Info className="h-4 w-4" />
            General FAQ
          </TabsTrigger>
          <TabsTrigger value="incompatible" className="gap-2">
            <Ban className="h-4 w-4" />
            Incompatible Items
          </TabsTrigger>
          <TabsTrigger value="ritual6h" className="gap-2">
            <Clock className="h-4 w-4" />
            6h Exclusions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-4">
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-500">
                <HelpCircle className="h-5 w-5" />
                Calculator Guide
              </h2>
              <FAQItem
                id="how-to-use"
                question="How do I use the calculator?"
                answer={
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-200">
                          1. Set Threshold
                        </span>
                        <p className="text-xs">
                          Select your target value (e.g., 400,000₽ for 6h
                          ritual).
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-200">
                          2. Select Items
                        </span>
                        <p className="text-xs">
                          Search and add items to the 5 ritual slots.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-200">
                          3. Check Settings
                        </span>
                        <p className="text-xs">
                          Configure excluded categories and price preferences.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-200">
                          4. Auto Select
                        </span>
                        <p className="text-xs">
                          Let the app find the most cost-effective combination.
                        </p>
                      </div>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-3 rounded-lg">
                      <p className="text-xs font-medium text-yellow-500 uppercase mb-1">
                        ★ Key Feature: Pinning
                      </p>
                      <p className="text-xs text-yellow-200/80">
                        Click the Pin icon on an item to force the Auto Select
                        feature to include it in the final calculation. Great
                        for items you already have in your stash!
                      </p>
                    </div>
                  </div>
                }
              />
              <FAQItem
                id="item-hints"
                question="What are 'Item Hints'?"
                answer={
                  <p>
                    Smart suggestions appear below empty slots with color-coded
                    hints. They guide you toward items that will help you reach
                    your current threshold efficiently.
                  </p>
                }
              />
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 mt-4 flex items-center gap-2 text-yellow-500">
                <Target className="h-5 w-5" />
                Ritual Mechanics
              </h2>
              <FAQItem
                id="durations"
                question="How do ritual durations work?"
                answer={
                  <div className="space-y-3">
                    <p>
                      Ritual duration determines the quality and type of rewards
                      you receive:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <span className="text-blue-400 font-medium whitespace-nowrap">
                          12 Hours:
                        </span>{" "}
                        Normal random loot. Triggered by sacrifices under
                        350,001₽.
                      </li>
                      <li>
                        <span className="text-purple-400 font-medium whitespace-nowrap">
                          14 Hours:
                        </span>{" "}
                        High-value loot. Triggered by sacrifices between
                        350,001₽ and 399,999₽.
                      </li>
                      <li>
                        <span className="text-yellow-400 font-medium whitespace-nowrap">
                          6 Hours:
                        </span>{" "}
                        Quest & Hideout items. This is the most desirable
                        outcome.
                      </li>
                    </ul>
                  </div>
                }
              />
              <FAQItem
                id="thresholds"
                question="What are the value thresholds for a 6h ritual?"
                answer={
                  <div className="space-y-2">
                    <p>
                      To have a chance at a 6-hour ritual, your total sacrifice
                      must be{" "}
                      <span className="text-yellow-400 font-bold">
                        400,000₽ or more
                      </span>
                      .
                    </p>
                    <p className="bg-white/5 p-3 rounded-lg italic">
                      Note: At 400k+, you have a{" "}
                      <span className="text-green-400">25% chance</span> for a
                      6h ritual and a{" "}
                      <span className="text-purple-400">75% chance</span> for a
                      14h ritual. Adding more value beyond 400k does NOT
                      increase this 25% chance.
                    </p>
                  </div>
                }
              />
              <FAQItem
                id="base-value"
                question="How is 'Base Value' calculated?"
                answer={
                  <div className="space-y-2">
                    <p>
                      The Cultist Circle uses an internal "base value" for
                      items, which is different from flea or trader prices.
                    </p>
                    <div className="bg-gray-800/50 p-4 rounded-xl text-center font-mono border border-white/5">
                      Base Value = Vendor Sell Price ÷ Vendor's Multiplier
                    </div>
                    <p className="text-xs text-gray-500">
                      Example: A Graphics Card sells to Therapist for 124,740₽.
                      Her multiplier is 0.63. Base Value = 124,740 ÷ 0.63 =
                      198,682₽.
                    </p>
                  </div>
                }
              />
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 mt-4 flex items-center gap-2 text-blue-500">
                <DollarSign className="h-5 w-5" />
                Item & Category Issues
              </h2>
              <FAQItem
                id="weapon-base-values"
                question="Why do some weapons have such high Base Values?"
                answer={
                  <div className="space-y-2">
                    <p>
                      Weapon base values are tied to their trader sell prices.
                      Rare or high-tier weapons like the{" "}
                      <span className="text-yellow-400">HK G28</span> have very
                      high sell values, making them extremely efficient for
                      reaching the 400k threshold.
                    </p>
                    <p>
                      However, many weapon "mods" or attachments have low base
                      values, and the calculation for full weapon builds can be
                      uncertain due to durability and the number of attached
                      parts.
                    </p>
                  </div>
                }
              />
              <FAQItem
                id="categories"
                question="Why are some items hidden in 'Excluded Categories'?"
                answer={
                  <p>
                    In the <span className="font-bold">Settings</span> menu, you
                    can toggle which categories of items you are willing to
                    sacrifice. If a category is unchecked, any items belonging
                    to it will be hidden from the calculator and auto-select
                    feature to prevent unintentional sacrifices of gear you'd
                    rather keep.
                  </p>
                }
              />
              <FAQItem
                id="incompatible"
                question="Why can't I use certain items in the ritual?"
                answer={
                  <p>
                    Some items are hard-coded as{" "}
                    <span className="text-red-400">Incompatible</span> (see the
                    Incompatible Items tab). These include special containers,
                    certain ammunition, and unique items that the game mechanics
                    simply don't allow to be sacrificed.
                  </p>
                }
              />
              <FAQItem
                id="weapons-hidden"
                question="Why are weapons hidden by default?"
                answer={
                  <div className="space-y-2">
                    <p>
                      The{" "}
                      <span className="text-yellow-400 font-bold">Weapon</span>{" "}
                      category is disabled by default for two main reasons:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <span className="font-semibold text-gray-200">
                          Base Value Uncertainty:
                        </span>{" "}
                        Weapon base values are complex and can vary based on
                        durability and the specific combination of attached
                        parts/mods.
                      </li>
                    </ul>
                    <p>
                      You can enable weapons in{" "}
                      <span className="font-bold">
                        Settings &gt; Categories
                      </span>{" "}
                      if you have spares you're willing to sacrifice.
                    </p>
                  </div>
                }
              />
              <FAQItem
                id="6h-exclusions"
                question="Why are some items excluded from 6h rewards?"
                answer={
                  <div className="space-y-2">
                    <p>
                      Certain high-value items can be sacrificed but will{" "}
                      <span className="text-blue-400 font-bold">
                        never be returned
                      </span>{" "}
                      as a reward from a 6h ritual. This prevents "infinite
                      loops" of extremely rare items.
                    </p>
                    <p className="bg-white/5 p-3 rounded-lg italic text-xs">
                      Note: "High Value" in Tarkov is a broad term. It can refer
                      to rare items like a{" "}
                      <span className="text-yellow-400">LedX</span>.
                    </p>
                  </div>
                }
              />
              <FAQItem
                id="hot-sacrifices"
                question="What are 'Hot Sacrifices'?"
                answer={
                  <div className="space-y-2">
                    <p>
                      <span className="text-indigo-400 font-semibold">
                        Hot Sacrifices
                      </span>{" "}
                      are community-tested weapon combos that use special
                      internal base values to hit the 400k threshold cheaply.
                    </p>
                    <p>
                      You'll find them in the{" "}
                      <span className="font-semibold">Hot Sacrifices</span>{" "}
                      panel on the main calculator page. Click{" "}
                      <span className="text-slate-200">Use</span> to auto-fill
                      the slots.
                    </p>
                  </div>
                }
              />
              <FAQItem
                id="recipes"
                question="What is the Recipes page?"
                answer={
                  <div className="space-y-2">
                    <p>
                      The{" "}
                      <Link
                        href="/recipes"
                        className="text-yellow-500 hover:underline"
                      >
                        Recipes
                      </Link>{" "}
                      page is a dedicated view showing all known weapon combos
                      and their expected ritual outcomes.
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      Note: Some recipes may only work once per profile or have
                      specific conditions.
                    </p>
                  </div>
                }
              />
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 mt-4 flex items-center gap-2 text-purple-500">
                <Clock className="h-5 w-5" />
                Tips & Tricks
              </h2>
              <FAQItem
                id="optimization"
                question="How can I optimize my sacrifices?"
                answer={
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>
                      <span className="font-semibold text-gray-200">
                        Exact Thresholds:
                      </span>{" "}
                      Aim for just over 400,001₽. Adding more value does NOT
                      increase your 6h ritual chance.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-200">
                        Check Your Quests:
                      </span>{" "}
                      For best results with the 6h ritual, ensure you have
                      active quests on your character.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-200">
                        Stable Prices:
                      </span>{" "}
                      <span className="text-red-400">Red pricing</span>{" "}
                      indicates unstable market data. Always verify these items
                      in-game.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-200">
                        Best Value vs Low Price:
                      </span>{" "}
                      In settings, you can toggle between using the last low
                      price or a weighted 24h average.
                    </li>
                  </ul>
                }
              />
            </section>
          </div>
        </TabsContent>

        <TabsContent value="incompatible" className="space-y-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incompatible items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-white/5 border-white/10"
            />
          </div>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-red-400">
                Total Restricted Items: {incompatibleItems.length}
              </CardTitle>
              <p className="text-sm text-gray-400">
                These items are completely incompatible with ritual mechanics.
              </p>
            </CardHeader>
            <CardContent>
              {searchTerm.trim() ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredIncompatibleItems.map((item) => (
                    <div
                      key={item}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(incompatibleItemGroups).map(
                    ([groupName, groupItems]) => (
                      <div key={groupName}>
                        <h4 className="text-sm font-bold text-red-300 mb-3 px-1 uppercase tracking-wider">
                          {groupName}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupItems.map((item) => (
                            <div
                              key={item}
                              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ritual6h" className="space-y-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search 6h exclusions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-white/5 border-white/10"
            />
          </div>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-blue-400">
                Total Excluded from 6h: {ritual6hExclusions.length}
              </CardTitle>
              <p className="text-sm text-gray-400">
                Items that can be sacrificed but never returned as 6h rewards.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredRitual6hItems.map((item) => (
                  <div
                    key={item}
                    className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-xs text-yellow-300/80">
                <span className="font-bold text-yellow-500 uppercase mr-2">
                  Note:
                </span>
                These items can still be received as rewards from 14h rituals,
                but never from the 6h "Quest/Hideout" ritual.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
