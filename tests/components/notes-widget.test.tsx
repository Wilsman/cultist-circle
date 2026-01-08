import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { NotesWidget } from "@/components/notes-widget";

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

// Mock window methods
Object.defineProperty(globalThis, "localStorage", {
  value: createLocalStorageMock(),
  writable: true,
});

Object.defineProperty(globalThis, "window", {
  value: {
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 0)),
    cancelAnimationFrame: vi.fn(),
    innerWidth: 1024,
    innerHeight: 768,
  },
  writable: true,
});

describe("NotesWidget", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders floating trigger button", () => {
    render(<NotesWidget />);

    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  test("shows tooltip on hover", async () => {
    render(<NotesWidget />);

    const trigger = screen.getByRole("button", { name: /toggle notes/i });

    // Hover over the trigger
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText("Sticky Notes")).toBeInTheDocument();
    });
  });

  test("opens panel when trigger is clicked", async () => {
    render(<NotesWidget />);

    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/type your notes/i)).toBeInTheDocument();
    });
  });

  test("closes panel when close button is clicked", async () => {
    render(<NotesWidget />);

    // Open panel first
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/type your notes/i)).toBeInTheDocument();
    });

    // Close panel
    const closeButton = screen.getByRole("button", { name: /close notes/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByDisplayValue(/type your notes/i)
      ).not.toBeInTheDocument();
    });
  });

  test("loads saved notes from localStorage on mount", async () => {
    localStorage.setItem("taskTracker_notes", "Test saved note");

    render(<NotesWidget />);

    // Open panel to see loaded content
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      const textarea = screen.getByDisplayValue(/type your notes/i);
      expect(textarea).toHaveValue("Test saved note");
    });
  });

  test("saves notes to localStorage on change", async () => {
    render(<NotesWidget />);

    // Open panel
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/type your notes/i)).toBeInTheDocument();
    });

    // Type in textarea
    const textarea = screen.getByDisplayValue(/type your notes/i);
    fireEvent.change(textarea, { target: { value: "New note content" } });

    // Wait for debounced save
    await waitFor(
      () => {
        expect(localStorage.getItem("taskTracker_notes")).toBe(
          "New note content"
        );
      },
      { timeout: 1000 }
    );
  });

  test("shows character count", async () => {
    render(<NotesWidget />);

    // Open panel
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/type your notes/i)).toBeInTheDocument();
    });

    // Type content
    const textarea = screen.getByDisplayValue(/type your notes/i);
    fireEvent.change(textarea, { target: { value: "Hello world" } });

    await waitFor(() => {
      expect(screen.getByText("11")).toBeInTheDocument(); // "Hello world" length
    });
  });

  test("shows saving status", async () => {
    vi.useFakeTimers();

    render(<NotesWidget />);

    // Open panel
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/type your notes/i)).toBeInTheDocument();
    });

    // Type content
    const textarea = screen.getByDisplayValue(/type your notes/i);
    fireEvent.change(textarea, { target: { value: "Test note" } });

    // Should show "Saving..." immediately
    await waitFor(() => {
      expect(screen.getByText("Saving…")).toBeInTheDocument();
    });

    // Fast-forward timers to trigger save completion
    vi.advanceTimersByTime(400);

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });

    // Fast-forward timers to reset status
    vi.advanceTimersByTime(800);

    await waitFor(() => {
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  test("clears notes when clear button is clicked", async () => {
    localStorage.setItem("taskTracker_notes", "Initial note");

    render(<NotesWidget />);

    // Open panel
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/type your notes/i)).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByRole("button", { name: /clear notes/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      const textarea = screen.getByDisplayValue(/type your notes/i);
      expect(textarea).toHaveValue("");
    });

    // Should also clear localStorage
    expect(localStorage.getItem("taskTracker_notes")).toBe("");
  });

  test("saves and restores panel position", async () => {
    // Set initial position
    localStorage.setItem(
      "taskTracker_notes_pos",
      JSON.stringify({ x: 100, y: 200 })
    );

    render(<NotesWidget />);

    const container = screen
      .getByRole("button", { name: /toggle notes/i })
      .closest("div");
    expect(container).toHaveStyle({ right: "100px", bottom: "200px" });
  });

  test("handles invalid position data gracefully", () => {
    localStorage.setItem("taskTracker_notes_pos", "invalid json");

    render(<NotesWidget />);

    // Should fall back to default position
    const container = screen
      .getByRole("button", { name: /toggle notes/i })
      .closest("div");
    expect(container).toHaveStyle({ right: "16px", bottom: "16px" });
  });

  test("handles localStorage errors gracefully", () => {
    // Mock localStorage to throw errors
    const mockSetItem = vi.fn(() => {
      throw new Error("Storage quota exceeded");
    });

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        ...createLocalStorageMock(),
        setItem: mockSetItem,
      },
      writable: true,
    });

    render(<NotesWidget />);

    // Open panel and type - should not throw
    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    fireEvent.click(trigger);

    waitFor(() => {
      const textarea = screen.getByDisplayValue(/type your notes/i);
      fireEvent.change(textarea, { target: { value: "Test" } });
    });

    // Should not crash despite localStorage error
    expect(mockSetItem).toHaveBeenCalled();
  });

  test("panel has proper accessibility attributes", async () => {
    render(<NotesWidget />);

    const trigger = screen.getByRole("button", { name: /toggle notes/i });
    expect(trigger).toHaveAttribute("aria-label", "Toggle notes");

    // Open panel
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /clear notes/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /close notes/i })
      ).toBeInTheDocument();
    });
  });

  test("responsive design hides text on small screens", () => {
    render(<NotesWidget />);

    // Should show text on larger screens
    expect(screen.getByText("Notes")).toBeInTheDocument();

    // The "hidden sm:inline" class should hide on smaller screens
    // This is tested via CSS classes, not via JS testing
    const textElement = screen.getByText("Notes");
    expect(textElement).toHaveClass("hidden", "sm:inline");
  });
});
