import { describe, expect, test, vi, beforeEach } from "vitest";
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";

// Mock the API module before importing the hook
vi.mock("@/hooks/use-tarkov-api", async () => {
  class MockTarkovApiError extends Error {
    status?: number;
    transient: boolean;
    cooldownUntil?: number;

    constructor(
      message: string,
      options: {
        status?: number;
        transient?: boolean;
        cooldownUntil?: number;
      } = {},
    ) {
      super(message);
      this.name = "TarkovApiError";
      this.status = options.status;
      this.transient = options.transient ?? false;
      this.cooldownUntil = options.cooldownUntil;
    }
  }

  return {
    fetchTarkovData: vi.fn(),
    CACHE_TTL: 900000,
    clearTarkovApiCooldown: vi.fn(),
    DEFAULT_TARKOV_REQUEST_STATUS: {
      phase: "idle",
      attempt: 0,
      maxAttempts: 3,
      usingStaleData: false,
    },
    TarkovApiError: MockTarkovApiError,
  };
});

import { fetchTarkovData } from "@/hooks/use-tarkov-api";
import { LanguageProvider } from "@/contexts/language-context";
import { useItemsData } from "@/hooks/use-items-data";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function Harness({ isPVE = false }: { isPVE?: boolean }) {
  const { data, requestStatus, resetRetryCount, mutate } = useItemsData(isPVE);
  return (
    <>
      <pre data-testid="out">{JSON.stringify(data)}</pre>
      <pre data-testid="status">{JSON.stringify(requestStatus)}</pre>
      <button onClick={resetRetryCount}>reset</button>
      <button onClick={() => mutate()}>refresh</button>
    </>
  );
}

describe("useItemsData dual-fetch + merge", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("fetches en + localized and merges correctly (name/shortName localized, englishName retained)", async () => {
    // Arrange english and german fixtures
    const enItems: SimplifiedItem[] = [
      {
        id: "itm1",
        name: "Antique Vase",
        shortName: "Vase",
        basePrice: 67800,
        categories: ["Barter item"],
        categories_display: [{ name: "Barter item" }],
      },
    ];

    const deItems: SimplifiedItem[] = [
      {
        id: "itm1",
        name: "Antike Vase",
        shortName: "Vase",
        basePrice: 67800,
        categories: ["Barter item (de)"],
        categories_display: [{ name: "Tauschgegenstand" }],
        iconLink: "de-icon.png",
      },
    ];

    (fetchTarkovData as unknown as any).mockImplementation(
      (mode: "pve" | "regular", lang: string) => {
        const items = lang === "en" ? enItems : deItems;
        return Promise.resolve({
          items,
          meta: {
            totalItems: items.length,
            validItems: items.length,
            processTime: 1,
            categories: 1,
            mode: mode === "pve" ? "pve" : "pvp",
          },
        });
      },
    );

    // Force language to de via localStorage so LanguageProvider initializes with it
    localStorage.setItem("language", "de");

    render(
      <LanguageProvider>
        <Harness isPVE={false} />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const out = screen.getByTestId("out").textContent || "[]";
      const parsed = JSON.parse(out) as SimplifiedItem[];
      expect(parsed.length).toBe(1);
      const item = parsed[0];
      // Display fields from localized where available
      expect(item.name).toBe("Antike Vase");
      expect(item.shortName).toBe("Vase");
      expect(item.iconLink).toBe("de-icon.png");
      // English fields retained for filtering
      expect(item.englishName).toBe("Antique Vase");
      expect(item.englishShortName).toBe("Vase");
      // Categories used for filtering are from English
      expect(item.categories).toEqual(["Barter item"]);
      // Display categories may be localized
      expect(item.categories_display?.[0].name).toBe("Tauschgegenstand");
    });

    // Called twice: en + de
    expect(fetchTarkovData).toHaveBeenCalledTimes(2);
    expect(fetchTarkovData).toHaveBeenNthCalledWith(
      1,
      "regular",
      "en",
      expect.any(Object),
    );
    expect(fetchTarkovData).toHaveBeenNthCalledWith(
      2,
      "regular",
      "de",
      expect.any(Object),
    );
  });

  test("when language is en, only one fetch occurs and english is used for display", async () => {
    const enItems: SimplifiedItem[] = [
      {
        id: "itm1",
        name: "Antique Vase",
        shortName: "Vase",
        basePrice: 67800,
        categories: ["Barter item"],
        categories_display: [{ name: "Barter item" }],
        iconLink: "en-icon.png",
      },
    ];

    (fetchTarkovData as unknown as any).mockResolvedValue({
      items: enItems,
      meta: {
        totalItems: 1,
        validItems: 1,
        processTime: 1,
        categories: 1,
        mode: "pvp",
      },
    });

    localStorage.setItem("language", "en");

    render(
      <LanguageProvider>
        <Harness isPVE={false} />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const out = screen.getByTestId("out").textContent || "[]";
      const parsed = JSON.parse(out) as SimplifiedItem[];
      expect(parsed.length).toBe(1);
      const item = parsed[0];
      expect(item.name).toBe("Antique Vase");
      expect(item.englishName).toBe("Antique Vase");
      expect(item.iconLink).toBe("en-icon.png");
    });

    // Only one call when language is en
    expect(fetchTarkovData).toHaveBeenCalledTimes(1);
    expect(fetchTarkovData).toHaveBeenCalledWith(
      "regular",
      "en",
      expect.any(Object),
    );
  });

  test("exposes retry status from the Tarkov fetcher", async () => {
    const enItems: SimplifiedItem[] = [
      {
        id: "itm1",
        name: "Antique Vase",
        shortName: "Vase",
        basePrice: 67800,
        categories: ["Barter item"],
        categories_display: [{ name: "Barter item" }],
        iconLink: "en-icon.png",
      },
    ];
    let resolveFetch: ((value: unknown) => void) | undefined;
    (fetchTarkovData as unknown as any).mockImplementation(
      (_mode: "pve" | "regular", _lang: string, options?: any) => {
        options?.onStatus?.({
          phase: "retrying",
          attempt: 2,
          maxAttempts: 3,
          nextRetryAt: Date.now() + 4000,
          lastError: "Tarkov.dev API request failed with status 503",
          usingStaleData: false,
        });
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      },
    );

    localStorage.setItem("language", "en");

    render(
      <LanguageProvider>
        <Harness isPVE={false} />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const status = JSON.parse(
        screen.getByTestId("status").textContent || "{}",
      );
      expect(status.phase).toBe("retrying");
      expect(status.attempt).toBe(2);
      expect(status.nextRetryAt).toBeGreaterThan(Date.now());
    });

    resolveFetch?.({
      items: enItems,
      meta: {
        totalItems: 1,
        validItems: 1,
        processTime: 1,
        categories: 1,
        mode: "pvp",
      },
    });

    await waitFor(() => {
      const parsed = JSON.parse(
        screen.getByTestId("out").textContent || "[]",
      ) as SimplifiedItem[];
      expect(parsed).toHaveLength(1);
    });
  });

  test("keeps stale data visible when a revalidation fails", async () => {
    const enItems: SimplifiedItem[] = [
      {
        id: "itm1",
        name: "Antique Vase",
        shortName: "Vase",
        basePrice: 67800,
        categories: ["Barter item"],
        categories_display: [{ name: "Barter item" }],
        iconLink: "en-icon.png",
      },
    ];

    let failNow = false;
    (fetchTarkovData as unknown as any).mockImplementation(
      (_mode: "pve" | "regular", _lang: string, options?: any) => {
        if (failNow) {
          options?.onStatus?.({
            phase: "cooldown",
            attempt: 3,
            maxAttempts: 3,
            cooldownUntil: Date.now() + 60000,
            lastError: "Tarkov.dev API request failed with status 503",
            usingStaleData: true,
          });
          return Promise.reject(
            new Error("Tarkov.dev API request failed with status 503"),
          );
        }

        return Promise.resolve({
          items: enItems,
          meta: {
            totalItems: 1,
            validItems: 1,
            processTime: 1,
            categories: 1,
            mode: "pvp",
          },
        });
      },
    );

    localStorage.setItem("language", "en");

    render(
      <LanguageProvider>
        <Harness isPVE={false} />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const parsed = JSON.parse(
        screen.getByTestId("out").textContent || "[]",
      ) as SimplifiedItem[];
      expect(parsed[0]?.name).toBe("Antique Vase");
    });

    failNow = true;
    fireEvent.click(screen.getByText("reset"));
    fireEvent.click(screen.getByText("refresh"));

    await waitFor(() => {
      const status = JSON.parse(
        screen.getByTestId("status").textContent || "{}",
      );
      expect(status.usingStaleData).toBe(true);
    });

    const parsed = JSON.parse(
      screen.getByTestId("out").textContent || "[]",
    ) as SimplifiedItem[];
    expect(parsed[0]?.name).toBe("Antique Vase");
  });
});
