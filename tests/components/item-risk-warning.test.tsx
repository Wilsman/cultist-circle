import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemRiskWarning } from "@/components/item-risk-warning";
import { LanguageProvider } from "@/contexts/language-context";
import { CATEGORY_ID_BY_NAME } from "@/config/item-categories";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const item = (partial: Partial<SimplifiedItem>): SimplifiedItem => ({
  id: partial.name ?? "item",
  name: "Item",
  shortName: "",
  basePrice: 1000,
  categories: [],
  ...partial,
});

const renderCard = (items: SimplifiedItem[]) =>
  render(
    <LanguageProvider>
      <ItemRiskWarning selectedItems={items} />
    </LanguageProvider>,
  );

describe("ItemRiskWarning", () => {
  it("renders nothing for ordinary items", () => {
    const { container } = renderCard([item({ name: "Golden rooster" })]);
    expect(container).toBeEmptyDOMElement();
  });

  it("groups selected items by reason", () => {
    const { container } = renderCard([
      item({ name: "AK-74N", categories: [CATEGORY_ID_BY_NAME.get("Weapon")!] }),
      item({ name: "Dorm key", maxUses: 10 }),
      item({ name: "Factory key", maxUses: 10 }),
    ]);

    expect(
      screen.getByText("These items may not give the expected result"),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-risk="unverified-value"]'),
    ).toHaveTextContent("AK-74N");
    expect(
      container.querySelector('[data-risk="has-uses"]'),
    ).toHaveTextContent("Dorm key, Factory key");
    expect(container.querySelector('[data-risk="stack-value"]')).toBeNull();
  });
});
