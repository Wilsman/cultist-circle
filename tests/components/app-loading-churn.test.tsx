import React from "react";
import { render, screen } from "@testing-library/react";
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

describe("App loading data churn", () => {
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

  it("does not infinite-loop while item data identity churns during loading", async () => {
    const { App } = await import("@/components/app");
    // useItemsData returns `data || []`, i.e. a fresh empty array on every
    // render while a fetch (e.g. after a game-mode switch) is in flight.
    // Tracking that identity with render-phase setState must not schedule a
    // re-render per render (React error #301).
    useItemsDataMock.mockImplementation(() => ({
      data: [],
      isLoading: true,
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
    }));

    renderWithLanguage(<App />);

    expect(
      await screen.findByText(/Tarkov\.dev is not responding\. Retrying in/i),
    ).toBeInTheDocument();
    // Full-App render: allow headroom under parallel load.
  }, 15000);
});
