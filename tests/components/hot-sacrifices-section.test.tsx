import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HotSacrificesSection } from "@/components/app/hot-sacrifices-section";
import { LanguageProvider } from "@/contexts/language-context";

const COSTS = {
  "5x-mp5": 300_000,
  "4x-mp5-diary": 250_000,
  "2x-mp5sd-diary": 200_000,
  "3x-stm-saiga": 50_000,
  "4x-stm-saiga": 150_000,
  "labs-g28": 120_000,
};

function renderSection(
  props: Partial<Parameters<typeof HotSacrificesSection>[0]> = {},
) {
  const onUse = vi.fn();
  render(
    <LanguageProvider>
      <HotSacrificesSection
        threshold={400_000}
        sacrificeCosts={COSTS}
        onUse={onUse}
        {...props}
      />
    </LanguageProvider>,
  );
  return { onUse };
}

const comboButtons = () =>
  screen.getAllByRole("button", { name: /^Fill slots with/ });

describe("Hot sacrifices section", () => {
  afterEach(cleanup);

  it("lists combos that reach the threshold cheapest first, four at a time", async () => {
    renderSection();

    expect(comboButtons().map((button) => button.textContent)).toEqual([
      expect.stringContaining("Labs Card → G28"),
      expect.stringContaining("4× STM-9 + Saiga-9"),
      expect.stringContaining("2× MP5 SD + Diary"),
      expect.stringContaining("4× MP5 + Diary"),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "+ 2 more" }));
    const all = comboButtons();
    expect(all).toHaveLength(6);
    expect(all[5]).toHaveTextContent("3× STM-9 + Saiga-9");
    expect(all[5]).toHaveTextContent("Below your threshold");
  });

  it("moves a cheaper combo up once it reaches the threshold", () => {
    renderSection({ threshold: 350_000 });

    expect(comboButtons()[0]).toHaveTextContent("3× STM-9 + Saiga-9");
    expect(screen.queryByText(/Below your threshold/)).not.toBeInTheDocument();
  });

  it("fills the slots from a row and marks the loaded combo", async () => {
    const { onUse } = renderSection({ loadedComboId: "labs-g28" });

    const row = screen.getByRole("button", {
      name: "Fill slots with Labs Card → G28",
    });
    expect(within(row).getByText("In your slots")).toBeInTheDocument();

    fireEvent.click(row);
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({ id: "labs-g28" }),
    );
  });

  it("keeps broken combos under Retired and not usable", async () => {
    renderSection();
    expect(screen.queryByText(/SAS → THOR IC/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retired \(1\)/ }));
    expect(screen.getByText("SAS → THOR IC")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /SAS → THOR IC/ }),
    ).not.toBeInTheDocument();
  });
});
