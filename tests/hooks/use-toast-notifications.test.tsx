import React, { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/language-context";
import { useToastNotifications } from "@/hooks/use-toast-notifications";

const toastMock = vi.fn();

vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

function ToastHarness() {
  const { triggerNewNotifications } = useToastNotifications();

  useEffect(() => {
    triggerNewNotifications();
  }, [triggerNewNotifications]);

  return null;
}

describe("useToastNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastMock.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("announces the Black Division recipe's PvP Season return", async () => {
    render(
      <LanguageProvider>
        <ToastHarness />
      </LanguageProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(toastMock).toHaveBeenCalledWith(
      "Update: Black Division ritual works in PvP Season",
      expect.objectContaining({
        description:
          "Confirmed working in PvP Season only. The launcher codes no longer work, but you can find Ferrum dogtags on Black Division bodies or exchange BP documents for them in the Battlepass.",
        icon: "🔐",
      }),
    );
  });

  it("announces the new Black Division and Wedge figurine recipes", async () => {
    render(
      <LanguageProvider>
        <ToastHarness />
      </LanguageProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(toastMock).toHaveBeenCalledWith(
      "New figurine recipes: Black Division and Wedge",
      expect.objectContaining({
        description: expect.stringContaining("LV-119 plate carrier"),
      }),
    );
  });

  it("does not show the retired Tarkov.dev API warning toast", async () => {
    render(
      <LanguageProvider>
        <ToastHarness />
      </LanguageProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    const apiCall = toastMock.mock.calls.find(
      ([title]) => title === "Tarkov.dev API Issues",
    );

    expect(apiCall).toBeUndefined();
  });
});
