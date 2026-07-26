import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { SelectorSettingsPopover } from "@/components/app/selector-settings-popover";
import { LanguageProvider } from "@/contexts/language-context";
import type { TraderLevels } from "@/components/ui/trader-level-selector";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
Element.prototype.scrollIntoView = vi.fn();

const traderLevels: TraderLevels = {
  prapor: 2,
  therapist: 3,
  skier: 2,
  peacekeeper: 4,
  mechanic: 3,
  ragman: 2,
  jaeger: 1,
};

const categories = [
  { id: "5422acb9af1c889c16000029", name: "Weapon" },
  { id: "550aa4cd4bdc2dd8348b456c", name: "Silencer" },
  { id: "5448eb774bdc2d0a728b4567", name: "Barter item" },
  { id: "flyer-category", name: "Flyer" },
];

function renderPopover(
  overrides: Partial<React.ComponentProps<typeof SelectorSettingsPopover>> = {},
) {
  const props: React.ComponentProps<typeof SelectorSettingsPopover> = {
    sortOption: "az",
    onSortChange: vi.fn(),
    priceMode: "flea",
    onPriceModeChange: vi.fn(),
    traderLevels,
    onTraderLevelsChange: vi.fn(),
    fleaPriceType: "lastLowPrice",
    onFleaPriceTypeChange: vi.fn(),
    excludeIncompatible: true,
    onExcludeIncompatibleChange: vi.fn(),
    incompatibleFilteredCount: 0,
    useLevelFilter: false,
    onUseLevelFilterChange: vi.fn(),
    fleaLevelFilteredCount: 0,
    useLastOfferCountFilter: false,
    onUseLastOfferCountFilterChange: vi.fn(),
    lowOfferCountFilteredCount: 0,
    playerLevel: 15,
    onPlayerLevelChange: vi.fn(),
    ignoreFilters: false,
    onIgnoreFiltersChange: vi.fn(),
    categories,
    categoryFilter: "all",
    onCategoryFilterChange: vi.fn(),
    traderFilter: "any",
    onTraderFilterChange: vi.fn(),
    ...overrides,
  };

  render(
    <LanguageProvider>
      <SelectorSettingsPopover {...props} />
    </LanguageProvider>,
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Open selector settings" }),
  );

  return props;
}

describe("SelectorSettingsPopover search filters", () => {
  it("uses the collision-available height for viewport-safe scrolling", () => {
    renderPopover();

    expect(screen.getByRole("dialog")).toHaveClass(
      "max-h-[min(70vh,var(--radix-popover-content-available-height))]",
      "overflow-y-auto",
    );
  });

  it("provides a searchable stable-ID category picker", () => {
    const props = renderPopover();

    fireEvent.click(
      screen.getByRole("combobox", {
        name: "Filter manual search by category",
      }),
    );
    expect(screen.getByText("Posters")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Find a category..."), {
      target: { value: "sil" },
    });
    fireEvent.click(screen.getByText("Silencer"));

    expect(props.onCategoryFilterChange).toHaveBeenCalledWith(
      "550aa4cd4bdc2dd8348b456c",
    );
  });

  it("shows active filter state, trader loyalty, and clears both filters", () => {
    const props = renderPopover({
      categoryFilter: "5422acb9af1c889c16000029",
      traderFilter: "prapor",
    });

    expect(screen.getByText("2 active")).toBeInTheDocument();
    expect(screen.getByText("Weapon · Prapor · LL2")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear search filters" }),
    );

    expect(props.onCategoryFilterChange).toHaveBeenCalledWith("all");
    expect(props.onTraderFilterChange).toHaveBeenCalledWith("any");
  });
});
