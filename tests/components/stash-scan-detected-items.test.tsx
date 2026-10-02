import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DetectedItems } from "@/components/stash-scan/detected-items";
import { LanguageProvider } from "@/contexts/language-context";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const item = (id: string, name: string): SimplifiedItem => ({
  id,
  name,
  shortName: name,
  basePrice: 100,
});

describe("DetectedItems", () => {
  it("names each include checkbox after its item", () => {
    render(
      <LanguageProvider>
        <DetectedItems
          groups={[
            { itemId: "a", item: item("a", "Graphics card"), cells: ["0:0"], needsReview: false },
            { itemId: "b", item: item("b", "Gas analyzer"), cells: ["0:1"], needsReview: false },
          ]}
          excluded={new Set()}
          plannedCounts={new Map()}
          unrecognisedCount={0}
          pricing={{ priceMode: "flea", fleaPriceType: "lastLowPrice", itemBonus: 0 }}
          onToggle={vi.fn()}
          onHover={vi.fn()}
          onReview={vi.fn()}
          onShowUnrecognised={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("checkbox", { name: "Include Graphics card in the sacrifice" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Include Gas analyzer in the sacrifice" })).toBeInTheDocument();
  });
});
