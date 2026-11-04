import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HalloweenCursorToggle } from "@/components/halloween-cursor-toggle";
import { LanguageProvider } from "@/contexts/language-context";

function renderToggle() {
  render(
    <LanguageProvider>
      <HalloweenCursorToggle />
    </LanguageProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HalloweenCursorToggle", () => {
  it("is on by default in season and saves the choice when switched off", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 31));
    renderToggle();

    const toggle = screen.getByRole("switch", { name: /candy cursor/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem("halloween-cursor-enabled")).toBe("false");
  });

  it("is hidden outside the season", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 25));
    renderToggle();

    expect(screen.queryByRole("switch", { name: /candy cursor/i })).toBeNull();
  });
});
