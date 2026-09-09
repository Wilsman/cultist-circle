import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

describe("slotted link refs", () => {
  it("keeps the same link attached when a tooltip trigger rerenders", () => {
    const ref = vi.fn();
    const content = (label: string) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild>
              <a ref={ref} href="/faq">{label}</a>
            </Button>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>
    );
    const { rerender, unmount } = render(content("Help"));
    const link = screen.getByRole("link", { name: "Help" });
    ref.mockClear();

    rerender(content("Help & FAQ"));

    expect(screen.getByRole("link", { name: "Help & FAQ" })).toBe(link);
    expect(ref).not.toHaveBeenCalled();

    unmount();
    expect(ref).toHaveBeenCalledWith(null);
  });
});
