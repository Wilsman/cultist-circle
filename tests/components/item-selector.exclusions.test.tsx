import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemSelector from '@/components/ItemSelector';
import { DEFAULT_EXCLUDED_ITEMS } from '@/config/excluded-items';
import type { SimplifiedItem } from '@/types/SimplifiedItem';
import type { TraderLevels } from '@/components/ui/trader-level-selector';

function makeItem(partial: Partial<SimplifiedItem>): SimplifiedItem {
  // minimal viable item for ItemSelector rows
  return {
    id: partial.id ?? 'id-1',
    name: partial.name ?? 'Roubles',
    shortName: partial.shortName ?? 'Rub',
    englishName: partial.englishName ?? 'Roubles',
    englishShortName: partial.englishShortName ?? 'Rub',
    basePrice: partial.basePrice ?? 1000,
    iconLink: partial.iconLink ?? '',
    link: partial.link ?? '',
    updated: partial.updated ?? new Date().toISOString(),
    lastLowPrice: partial.lastLowPrice ?? 1200,
    avg24hPrice: partial.avg24hPrice ?? 1100,
    lastOfferCount: partial.lastOfferCount ?? 10,
    buyFor: partial.buyFor ?? [],
    categories: partial.categories ?? [],
    categories_display: partial.categories_display ?? [],
    categories_display_en: partial.categories_display_en ?? [],
  } as SimplifiedItem;
}

const defaultTraderLevels: TraderLevels = {
  prapor: 4,
  therapist: 4,
  skier: 4,
  peacekeeper: 4,
  mechanic: 4,
  ragman: 4,
  jaeger: 4,
};

describe('ItemSelector exclusions are language-agnostic', () => {
  const excludedItems = new Set(DEFAULT_EXCLUDED_ITEMS);

  const baseProps = {
    selectedItem: null,
    onSelect: () => {},
    onCopy: () => {},
    onPin: () => {},
    isPinned: false,
    overriddenPrices: {},
    isExcluded: false,
    onToggleExclude: () => {},
    excludedItems,
    fleaPriceType: 'lastLowPrice' as const,
    priceMode: 'flea' as const,
    traderLevels: defaultTraderLevels,
  };

  it('excludes a default English-named item when UI language is English (name === englishName)', () => {
    const items = [makeItem({ id: 'roubles', name: 'Roubles', englishName: 'Roubles' })];

    render(<ItemSelector items={items} {...baseProps} />);

    // Focus search to show list with empty query
    const input = screen.getByPlaceholderText('Search items...');
    fireEvent.mouseUp(input);

    // The item should NOT appear because it's in DEFAULT_EXCLUDED_ITEMS
    expect(screen.queryByText(/Roubles/i)).toBeNull();
  });

  it('excludes a default item when UI language is non-English (name !== englishName)', () => {
    const items = [
      makeItem({ id: 'roubles', name: 'Rubel', englishName: 'Roubles' }), // de localized label
    ];

    render(<ItemSelector items={items} {...baseProps} />);

    // Focus search to show list with empty query
    const input = screen.getByPlaceholderText('Search items...');
    fireEvent.mouseUp(input);

    // Should not show localized nor English name
    expect(screen.queryByText(/Rubel/i)).toBeNull();
    expect(screen.queryByText(/Roubles/i)).toBeNull();
  });
});
