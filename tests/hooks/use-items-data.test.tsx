import { describe, expect, test, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

// Mock the API module before importing the hook
vi.mock('@/hooks/use-tarkov-api', async () => {
  return {
    fetchTarkovData: vi.fn(),
    CACHE_TTL: 900000,
  };
});

import { fetchTarkovData } from '@/hooks/use-tarkov-api';
import { LanguageProvider } from '@/contexts/language-context';
import { useItemsData } from '@/hooks/use-items-data';
import type { SimplifiedItem } from '@/types/SimplifiedItem';

function Harness({ isPVE = false }: { isPVE?: boolean }) {
  const { data } = useItemsData(isPVE);
  return <pre data-testid="out">{JSON.stringify(data)}</pre>;
}

describe('useItemsData dual-fetch + merge', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('fetches en + localized and merges correctly (name/shortName localized, englishName retained)', async () => {
    // Arrange english and german fixtures
    const enItems: SimplifiedItem[] = [
      {
        id: 'itm1',
        name: 'Antique Vase',
        shortName: 'Vase',
        basePrice: 67800,
        categories: ['Barter item'],
        categories_display: [{ name: 'Barter item' }],
      },
    ];

    const deItems: SimplifiedItem[] = [
      {
        id: 'itm1',
        name: 'Antike Vase',
        shortName: 'Vase',
        basePrice: 67800,
        categories: ['Barter item (de)'],
        categories_display: [{ name: 'Tauschgegenstand' }],
        iconLink: 'de-icon.png',
      },
    ];

    (fetchTarkovData as unknown as any).mockImplementation((mode: 'pve' | 'regular', lang: string) => {
      const items = lang === 'en' ? enItems : deItems;
      return Promise.resolve({ items, meta: { totalItems: items.length, validItems: items.length, processTime: 1, categories: 1, mode: mode === 'pve' ? 'pve' : 'pvp' } });
    });

    // Force language to de via localStorage so LanguageProvider initializes with it
    localStorage.setItem('language', 'de');

    render(
      <LanguageProvider>
        <Harness isPVE={false} />
      </LanguageProvider>
    );

    await waitFor(() => {
      const out = screen.getByTestId('out').textContent || '[]';
      const parsed = JSON.parse(out) as SimplifiedItem[];
      expect(parsed.length).toBe(1);
      const item = parsed[0];
      // Display fields from localized where available
      expect(item.name).toBe('Antike Vase');
      expect(item.shortName).toBe('Vase');
      expect(item.iconLink).toBe('de-icon.png');
      // English fields retained for filtering
      expect(item.englishName).toBe('Antique Vase');
      expect(item.englishShortName).toBe('Vase');
      // Categories used for filtering are from English
      expect(item.categories).toEqual(['Barter item']);
      // Display categories may be localized
      expect(item.categories_display?.[0].name).toBe('Tauschgegenstand');
    });

    // Called twice: en + de
    expect(fetchTarkovData).toHaveBeenCalledTimes(2);
    expect(fetchTarkovData).toHaveBeenNthCalledWith(1, 'regular', 'en');
    expect(fetchTarkovData).toHaveBeenNthCalledWith(2, 'regular', 'de');
  });

  test('when language is en, only one fetch occurs and english is used for display', async () => {
    const enItems: SimplifiedItem[] = [
      {
        id: 'itm1',
        name: 'Antique Vase',
        shortName: 'Vase',
        basePrice: 67800,
        categories: ['Barter item'],
        categories_display: [{ name: 'Barter item' }],
        iconLink: 'en-icon.png',
      },
    ];

    ;(fetchTarkovData as unknown as any).mockResolvedValue({
      items: enItems,
      meta: { totalItems: 1, validItems: 1, processTime: 1, categories: 1, mode: 'pvp' },
    });

    localStorage.setItem('language', 'en');

    render(
      <LanguageProvider>
        <Harness isPVE={false} />
      </LanguageProvider>
    );

    await waitFor(() => {
      const out = screen.getByTestId('out').textContent || '[]';
      const parsed = JSON.parse(out) as SimplifiedItem[];
      expect(parsed.length).toBe(1);
      const item = parsed[0];
      expect(item.name).toBe('Antique Vase');
      expect(item.englishName).toBe('Antique Vase');
      expect(item.iconLink).toBe('en-icon.png');
    });

    // Only one call when language is en
    expect(fetchTarkovData).toHaveBeenCalledTimes(1);
    expect(fetchTarkovData).toHaveBeenCalledWith('regular', 'en');
  });
});
