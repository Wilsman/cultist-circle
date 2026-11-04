import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("react-virtualized-auto-sizer", () => ({
  default: ({
    children,
  }: {
    children: (size: { width: number }) => React.ReactNode;
  }) => children({ width: 320 }),
}));

vi.mock("react-window", async () => {
  const React = await import("react");

  const FixedSizeList = React.forwardRef(
    (
      {
        itemCount,
        children,
      }: {
        itemCount: number;
        children: (props: {
          index: number;
          style: React.CSSProperties;
        }) => React.ReactNode;
      },
      ref: React.ForwardedRef<{ scrollToItem: (index: number) => void }>
    ) => {
      React.useImperativeHandle(ref, () => ({
        scrollToItem: () => undefined,
      }));

      return (
        <div>
          {Array.from({ length: itemCount }, (_, index) => (
            <div key={index}>{children({ index, style: {} })}</div>
          ))}
        </div>
      );
    }
  );

  FixedSizeList.displayName = "FixedSizeList";

  return { FixedSizeList };
});

import ItemSelector from "@/components/item-selector";
import { LanguageProvider } from "@/contexts/language-context";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { TraderLevels } from "@/components/ui/trader-level-selector";

function makeItem(partial: Partial<SimplifiedItem>): SimplifiedItem {
  return {
    id: partial.id ?? "id-1",
    name: partial.name ?? "Roubles",
    shortName: partial.shortName ?? partial.name ?? "Rub",
    englishName: partial.englishName ?? partial.name ?? "Roubles",
    englishShortName:
      partial.englishShortName ?? partial.shortName ?? partial.name ?? "Rub",
    basePrice: partial.basePrice ?? 1000,
    iconLink: partial.iconLink ?? "",
    link: partial.link ?? "",
    updated: partial.updated ?? new Date().toISOString(),
    lastLowPrice: partial.lastLowPrice ?? 1200,
    avg24hPrice: partial.avg24hPrice ?? 1100,
    lastOfferCount: partial.lastOfferCount ?? 10,
    buyFor: partial.buyFor ?? [],
    categories: partial.categories ?? [],
    categories_display: partial.categories_display ?? [],
    categories_display_en: partial.categories_display_en ?? [],
    maxUses: partial.maxUses,
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

describe("ItemSelector dropdown behavior", () => {
  const excludedItems = new Set(DEFAULT_EXCLUDED_ITEMS);

  const renderWithLanguage = (ui: React.ReactElement, language?: string) => {
    if (language) {
      window.localStorage.setItem("language", language);
    } else {
      window.localStorage.removeItem("language");
    }
    return render(<LanguageProvider>{ui}</LanguageProvider>);
  };

  const baseProps = {
    selectedItem: null,
    onSelect: () => {},
    onCopy: () => {},
    onPin: () => {},
    isPinned: false,
    isAutoPickActive: false,
    overriddenPrices: {},
    manualDiscoveryItems: [],
    isExcluded: false,
    onToggleExclude: () => {},
    excludedItems,
    fleaPriceType: "lastLowPrice" as const,
    priceMode: "flea" as const,
    traderLevels: defaultTraderLevels,
    remainingThreshold: 200_000,
    itemBonusPercent: 0,
    categoryFilter: "all",
    categoryFilterLabel: "All categories",
    traderFilter: "any" as const,
  };

  const focusSelector = () => {
    const input = screen.getByPlaceholderText(
      /search items|gegenstände suchen/i
    );
    act(() => {
      fireEvent.focus(input);
    });
    return input;
  };

  const toggleThresholdFilter = () => {
    act(() => {
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: /Show items that hit threshold first/i,
        })
      );
    });
  };

  const expectBefore = (firstText: string, secondText: string) => {
    const first = screen.getByText(firstText);
    const second = screen.getByText(secondText);
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  };

  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("preserves incoming list order when the threshold override is off", () => {
    const items = [
      makeItem({ id: "zulu", name: "Zulu cache", basePrice: 300_000 }),
      makeItem({ id: "alpha", name: "Alpha badge", basePrice: 100_000 }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />);
    focusSelector();

    expect(screen.getByText("Zulu cache")).toBeInTheDocument();
    expect(screen.getByText("Alpha badge")).toBeInTheDocument();
    expectBefore("Zulu cache", "Alpha badge");
  });

  it("filters to qualifying items and sorts them by best value, then lower base value", () => {
    const items = [
      makeItem({
        id: "huge",
        name: "Huge case",
        basePrice: 400_000,
        lastLowPrice: 340_000,
      }),
      makeItem({ id: "low", name: "Low cable", basePrice: 90_000 }),
      makeItem({
        id: "high",
        name: "High lens",
        basePrice: 300_000,
        lastLowPrice: 100_000,
      }),
      makeItem({
        id: "mid",
        name: "Mid battery",
        basePrice: 210_000,
        lastLowPrice: 140_000,
      }),
      makeItem({
        id: "tie",
        name: "Tie battery",
        basePrice: 240_000,
        lastLowPrice: 160_000,
      }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />);
    focusSelector();
    toggleThresholdFilter();

    expect(screen.queryByText("Low cable")).not.toBeInTheDocument();
    expectBefore("High lens", "Mid battery");
    expectBefore("Mid battery", "Tie battery");
    expectBefore("Tie battery", "Huge case");
  });

  it("keeps the threshold list open when toggled via the header text button", () => {
    const items = [
      makeItem({ id: "low", name: "Low cable", basePrice: 90_000 }),
      makeItem({
        id: "qualified",
        name: "Qualified case",
        basePrice: 300_000,
        lastLowPrice: 180_000,
      }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />);
    focusSelector();

    act(() => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /Show items that hit threshold first/i,
        })
      );
    });

    expect(
      screen.getByRole("checkbox", {
        name: /Show items that hit threshold first/i,
      })
    ).toHaveAttribute("data-state", "checked");
    expect(screen.getByText("Qualified case")).toBeInTheDocument();
  });

  it("scopes search and autocomplete to the threshold-qualified pool", async () => {
    const items = [
      makeItem({ id: "silk", name: "Silk roll", basePrice: 80_000 }),
      makeItem({ id: "silver", name: "Silver badge", basePrice: 220_000 }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />);
    const input = focusSelector();
    toggleThresholdFilter();

    fireEvent.change(input, { target: { value: "sil" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.queryByText("Silk roll")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "SPAN" && element.textContent === "Silver badge"
      )
    ).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Tab" });
    expect(input).toHaveValue("Silver badge");
  });

  it("shows a threshold-specific empty state when no single item can meet the target", () => {
    const items = [
      makeItem({ id: "one", name: "One coin", basePrice: 100_000 }),
      makeItem({ id: "two", name: "Two coin", basePrice: 120_000 }),
    ];

    renderWithLanguage(
      <ItemSelector {...baseProps} manualDiscoveryItems={items} remainingThreshold={500_000} />
    );
    focusSelector();
    toggleThresholdFilter();

    expect(
      screen.getByText("No single item can hit the remaining ₽500,000")
    ).toBeInTheDocument();
  });

  it("shows all valid items sorted by base value when the target is already met", () => {
    const items = [
      makeItem({
        id: "high",
        name: "High statue",
        basePrice: 320_000,
        lastLowPrice: 160_000,
      }),
      makeItem({
        id: "low",
        name: "Low watch",
        basePrice: 40_000,
        lastLowPrice: 20_000,
      }),
      makeItem({
        id: "mid",
        name: "Mid chain",
        basePrice: 120_000,
        lastLowPrice: 60_000,
      }),
    ];

    renderWithLanguage(
      <ItemSelector {...baseProps} manualDiscoveryItems={items} remainingThreshold={0} />
    );
    focusSelector();
    toggleThresholdFilter();

    expectBefore("Low watch", "Mid chain");
    expectBefore("Mid chain", "High statue");
    expect(screen.getByText("Target met")).toBeInTheDocument();
  });

  it("excludes a default English-named item when UI language is English", () => {
    const items = [
      makeItem({ id: "roubles", name: "Roubles", englishName: "Roubles" }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />);
    focusSelector();

    expect(screen.queryByText(/Roubles/i)).toBeNull();
  });

  it("excludes a default item when UI language is non-English", () => {
    const items = [
      makeItem({ id: "roubles", name: "Rubel", englishName: "Roubles" }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />, "de");
    focusSelector();

    expect(screen.queryByText(/Rubel/i)).toBeNull();
    expect(screen.queryByText(/Roubles/i)).toBeNull();
  });

  it("excludes posters because they are part of the default excluded items set", () => {
    const items = [
      makeItem({
        id: "poster",
        name: "Final Moment poster",
        englishName: "Final Moment poster",
      }),
    ];

    renderWithLanguage(<ItemSelector {...baseProps} manualDiscoveryItems={items} />);
    focusSelector();

    expect(screen.queryByText(/Final Moment poster/i)).toBeNull();
  });

  it("shows posters when the default excluded item filter is removed", () => {
    const items = [
      makeItem({
        id: "poster",
        name: "Final Moment poster",
        englishName: "Final Moment poster",
      }),
    ];

    renderWithLanguage(
      <ItemSelector {...baseProps} manualDiscoveryItems={items} excludedItems={new Set()} />
    );
    focusSelector();

    expect(screen.getByText("Final Moment poster")).toBeInTheDocument();
  });

  it("reveals an excluded category through the shared category filter", () => {
    const regularItem = makeItem({ id: "regular", name: "Golden rooster" });
    const gun = makeItem({
      id: "gun",
      name: "HK MP5 9x19 submachine gun Default",
      categories: ["5422acb9af1c889c16000029"],
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[regularItem, gun]}
        categoryFilter="5422acb9af1c889c16000029"
        categoryFilterLabel="Weapon"
      />
    );
    focusSelector();

    expect(
      screen.getByText("HK MP5 9x19 submachine gun Default")
    ).toBeInTheDocument();
    expect(screen.queryByText("Golden rooster")).not.toBeInTheDocument();
  });

  it("matches a narrow category without including other categories", () => {
    const gun = makeItem({
      id: "gun",
      name: "AK-74N Default",
      categories: ["5422acb9af1c889c16000029"],
    });
    const component = makeItem({
      id: "component",
      name: "AK polymer handguard",
      categories: ["5448fe124bdc2da5018b4567"],
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[gun, component]}
        categoryFilter="5448fe124bdc2da5018b4567"
        categoryFilterLabel="Weapon mod"
      />
    );
    focusSelector();

    expect(screen.getByText("AK polymer handguard")).toBeInTheDocument();
    expect(screen.queryByText("AK-74N Default")).not.toBeInTheDocument();
  });

  it("ranks Default gun presets first without hiding other guns", () => {
    const baseGun = makeItem({
      id: "base",
      name: "HK MP5 base",
      categories: ["5422acb9af1c889c16000029"],
    });
    const defaultGun = makeItem({
      id: "default",
      name: "HK MP5 Navy Default",
      categories: ["5422acb9af1c889c16000029"],
    });
    const exceptionGun = makeItem({
      id: "exception",
      name: "HK MP5 SD",
      categories: ["5422acb9af1c889c16000029"],
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[baseGun, exceptionGun, defaultGun]}
        categoryFilter="5422acb9af1c889c16000029"
        categoryFilterLabel="Weapon"
      />
    );
    focusSelector();

    expectBefore("HK MP5 Navy Default", "HK MP5 base");
    expectBefore("HK MP5 base", "HK MP5 SD");
  });

  it("filters trader offers by configured loyalty level", () => {
    const accessibleGun = makeItem({
      id: "accessible",
      name: "Prapor LL2 gun",
      categories: ["5422acb9af1c889c16000029"],
      buyFor: [
        {
          priceRUB: 20_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 2 },
        },
      ],
    });
    const lockedGun = makeItem({
      id: "locked",
      name: "Prapor LL3 gun",
      categories: ["5422acb9af1c889c16000029"],
      buyFor: [
        {
          priceRUB: 30_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 3 },
        },
      ],
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[accessibleGun, lockedGun]}
        traderLevels={{ ...defaultTraderLevels, prapor: 2 }}
        categoryFilter="5422acb9af1c889c16000029"
        categoryFilterLabel="Weapon"
        traderFilter="prapor"
      />
    );
    focusSelector();

    expect(screen.getByText("Prapor LL2 gun")).toBeInTheDocument();
    expect(screen.queryByText("Prapor LL3 gun")).not.toBeInTheDocument();
    expect(screen.getByText("Prapor LL2")).toBeInTheDocument();
  });

  it("scopes search and autocomplete to the selected category", async () => {
    const gun = makeItem({
      id: "gun",
      name: "HK MP5 Navy Default",
      categories: ["5422acb9af1c889c16000029"],
    });
    const component = makeItem({
      id: "component",
      name: "HK MP5 handguard",
      categories: ["5448fe124bdc2da5018b4567"],
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[component, gun]}
        categoryFilter="5422acb9af1c889c16000029"
        categoryFilterLabel="Weapon"
      />
    );
    const input = focusSelector();
    fireEvent.change(input, { target: { value: "HK" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.queryByText("HK MP5 handguard")).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input).toHaveValue("HK MP5 Navy Default");
  });

  it("keeps shared search filters after selecting an item", () => {
    const regularItem = makeItem({ id: "regular", name: "Golden rooster" });
    const gun = makeItem({
      id: "gun",
      name: "HK MP5 Navy Default",
      categories: ["5422acb9af1c889c16000029"],
    });
    const onSelect = vi.fn();

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[regularItem, gun]}
        onSelect={onSelect}
        categoryFilter="5422acb9af1c889c16000029"
        categoryFilterLabel="Weapon"
      />
    );
    focusSelector();
    fireEvent.click(screen.getByText("HK MP5 Navy Default"));

    expect(onSelect).toHaveBeenCalledWith(gun, undefined);
    expect(
      screen.getByLabelText("Search filters active: Weapon")
    ).toBeInTheDocument();

    focusSelector();
    // Listed once in the results and once as a recent pick
    expect(screen.getAllByText("HK MP5 Navy Default")).toHaveLength(2);
    expect(screen.queryByText("Golden rooster")).not.toBeInTheDocument();
  });

  it("shows a contextual empty state for category and trader filters", () => {
    const gun = makeItem({
      id: "gun",
      name: "Peacekeeper gun",
      categories: ["5422acb9af1c889c16000029"],
      buyFor: [
        {
          priceRUB: 20_000,
          vendor: { normalizedName: "peacekeeper", minTraderLevel: 1 },
        },
      ],
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[gun]}
        categoryFilter="550aa4cd4bdc2dd8348b456c"
        categoryFilterLabel="Silencer"
        traderFilter="prapor"
      />
    );
    focusSelector();

    expect(
      screen.getByText("No Silencer items match this search and Prapor")
    ).toBeInTheDocument();
  });

  it("shows weapons and items with uses in search with warning tags", () => {
    const gun = makeItem({
      id: "gun",
      name: "AK-74N Default",
      categories: ["5422acb9af1c889c16000029"],
    });
    const key = makeItem({ id: "key", name: "Dorm room 314 key", maxUses: 10 });

    renderWithLanguage(
      <ItemSelector {...baseProps} manualDiscoveryItems={[gun, key]} />
    );
    focusSelector();

    expect(screen.getByText("AK-74N Default")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText("Dorm room 314 key")).toBeInTheDocument();
    expect(screen.getByText("Has uses")).toBeInTheDocument();
  });

  it("keeps the user's own exclusions in search", () => {
    const item = makeItem({ id: "rooster", name: "Golden rooster" });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[item]}
        excludedItems={new Set([...DEFAULT_EXCLUDED_ITEMS, "Golden rooster"])}
      />
    );
    focusSelector();

    expect(screen.getByText("Golden rooster")).toBeInTheDocument();
  });

  it("explains when a search matches a hidden built-in item", async () => {
    const roubles = makeItem({ id: "roubles", name: "Roubles" });
    const other = makeItem({ id: "rouble-bag", name: "Rouble bag charm" });

    renderWithLanguage(
      <ItemSelector {...baseProps} manualDiscoveryItems={[roubles, other]} />
    );
    const input = focusSelector();
    fireEvent.change(input, { target: { value: "roub" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const note = screen.getByRole("status");
    expect(note).toHaveTextContent("Can't be sacrificed: Roubles");
    // The note sits above the results so it is seen before scrolling.
    const [firstResult] = screen.getAllByText(
      (_, element) => element?.textContent === "Rouble bag charm"
    );
    expect(
      note.compareDocumentPosition(firstResult) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("tags items above the player's flea level and with few offers", () => {
    const gun = makeItem({
      id: "gun",
      name: "Locked rifle",
      // Assault rifle: flea level 25
      categories: ["5447b5f14bdc2d61278b4567", "5422acb9af1c889c16000029"],
      lastOfferCount: 2,
    });

    renderWithLanguage(
      <ItemSelector
        {...baseProps}
        manualDiscoveryItems={[gun]}
        playerLevel={1}
        flagLowOffers
      />
    );
    focusSelector();

    expect(screen.getByText("Locked rifle")).toBeInTheDocument();
    expect(screen.getByText("Flea Lv 25")).toBeInTheDocument();
    expect(screen.getByText("Few offers")).toBeInTheDocument();
  });

  describe("quick picks", () => {
    const above = makeItem({ id: "above", name: "Graphics card", shortName: "GPU" });
    const other = makeItem({ id: "other", name: "Tetriz", shortName: "Tetriz" });

    it("offers the item from the row above on an empty slot", () => {
      const onSelect = vi.fn();
      renderWithLanguage(
        <ItemSelector
          {...baseProps}
          manualDiscoveryItems={[above, other]}
          itemAbove={above}
          onSelect={onSelect}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Same as above/ })
      );

      expect(onSelect).toHaveBeenCalledWith(above, undefined);
    });

    it("repeats the item above on Enter with an empty search", () => {
      const onSelect = vi.fn();
      renderWithLanguage(
        <ItemSelector
          {...baseProps}
          manualDiscoveryItems={[other, above]}
          itemAbove={above}
          onSelect={onSelect}
        />
      );
      const input = focusSelector();

      expect(screen.getByTestId("selector-quick-picks")).toHaveTextContent(
        "Same as above"
      );
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onSelect).toHaveBeenCalledWith(above, undefined);
    });

    it("lists recently picked items when the search is empty", () => {
      renderWithLanguage(
        <ItemSelector {...baseProps} manualDiscoveryItems={[above, other]} />
      );
      focusSelector();
      fireEvent.click(screen.getByText("Tetriz", { selector: "span *, span" }));
      expect(screen.queryByText("Recent")).not.toBeInTheDocument();

      focusSelector();

      const strip = screen.getByTestId("selector-quick-picks");
      expect(strip).toHaveTextContent("Recent");
      expect(strip).toHaveTextContent("Tetriz");
    });

    it("hides quick picks once the user types", async () => {
      renderWithLanguage(
        <ItemSelector
          {...baseProps}
          manualDiscoveryItems={[above, other]}
          itemAbove={above}
        />
      );
      const input = focusSelector();
      fireEvent.change(input, { target: { value: "tet" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.queryByTestId("selector-quick-picks")).not.toBeInTheDocument();
    });
  });

  it("puts plain name matches ahead of fuzzy ones", async () => {
    const items = [
      makeItem({ id: "sledge", name: "Sledgehammer", shortName: "Sledge" }),
      makeItem({ id: "ledx", name: "LEDX Skin Transilluminator", shortName: "LEDX" }),
    ];
    renderWithLanguage(
      <ItemSelector {...baseProps} manualDiscoveryItems={items} />
    );
    const input = focusSelector();
    fireEvent.change(input, { target: { value: "ledx" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(
      screen.getAllByText((_, el) => el?.textContent === "LEDX Skin Transilluminator")
        .length
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText((_, el) => el?.textContent === "Sledgehammer")
    ).toHaveLength(0);
  });
});
