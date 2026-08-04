import React, { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("announces the new Black Division recipe once", async () => {
    render(<ToastHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(toastMock).toHaveBeenCalledWith(
      "New Ritual: Black Division Dogtags",
      expect.objectContaining({
        description:
          "Redeem five launcher codes, sacrifice any five Black Division dogtags, and uncover the 05:09:00 reward.",
        icon: "🔐",
      }),
    );
  });

  it("does not show the retired Tarkov.dev API warning toast", async () => {
    render(<ToastHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    const apiCall = toastMock.mock.calls.find(
      ([title]) => title === "Tarkov.dev API Issues",
    );

    expect(apiCall).toBeUndefined();
  });
});
