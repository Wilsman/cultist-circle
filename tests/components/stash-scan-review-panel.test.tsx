import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewPanel } from "@/components/stash-scan/review-panel";
import { LanguageProvider } from "@/contexts/language-context";
import type { ScanSession } from "@/hooks/use-stash-scan-store";
import type { DisplayCell } from "@/lib/stash-scan/owned-items";
import type { ScanCell } from "@/lib/stash-scan/types";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const item: SimplifiedItem = {
  id: "medkit",
  name: "Medkit",
  shortName: "Medkit",
  basePrice: 100,
};

const scannedCell: ScanCell = {
  x: 10,
  y: 10,
  width: 24,
  height: 24,
  slotsWide: 1,
  slotsHigh: 1,
  empty: false,
  confidence: "medium",
  matches: [{
    itemId: item.id,
    shortName: item.shortName,
    rotated: false,
    score: 0.8,
  }],
};

const cell: DisplayCell = {
  ...scannedCell,
  key: "0:0",
  imageIndex: 0,
};

const session: ScanSession = {
  images: [{ id: "image-1", url: "sample-image" }],
  results: [{ width: 100, height: 100, pitch: 24, cells: [scannedCell] }],
};

function renderReview(similarReviewCellCount: number) {
  const onAssign = vi.fn();
  render(
    <LanguageProvider>
      <ReviewPanel
        session={session}
        cells={[cell]}
        itemsById={new Map([[item.id, item]])}
        items={[item]}
        assignments={{ [cell.key]: item.id }}
        similarReviewCellCount={similarReviewCellCount}
        splitting={false}
        activeCell={cell.key}
        reviewing
        remaining={5}
        total={5}
        onStart={vi.fn()}
        onAssign={onAssign}
        onSkip={vi.fn()}
        onClose={vi.fn()}
        commitLabel="Use this stash"
        onCommit={vi.fn()}
        canCommit
      />
    </LanguageProvider>,
  );
  return onAssign;
}

describe("ReviewPanel matching-cell mapping", () => {
  it("passes the bulk choice when selecting a mapping", () => {
    const onAssign = renderReview(4);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Also apply this choice to 4 similar cells",
      }),
    );
    fireEvent.click(screen.getByRole("option", { name: /Medkit/ }));

    expect(onAssign).toHaveBeenCalledWith("medkit", true);
  });

  it("keeps similar-cell application opt-in", () => {
    const onAssign = renderReview(0);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Medkit/ }));

    expect(onAssign).toHaveBeenCalledWith("medkit", false);
  });
});
