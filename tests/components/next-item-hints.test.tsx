import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import NextItemHints from "@/components/next-item-hints";
import { LanguageProvider } from "@/contexts/language-context";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeItem(
  id: string,
  name: string,
  shortName: string,
  basePrice: number,
): SimplifiedItem {
  return {
    id,
    name,
    shortName,
    basePrice,
  };
}

describe("NextItemHints", () => {
  const recommended = makeItem(
    "recommended",
    "SP-8 Survival Machete",
    "SP-8",
    77500,
  );
  const alternative = makeItem(
    "alternative",
    "AR-10 KAC SR-25/Mk.11 sound suppressor",
    "Mk.11",
    74000,
  );

  it("explains the recommendation hierarchy and base values", () => {
    render(
      <LanguageProvider>
        <NextItemHints
          items={[recommended, alternative]}
          onPick={() => undefined}
        />
      </LanguageProvider>,
    );

    expect(
      screen.getByRole("region", {
        name: "Recommended items for this slot",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Alternative 1")).toBeInTheDocument();
    expect(screen.getByText("Base value ₽77,500")).toBeInTheDocument();
    expect(screen.getByText("Base value ₽74,000")).toBeInTheDocument();
  });

  it("adds a suggested item from the attached recommendation drawer", () => {
    const onPick = vi.fn();

    render(
      <LanguageProvider>
        <NextItemHints items={[recommended, alternative]} onPick={onPick} />
      </LanguageProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Add recommended item SP-8 Survival Machete, base value ₽77,500",
      }),
    );

    expect(onPick).toHaveBeenCalledWith(recommended);
    expect(
      screen.queryByRole("button", { name: "Search items instead" }),
    ).not.toBeInTheDocument();
  });
});
