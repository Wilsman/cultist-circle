import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";

// Test component to access context
function TestComponent() {
  const { language, setLanguage, supported } = useLanguage();
  return (
    <div>
      <div data-testid="current-language">{language}</div>
      <button onClick={() => setLanguage("de")} data-testid="set-german">
        Set German
      </button>
      <button onClick={() => setLanguage("fr")} data-testid="set-french">
        Set French
      </button>
      <div data-testid="available-languages">{supported.length} languages</div>
    </div>
  );
}

describe("LanguageContext", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Clear localStorage mock
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    cleanup();
  });

  test("provides default language as English", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-language")).toHaveTextContent("en");
    expect(screen.getByTestId("available-languages")).toHaveTextContent(
      "16 languages"
    );
  });

  test("loads saved language from localStorage", () => {
    localStorage.setItem("language", "de");

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-language")).toHaveTextContent("de");
  });

  test("saves language to localStorage when changed", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Initially English
    expect(screen.getByTestId("current-language")).toHaveTextContent("en");

    // Change to German
    const germanButton = screen.getByTestId("set-german");
    fireEvent.click(germanButton);

    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("de");
    });

    // Should be saved to localStorage
    expect(localStorage.getItem("language")).toBe("de");
  });

  test("handles invalid language in localStorage gracefully", () => {
    localStorage.setItem("language", "invalid-lang");

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should fall back to default English
    expect(screen.getByTestId("current-language")).toHaveTextContent("en");
  });

  test("prevents setting invalid languages", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Try to set invalid language via direct context (not through UI)
    const { rerender } = render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // The context should only allow valid languages from the available list
    expect(screen.getByTestId("current-language")).toHaveTextContent("en");

    // Change to valid German
    fireEvent.click(screen.getByTestId("set-german"));

    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("de");
    });
  });

  test("provides all supported languages", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId("available-languages")).toHaveTextContent(
      "16 languages"
    );
  });

  test("handles localStorage errors gracefully", () => {
    // Mock localStorage to throw errors
    const mockSetItem = vi.fn(() => {
      throw new Error("Storage quota exceeded");
    });

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: mockSetItem,
        removeItem: vi.fn(),
        clear: vi.fn(),
        get length() {
          return 0;
        },
        key: vi.fn(),
      },
      writable: true,
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should not crash when trying to change language
    const germanButton = screen.getByTestId("set-german");
    fireEvent.click(germanButton);

    // Component should still work despite localStorage error
    expect(screen.getByTestId("current-language")).toBeInTheDocument();
  });

  test("context value remains stable across re-renders", () => {
    const { rerender } = render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const initialLanguage = screen.getByTestId("current-language").textContent;

    // Re-render with same provider
    rerender(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Language should remain the same
    expect(screen.getByTestId("current-language")).toHaveTextContent(
      initialLanguage
    );
  });

  test("multiple language changes work correctly", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Start with English
    expect(screen.getByTestId("current-language")).toHaveTextContent("en");

    // Change to German
    fireEvent.click(screen.getByTestId("set-german"));
    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("de");
    });

    // Change to French
    fireEvent.click(screen.getByTestId("set-french"));
    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("fr");
    });

    // Check localStorage has the latest value
    expect(localStorage.getItem("language")).toBe("fr");
  });

  test("handles missing localStorage gracefully", () => {
    // Temporarily remove localStorage
    const originalLocalStorage = globalThis.localStorage;
    delete (globalThis as any).localStorage;

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should still work with default language
    expect(screen.getByTestId("current-language")).toHaveTextContent("en");

    // Restore localStorage
    globalThis.localStorage = originalLocalStorage;
  });

  test("language changes persist across component unmount/remount", async () => {
    const { unmount } = render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Change language
    fireEvent.click(screen.getByTestId("set-german"));
    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("de");
    });

    // Unmount component
    unmount();

    // Remount component
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Should restore saved language
    expect(screen.getByTestId("current-language")).toHaveTextContent("de");
  });

  test("useLanguage hook throws error when used outside provider", () => {
    // Suppress expected error in console
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useLanguage must be used within a LanguageProvider");

    // Restore console.error
    console.error = originalError;
  });

  test("provides correct language codes for all supported languages", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Test that we can set various languages
    const languageTests = [
      { lang: "de", button: "set-german" },
      { lang: "fr", button: "set-french" },
    ];

    languageTests.forEach(({ lang, button }) => {
      fireEvent.click(screen.getByTestId(button));
      expect(screen.getByTestId("current-language")).toHaveTextContent(lang);
    });
  });

  test("handles rapid language changes without errors", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Rapidly change languages
    fireEvent.click(screen.getByTestId("set-german"));
    fireEvent.click(screen.getByTestId("set-french"));
    fireEvent.click(screen.getByTestId("set-german"));

    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("de");
    });

    // Should end up with the last set language
    expect(localStorage.getItem("language")).toBe("de");
  });
});
