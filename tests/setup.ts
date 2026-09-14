import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, beforeEach, vi } from "vitest";

// next/navigation hooks require a mounted App Router, which does not exist
// in jsdom. Mock them globally so component trees using useRouter (e.g.
// toast actions navigating to /tracker) can render in tests.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Create a proper localStorage mock that works in all environments
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

// Set up localStorage mock
Object.defineProperty(globalThis, "localStorage", {
  value: createLocalStorageMock(),
  writable: true,
});

// Ensure clean state per test
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
