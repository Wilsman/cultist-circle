import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExcludedItemsManagerProps {
  excludedItems: Set<string>;
  onExcludedItemsChange: (items: Set<string>) => void;
}

export function ExcludedItemsManager({
  excludedItems,
  onExcludedItemsChange,
}: ExcludedItemsManagerProps) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      const updatedItems = new Set(excludedItems);
      updatedItems.add(newItem.trim());
      onExcludedItemsChange(updatedItems);
      setNewItem('');
    }
  };

  const handleRemoveItem = (item: string) => {
    const updatedItems = new Set(excludedItems);
    updatedItems.delete(item);
    onExcludedItemsChange(updatedItems);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter item name"
          className="flex-1"
        />
        <Button onClick={handleAddItem} variant="secondary">
          Add
        </Button>
      </div>
      
      <ScrollArea className="h-[200px] rounded-md border p-2">
        <div className="space-y-2">
          {Array.from(excludedItems).map((item) => (
            <div
              key={item}
              className="flex items-center justify-between bg-secondary/50 rounded-md p-2"
            >
              <span className="text-sm">{item}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(item)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {excludedItems.size === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No items in the list
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
