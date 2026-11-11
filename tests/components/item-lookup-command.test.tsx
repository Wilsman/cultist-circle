import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockItemLookupPalette({ open }: { open: boolean }) {
      return open ? <div role="dialog" aria-label="Item lookup" /> : null;
    },
}));

import { ItemLookupCommand } from "@/components/item-lookup-command";

describe("ItemLookupCommand shortcuts", () => {
  it("leaves / to the page instead of opening the lookup", () => {
    render(<ItemLookupCommand />);

    const event = new KeyboardEvent("keydown", {
      key: "/",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the lookup with Ctrl+K", () => {
    render(<ItemLookupCommand />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(
      screen.getByRole("dialog", { name: "Item lookup" }),
    ).toBeInTheDocument();
  });
});
