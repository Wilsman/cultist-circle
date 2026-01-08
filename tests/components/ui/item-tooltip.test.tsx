import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import ItemTooltip from "@/components/ui/item-tooltip";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

// Mock TooltipPrimitive
vi.mock("@radix-ui/react-tooltip", () => ({
  TooltipPrimitive: {
    Provider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Root: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Trigger: ({
      children,
      asChild,
    }: {
      children: React.ReactNode;
      asChild?: boolean;
    }) => (asChild ? children : <button>{children}</button>),
    Portal: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Content: ({
      children,
      className,
      side,
      sideOffset,
    }: {
      children: React.ReactNode;
      className?: string;
      side?: string;
      sideOffset?: number;
    }) => (
      <div className={className} data-side={side} data-side-offset={sideOffset}>
        {children}
      </div>
    ),
  },
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Trigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? children : <button>{children}</button>),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Content: ({
    children,
    className,
    side,
    sideOffset,
  }: {
    children: React.ReactNode;
    className?: string;
    side?: string;
    sideOffset?: number;
  }) => (
    <div className={className} data-side={side} data-side-offset={sideOffset}>
      {children}
    </div>
  ),
}));

const mockItem: SimplifiedItem = {
  id: "5034d19ac2b94b42496d3d7e",
  name: "Antique Vase",
  shortName: "Vase",
  basePrice: 67800,
  categories: ["Barter item"],
  categories_display: [{ name: "Barter item" }],
  englishName: "Antique Vase",
  englishShortName: "Vase",
  iconLink: "https://example.com/icon.png",
  link: "https://tarkov.dev/item/antique-vase",
  width: 2,
  height: 2,
  lastLowPrice: 45000,
  avg24hPrice: 50000,
  lastOfferCount: 15,
  updated: "2024-01-01T12:00:00Z",
  buyFor: [
    {
      priceRUB: 33222,
      vendor: {
        normalizedName: "Skier",
        minTraderLevel: 1,
      },
    },
  ],
};

describe("ItemTooltip", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders children as trigger", () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  test("shows tooltip content on hover", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Antique Vase")).toBeInTheDocument();
    });
  });

  test("displays item icon when available", async () => {
    render(
      <ItemTooltip item={mockItem} iconUrl={mockItem.iconLink}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      const icon = screen.getByAltText("Antique Vase");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("src", "https://example.com/icon.png");
    });
  });

  test("handles missing icon gracefully", async () => {
    const itemWithoutIcon = { ...mockItem, iconLink: undefined };

    render(
      <ItemTooltip item={itemWithoutIcon}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.queryByAltText("Antique Vase")).not.toBeInTheDocument();
    });
  });

  test("displays item name as link when link is available", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      const link = screen.getByText("Antique Vase");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "https://tarkov.dev/item/antique-vase"
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  test("displays item name as text when no link is available", async () => {
    const itemWithoutLink = { ...mockItem, link: undefined };

    render(
      <ItemTooltip item={itemWithoutLink}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      const heading = screen.getByText("Antique Vase");
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H3");
    });
  });

  test("displays short name when different from name", async () => {
    const itemWithShortName = {
      ...mockItem,
      shortName: "AV",
    };

    render(
      <ItemTooltip item={itemWithShortName}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("AV")).toBeInTheDocument();
      expect(screen.getByText("AV")).toHaveClass("text-xs", "text-gray-400");
    });
  });

  test("does not display short name when same as name", async () => {
    const itemWithSameShortName = {
      ...mockItem,
      shortName: "Antique Vase",
    };

    render(
      <ItemTooltip item={itemWithSameShortName}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(
        screen.queryByText("Antique Vase", { selector: ".text-xs" })
      ).not.toBeInTheDocument();
    });
  });

  test("displays base value", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Base Value:")).toBeInTheDocument();
      expect(screen.getByText("₽67,800")).toBeInTheDocument();
    });
  });

  test("displays flea price when available", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Market Price:")).toBeInTheDocument();
      expect(screen.getByText("₽45,000")).toBeInTheDocument();
    });
  });

  test("handles missing flea price gracefully", async () => {
    const itemWithoutFleaPrice = { ...mockItem, lastLowPrice: null };

    render(
      <ItemTooltip item={itemWithoutFleaPrice}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.queryByText("Market Price:")).not.toBeInTheDocument();
    });
  });

  test("displays 24h average when available", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("24h Average:")).toBeInTheDocument();
      expect(screen.getByText("₽50,000")).toBeInTheDocument();
    });
  });

  test("handles missing 24h average gracefully", async () => {
    const itemWithoutAvg = { ...mockItem, avg24hPrice: null };

    render(
      <ItemTooltip item={itemWithoutAvg}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.queryByText("24h Average:")).not.toBeInTheDocument();
    });
  });

  test("displays size information", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Size:")).toBeInTheDocument();
      expect(screen.getByText("2x2")).toBeInTheDocument();
    });
  });

  test("displays offer count when available", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Offers:")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
    });
  });

  test("handles missing offer count gracefully", async () => {
    const itemWithoutOffers = { ...mockItem, lastOfferCount: null };

    render(
      <ItemTooltip item={itemWithoutOffers}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.queryByText("Offers:")).not.toBeInTheDocument();
    });
  });

  test("displays trader buy prices", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Best Trader:")).toBeInTheDocument();
      expect(screen.getByText("₽33,222")).toBeInTheDocument();
      expect(screen.getByText("Trader:")).toBeInTheDocument();
      expect(screen.getByText("Skier (L1)")).toBeInTheDocument();
    });
  });

  test("displays multiple trader buy prices", async () => {
    const itemWithMultipleTraders = {
      ...mockItem,
      buyFor: [
        {
          priceRUB: 33222,
          vendor: {
            normalizedName: "Skier",
            minTraderLevel: 1,
          },
        },
        {
          priceRUB: 35000,
          vendor: {
            normalizedName: "Therapist",
            minTraderLevel: 2,
          },
        },
      ],
    };

    render(
      <ItemTooltip item={itemWithMultipleTraders}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      // Should show the best trader (highest price)
      expect(screen.getByText("Best Trader:")).toBeInTheDocument();
      expect(screen.getByText("₽35,000")).toBeInTheDocument();
      expect(screen.getByText("Trader:")).toBeInTheDocument();
      expect(screen.getByText("Therapist (L2)")).toBeInTheDocument();
    });
  });

  test("handles missing trader prices gracefully", async () => {
    const itemWithoutTraders = { ...mockItem, buyFor: undefined };

    render(
      <ItemTooltip item={itemWithoutTraders}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.queryByText("Best Trader:")).not.toBeInTheDocument();
    });
  });

  test("formats prices correctly with commas", async () => {
    const expensiveItem = {
      ...mockItem,
      basePrice: 1234567,
      lastLowPrice: 987654,
      avg24hPrice: 1111111,
    };

    render(
      <ItemTooltip item={expensiveItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("₽1,234,567")).toBeInTheDocument();
      expect(screen.getByText("₽987,654")).toBeInTheDocument();
      expect(screen.getByText("₽1,111,111")).toBeInTheDocument();
    });
  });

  test("applies correct tooltip positioning classes", async () => {
    render(
      <ItemTooltip item={mockItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      const tooltip = screen.getByText("Antique Vase").closest("[data-side]");
      expect(tooltip).toHaveAttribute("data-side", "top");
      expect(tooltip).toHaveAttribute("data-side-offset", "8");
    });
  });

  test("handles item with minimal data", async () => {
    const minimalItem: SimplifiedItem = {
      id: "test-id",
      name: "Minimal Item",
      shortName: "MI",
      basePrice: 1000,
      categories: ["Test"],
      categories_display: [{ name: "Test" }],
      englishName: "Minimal Item",
      englishShortName: "MI",
    };

    render(
      <ItemTooltip item={minimalItem}>
        <button>Hover me</button>
      </ItemTooltip>
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Minimal Item")).toBeInTheDocument();
      expect(screen.getByText("₽1,000")).toBeInTheDocument();
    });
  });
});
