import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SummarySection } from "@/components/app/summary-section";
import { LanguageProvider } from "@/contexts/language-context";

function renderSummary(
  props: Partial<Parameters<typeof SummarySection>[0]> = {},
) {
  render(
    <LanguageProvider>
      <SummarySection
        loading={false}
        total={163_790}
        totalFleaCost={169_999}
        threshold={400_000}
        isThresholdMet={false}
        {...props}
      />
    </LanguageProvider>,
  );
}

describe("Summary section", () => {
  afterEach(cleanup);

  it("labels a community-verified combo and shows its tested base value", () => {
    renderSummary({
      total: 400_000,
      isThresholdMet: true,
      verifiedCombo: {
        label: "Labs Card → G28",
        resultText: "400K+ (6h & 14h)",
        calculatedTotal: 163_790,
      },
    });

    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Community-verified combo");
    expect(banner.textContent).toContain("Labs Card → G28");
    expect(banner.textContent).toContain("₽163,790");
    expect(screen.getByText("Verified Base Value")).toBeTruthy();
    expect(screen.getByText(/₽400,000/)).toBeTruthy();
    expect(screen.getByText("₽169,999")).toBeTruthy();
    expect(screen.queryByText("needed")).toBeNull();
  });

  it("shows the plain calculated total without a verified combo", () => {
    renderSummary();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Total Base Value")).toBeTruthy();
    expect(screen.getByText("needed")).toBeTruthy();
  });
});
