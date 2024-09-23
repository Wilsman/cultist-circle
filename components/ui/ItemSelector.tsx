import React, { useState, useMemo } from 'react';
import { Copy, X, Pin } from 'lucide-react';
import Fuse from 'fuse.js';
import { SimplifiedItem } from '@/types/SimplifiedItem';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface ItemSelectorProps {
  items: SimplifiedItem[];
  selectedItem: SimplifiedItem | null;
  onSelect: (item: SimplifiedItem | null) => void;
  onCopy: () => void;
  onPin: () => void;
  isPinned: boolean;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  items,
  selectedItem,
  onSelect,
  onCopy,
  onPin,
  isPinned,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ['name'],
      threshold: 0.3,
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (isFocused && !searchTerm) {
      return items; // Show all items when focused and no search term
    }
    if (!searchTerm) return [];
    return fuse.search(searchTerm).map(result => result.item).filter(item => item.price > 0);
  }, [searchTerm, fuse, isFocused, items]);

  const handleSelect = (item: SimplifiedItem | null) => {
    onSelect(item);
    setSearchTerm('');
    setIsFocused(false);
  };

  const handleRemove = () => {
    if (isPinned) {
      onPin(); // Unpin the item
    }
    handleSelect(null); // Remove the item
  };

  return (
    <TooltipProvider>
      <div className="relative w-full mb-2">
        <input
          onClick={() => setIsFocused(true)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
          type="text"
          value={selectedItem ? selectedItem.name : searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (selectedItem) onSelect(null);
          }}
          placeholder="Search items..."
          className={`w-full p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPinned ? 'border-2 border-yellow-500' : ''}`}
        />
        {selectedItem && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
            <button
              onClick={onPin}
              className={`p-1 ${isPinned ? 'bg-yellow-500' : 'bg-gray-500'} text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500`}
              title={isPinned ? "Unpin Item" : "Pin Item"}
            >
              <Pin size={16} />
            </button>
            <button
              onClick={onCopy}
              className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Copy Item Name"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={handleRemove}
              className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Remove Item"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {!selectedItem && isFocused && (
          <ul className="absolute z-10 w-full mt-1 bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredItems.map(item => (
              <Tooltip key={item.uid}>
                <TooltipTrigger asChild>
                  <li
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseUp={() => handleSelect(item)}
                    className="p-2 hover:bg-gray-600 cursor-pointer text-white flex justify-between"
                  >
                    <span>{item.name} (₱{item.price.toLocaleString()})</span>
                    <span>Base: ₱{item.basePrice.toLocaleString()}</span>
                  </li>
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    <p>Base Value: ₱{item.basePrice.toLocaleString()}</p>
                    <p>Estimated Flea Price: ₱{item.price.toLocaleString()}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            {filteredItems.length === 0 && (
              <li className="p-2 text-gray-400">No items found.</li>
            )}
          </ul>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ItemSelector;