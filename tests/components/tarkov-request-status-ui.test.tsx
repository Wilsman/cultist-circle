import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/language-context";

const useItemsDataMock = vi.fn();
const fetchMinimalTarkovDataMock = vi.fn();

vi.mock("@/hooks/use-items-data", () => ({
  useItemsData: (...args: unknown[]) => useItemsDataMock(...args),
}));

vi.mock("@/hooks/use-tarkov-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/hooks/use-tarkov-api")>();
  return {
    ...actual,
    fetchMinimalTarkovData: (...args: unknown[]) =>
      fetchMinimalTarkovDataMock(...args),
  };
});

vi.mock("@/components/ui/virtualized-table", () => ({
  VirtualizedTable: () => <div data-testid="virtualized-table" />,
}));

vi.mock("@/components/app/header-section", () => ({
  HeaderSection: () => <div data-testid="header-section" />,
}));

function renderWithLanguage(ui: React.ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("Tarkov request status UI", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("appVersion", "2.1.2");
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "ResizeObserver", {
      value: ResizeObserverMock,
      writable: true,
    });
    useItemsDataMock.mockReset();
    fetchMinimalTarkovDataMock.mockReset();
  });

  it("shows calculator retry progress while Tarkov.dev is failing", async () => {
    const { App } = await import("@/components/app");
    useItemsDataMock.mockReturnValue({
      data: [],
      isLoading: false,
      hasError: false,
      mutate: vi.fn(),
      needsManualRetry: false,
      resetRetryCount: vi.fn(),
      requestStatus: {
        phase: "retrying",
        attempt: 2,
        maxAttempts: 3,
        nextRetryAt: Date.now() + 4000,
        lastError: "Tarkov.dev API request failed with status 503",
        usingStaleData: false,
      },
    });

    renderWithLanguage(<App />);

    expect(
      await screen.findByText(/Tarkov\.dev is not responding\. Retrying in/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/attempt 2 of 3/i)).toBeInTheDocument();
  });

  it("shows calculator cooldown and disables exhausted manual retry", async () => {
    const { App } = await import("@/components/app");
    useItemsDataMock.mockReturnValue({
      data: [],
      isLoading: false,
      hasError: true,
      mutate: vi.fn(),
      needsManualRetry: true,
      resetRetryCount: vi.fn(),
      requestStatus: {
        phase: "cooldown",
        attempt: 3,
        maxAttempts: 3,
        cooldownUntil: Date.now() + 60000,
        lastError: "Tarkov.dev API request failed with status 503",
        usingStaleData: false,
      },
    });

    renderWithLanguage(<App />);

    expect(
      await screen.findByText(/Tarkov\.dev item data could not be loaded/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDisabled();
  });

  it("switches the calculator to Season and persists the selection", async () => {
    const { App } = await import("@/components/app");
    useItemsDataMock.mockReturnValue({
      data: [],
      isLoading: false,
      hasError: false,
      mutate: vi.fn(),
      needsManualRetry: false,
      resetRetryCount: vi.fn(),
      requestStatus: {
        phase: "success",
        attempt: 3,
        maxAttempts: 3,
        usingStaleData: false,
      },
    });

    renderWithLanguage(<App />);
    fireEvent.click(await screen.findByRole("radio", { name: "Season" }));

    await waitFor(() => {
      expect(useItemsDataMock).toHaveBeenLastCalledWith("season");
      expect(localStorage.getItem("gameMode")).toBe("season");
    });
  });

  it("shows Base Values outage status instead of silently rendering empty data", async () => {
    const ItemsTablePage = (await import("@/app/base-values/page")).default;
    fetchMinimalTarkovDataMock.mockImplementation(
      (_gameMode: string, _language: string, options?: any) => {
        options?.onStatus?.({
          phase: "cooldown",
          attempt: 3,
          maxAttempts: 3,
          cooldownUntil: Date.now() + 60000,
          lastError: "Tarkov.dev API request failed with status 503",
          usingStaleData: false,
        });
        return Promise.reject(
          new Error("Tarkov.dev API request failed with status 503"),
        );
      },
    );

    renderWithLanguage(<ItemsTablePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Tarkov\.dev is unavailable/i),
      ).toBeInTheDocument();
    });
  });

  it("loads Base Values data one game mode at a time", async () => {
    const ItemsTablePage = (await import("@/app/base-values/page")).default;
    fetchMinimalTarkovDataMock.mockResolvedValue([]);

    renderWithLanguage(<ItemsTablePage />);

    await waitFor(() => {
      expect(fetchMinimalTarkovDataMock).toHaveBeenCalledWith(
        "regular",
        "en",
        expect.any(Object),
      );
    });
    expect(fetchMinimalTarkovDataMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("radio", { name: "PVE" }));

    await waitFor(() => {
      expect(fetchMinimalTarkovDataMock).toHaveBeenCalledWith(
        "pve",
        "en",
        expect.any(Object),
      );
    });
    expect(fetchMinimalTarkovDataMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("radio", { name: "Season" }));

    await waitFor(() => {
      expect(fetchMinimalTarkovDataMock).toHaveBeenCalledWith(
        "pvp-season",
        "en",
        expect.any(Object),
      );
    });
    expect(fetchMinimalTarkovDataMock).toHaveBeenCalledTimes(3);
  });
});
