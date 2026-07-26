import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("starts collapsed and reveals the recommendation hierarchy on demand", async () => {
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
    const expandButton = screen.getByRole("button", {
      name: "Show recommended items for this slot",
    });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Recommended")).not.toBeInTheDocument();

    fireEvent.click(expandButton);

    expect(
      screen.getByRole("button", {
        name: "Hide recommended items for this slot",
      }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Alternative 1")).toBeInTheDocument();
    expect(screen.getByText("Base value ₽77,500")).toBeInTheDocument();
    expect(screen.getByText("Base value ₽74,000")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide recommended items for this slot",
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
    });
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
        name: "Show recommended items for this slot",
      }),
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
