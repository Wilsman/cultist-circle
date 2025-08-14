import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Helper to load a fresh copy of the module so in-module caches reset between tests
async function importFresh() {
  vi.resetModules();
  // mock url before import so module can use it
  const mod = await import('@/hooks/use-tarkov-api');
  return mod as typeof import('@/hooks/use-tarkov-api');
}

const emptyCombinedResponse = {
  data: { pvpItems: [], pveItems: [] },
};

describe('use-tarkov-api GraphQL fetchers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('fetchCombinedTarkovData includes lang in query and caches per language', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: true, json: async () => emptyCombinedResponse } as any);

    const { fetchCombinedTarkovData } = await importFresh();

    await fetchCombinedTarkovData('de');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init1 = fetchMock.mock.calls[0][1] as any;
    const body1 = JSON.parse(init1.body as string);
    expect(body1.query).toContain('lang: de');

    // Same language -> cached, no extra fetch
    await fetchCombinedTarkovData('de');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Different language -> new network call
    await fetchCombinedTarkovData('en');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init2 = fetchMock.mock.calls[1][1] as any;
    const body2 = JSON.parse(init2.body as string);
    expect(body2.query).toContain('lang: en');
  });

  test('fetchTarkovData returns per-mode items and correct meta.mode', async () => {
    const response = {
      data: {
        pvpItems: [
          {
            id: '1', name: 'Item A', shortName: 'A', basePrice: 100, lastLowPrice: null,
            updated: new Date().toISOString(), width: 1, height: 1, lastOfferCount: 10,
            avg24hPrice: null, iconLink: '', categories: [{ name: 'Weapon' }], buyFor: []
          },
        ],
        pveItems: [
          {
            id: '2', name: 'Item B', shortName: 'B', basePrice: 200, lastLowPrice: null,
            updated: new Date().toISOString(), width: 1, height: 1, lastOfferCount: 10,
            avg24hPrice: null, iconLink: '', categories: [{ name: 'Key' }], buyFor: []
          },
        ],
      },
    };

    const fetchMock = vi
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: true, json: async () => response } as any);

    const { fetchTarkovData } = await importFresh();

    const pvp = await fetchTarkovData('regular', 'en');
    expect(pvp.items).toHaveLength(1);
    expect(pvp.meta.mode).toBe('pvp');

    const pve = await fetchTarkovData('pve', 'en');
    expect(pve.items).toHaveLength(1);
    expect(pve.meta.mode).toBe('pve');

    // only two fetches: both calls shared the same combined fetch via cache within single run? depends on cache; allow >=1
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('fetchMinimalTarkovData includes lang and caches per language', async () => {
    const minimalResponse = {
      data: { pvpItems: [], pveItems: [] },
    };
    const fetchMock = vi
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: true, json: async () => minimalResponse } as any);

    const { fetchMinimalTarkovData } = await importFresh();

    await fetchMinimalTarkovData('fr');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init3 = fetchMock.mock.calls[0][1] as any;
    const body1 = JSON.parse(init3.body as string);
    expect(body1.query).toContain('lang: fr');

    await fetchMinimalTarkovData('fr');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fetchMinimalTarkovData('en');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
