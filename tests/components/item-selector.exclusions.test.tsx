import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("react-virtualized-auto-sizer", () => ({
  default: ({ children }: { children: (size: { width: number }) => React.ReactNode }) =>
    children({ width: 320 }),
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

  const renderWithLanguage = (
    ui: React.ReactElement,
    language?: string
  ) => {
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
    isExcluded: false,
    onToggleExclude: () => {},
    excludedItems,
    fleaPriceType: "lastLowPrice" as const,
    priceMode: "flea" as const,
    traderLevels: defaultTraderLevels,
    remainingThreshold: 200_000,
    itemBonusPercent: 0,
  };

  const focusSelector = () => {
    const input = screen.getByPlaceholderText(/search items|gegenstaende suchen/i);
    act(() => {
      fireEvent.focus(input);
    });
    return input;
  };

  const toggleThresholdFilter = () => {
    act(() => {
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: /only show items that hit target/i,
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

    renderWithLanguage(<ItemSelector items={items} {...baseProps} />);
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

    renderWithLanguage(<ItemSelector items={items} {...baseProps} />);
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

    renderWithLanguage(<ItemSelector items={items} {...baseProps} />);
    focusSelector();

    act(() => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /only show items that hit target/i,
        })
      );
    });

    expect(
      screen.getByRole("checkbox", {
        name: /only show items that hit target/i,
      })
    ).toHaveAttribute("data-state", "checked");
    expect(screen.getByText("Qualified case")).toBeInTheDocument();
  });

  it("scopes search and autocomplete to the threshold-qualified pool", async () => {
    const items = [
      makeItem({ id: "silk", name: "Silk roll", basePrice: 80_000 }),
      makeItem({ id: "silver", name: "Silver badge", basePrice: 220_000 }),
    ];

    renderWithLanguage(<ItemSelector items={items} {...baseProps} />);
    const input = focusSelector();
    toggleThresholdFilter();

    fireEvent.change(input, { target: { value: "sil" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.queryByText("Silk roll")).not.toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Silver badge")
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
      <ItemSelector
        items={items}
        {...baseProps}
        remainingThreshold={500_000}
      />
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
      <ItemSelector items={items} {...baseProps} remainingThreshold={0} />
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

    renderWithLanguage(<ItemSelector items={items} {...baseProps} />);
    focusSelector();

    expect(screen.queryByText(/Roubles/i)).toBeNull();
  });

  it("excludes a default item when UI language is non-English", () => {
    const items = [
      makeItem({ id: "roubles", name: "Rubel", englishName: "Roubles" }),
    ];

    renderWithLanguage(<ItemSelector items={items} {...baseProps} />, "de");
    focusSelector();

    expect(screen.queryByText(/Rubel/i)).toBeNull();
    expect(screen.queryByText(/Roubles/i)).toBeNull();
  });
});
