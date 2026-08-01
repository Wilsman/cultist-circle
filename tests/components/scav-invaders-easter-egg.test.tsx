import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScavInvadersEasterEgg } from "@/components/scav-invaders/scav-invaders-easter-egg.component";
import { KONAMI_SEQUENCE, KONAMI_SESSION_KEY } from "@/lib/konami-code";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockGame: ComponentType<{
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }> = ({ open, onOpenChange }) =>
      open ? (
        <div role="dialog" aria-label="Scav Invaders">
          <button type="button" onClick={() => onOpenChange(false)}>
            Close game
          </button>
        </div>
      ) : null;
    return MockGame;
  },
}));

function enterKonamiCode(target: Window | HTMLElement = window) {
  KONAMI_SEQUENCE.forEach((key) => fireEvent.keyDown(target, { key }));
}

describe("Scav Invaders easter egg", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("reveals the Play button after the full code and opens the game", () => {
    render(<ScavInvadersEasterEgg />);
    expect(
      screen.queryByRole("button", { name: "Play Scav Invaders" }),
    ).not.toBeInTheDocument();

    enterKonamiCode();

    const playButton = screen.getByRole("button", {
      name: "Play Scav Invaders",
    });
    expect(playButton).toBeInTheDocument();
    expect(window.sessionStorage.getItem(KONAMI_SESSION_KEY)).toBe("true");

    fireEvent.click(playButton);
    expect(
      screen.getByRole("dialog", { name: "Scav Invaders" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close game" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores code entry while typing in an editable field", () => {
    render(
      <>
        <input aria-label="Search" />
        <ScavInvadersEasterEgg />
      </>,
    );

    enterKonamiCode(screen.getByRole("textbox", { name: "Search" }));

    expect(
      screen.queryByRole("button", { name: "Play Scav Invaders" }),
    ).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(KONAMI_SESSION_KEY)).toBeNull();
  });

  it("restores the unlock for the current browser tab", () => {
    window.sessionStorage.setItem(KONAMI_SESSION_KEY, "true");
    render(<ScavInvadersEasterEgg />);

    expect(
      screen.getByRole("button", { name: "Play Scav Invaders" }),
    ).toBeInTheDocument();
  });
});
