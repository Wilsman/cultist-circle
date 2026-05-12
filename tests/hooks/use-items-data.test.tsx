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

describe('useItemsData single-fetch localized mapping', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('fetches localized items once and uses english fallback fields from the payload', async () => {
    const deItems: SimplifiedItem[] = [
      {
        id: 'itm1',
        name: 'Antike Vase',
        shortName: 'Vase',
        englishName: 'Antique Vase',
        englishShortName: 'Vase',
        basePrice: 67800,
        categories: ['barter-item'],
        categories_display: [{ name: 'Tauschgegenstand' }],
        categories_display_en: [{ name: 'Barter item' }],
        iconLink: 'de-icon.png',
      },
    ];

    (fetchTarkovData as unknown as any).mockImplementation((mode: 'pve' | 'regular', lang: string) => {
      return Promise.resolve({ items: deItems, meta: { totalItems: deItems.length, validItems: deItems.length, processTime: 1, categories: 1, mode: mode === 'pve' ? 'pve' : 'pvp' } });
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
      // Stable category ids stay intact
      expect(item.categories).toEqual(['barter-item']);
      // Display categories may be localized
      expect(item.categories_display?.[0].name).toBe('Tauschgegenstand');
      expect(item.categories_display_en?.[0].name).toBe('Barter item');
    });

    expect(fetchTarkovData).toHaveBeenCalledTimes(1);
    expect(fetchTarkovData).toHaveBeenCalledWith('regular', 'de');
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

    ; (fetchTarkovData as unknown as any).mockResolvedValue({
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
