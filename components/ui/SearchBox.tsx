// FILE: SearchBox.tsx
"use client"

import React, { useState } from "react"

interface Item {
  id: string
  name: string
  value: number
}

interface SearchBoxProps {
  items: Item[]
  onSelect: (itemId: string) => void
  placeholder?: string
}

export const SearchBox: React.FC<SearchBoxProps> = ({ items, onSelect, placeholder = "Search items..." }) => {
  const [query, setQuery] = useState("")

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-700 border-gray-600 text-gray-100 p-2 rounded-md"
      />
      {query && (
        <div className="absolute w-full bg-gray-700 border-gray-600 mt-1 rounded-md shadow-lg z-10">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="text-gray-100 cursor-pointer p-2 hover:bg-gray-600"
              >
                {item.name} (₽{item.value.toLocaleString()})
              </div>
            ))
          ) : (
            <div className="text-gray-100 p-2">No items found</div>
          )}
        </div>
      )}
    </div>
  )
}