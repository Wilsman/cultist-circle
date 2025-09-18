"use client";

import { useState, useMemo } from "react";
import { Search, AlertTriangle, Package, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";

export default function IncompatibleItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const itemsArray = Array.from(DEFAULT_EXCLUDED_ITEMS).sort();
  const totalItems = itemsArray.length;
  
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return itemsArray;
    
    const term = searchTerm.toLowerCase();
    return itemsArray.filter(item => 
      item.toLowerCase().includes(term)
    );
  }, [searchTerm, itemsArray]);


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Incompatible Items</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Items that cannot be used in the Cultist Circle ritual. These items are automatically excluded from calculations.
        </p>
      </div>

      {/* Stats Card */}
      <Card className="mb-6 bg-gradient-to-r from-yellow-500/10 to-red-500/10 border-yellow-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-500">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-green-500">{filteredItems.length}</div>
              <div className="text-sm text-muted-foreground">Matching Items</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search incompatible items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-500 mb-1">Why are these items excluded?</p>
              <p className="text-muted-foreground">
                These items are either too valuable, quest-specific, or have special properties that make them 
                incompatible with the Cultist Circle ritual mechanics. Using compatible items ensures better 
                ritual outcomes and prevents wasting rare resources.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No items found</p>
            <p className="text-muted-foreground">
              Try adjusting your search term to find incompatible items.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item}
                  className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-muted"
                >
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
