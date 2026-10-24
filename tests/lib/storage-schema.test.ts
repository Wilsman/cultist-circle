import { beforeEach, describe, expect, it } from "vitest";
import {
  ensureStorageSchema,
  LEGACY_APP_VERSION_KEY,
  STORAGE_SCHEMA_KEY,
} from "@/lib/storage-schema";

const PRESERVED = new Set(["cookieConsent", "gameMode"]);

describe("ensureStorageSchema", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("leaves storage alone when the schema is current", () => {
    localStorage.setItem(STORAGE_SCHEMA_KEY, "1");
    localStorage.setItem("selectedItemIds", "[1,2]");

    expect(ensureStorageSchema(localStorage, 1, PRESERVED)).toBe("current");
    expect(localStorage.getItem("selectedItemIds")).toBe("[1,2]");
  });

  it("migrates visitors from the last legacy version without wiping", () => {
    localStorage.setItem(LEGACY_APP_VERSION_KEY, "2.1.2");
    localStorage.setItem("selectedItemIds", "[1,2]");

    expect(ensureStorageSchema(localStorage, 1, PRESERVED)).toBe("migrated");
    expect(localStorage.getItem("selectedItemIds")).toBe("[1,2]");
    expect(localStorage.getItem(STORAGE_SCHEMA_KEY)).toBe("1");
    expect(localStorage.getItem(LEGACY_APP_VERSION_KEY)).toBeNull();
  });

  it("marks fresh visitors as current without a reset", () => {
    expect(ensureStorageSchema(localStorage, 1, PRESERVED)).toBe("migrated");
    expect(localStorage.getItem(STORAGE_SCHEMA_KEY)).toBe("1");
  });

  it("clears non-preserved data for older legacy versions", () => {
    localStorage.setItem(LEGACY_APP_VERSION_KEY, "2.0.1");
    localStorage.setItem("selectedItemIds", "[1,2]");
    localStorage.setItem("cookieConsent", "true");

    expect(ensureStorageSchema(localStorage, 1, PRESERVED)).toBe("reset");
    expect(localStorage.getItem("selectedItemIds")).toBeNull();
    expect(localStorage.getItem(LEGACY_APP_VERSION_KEY)).toBeNull();
    expect(localStorage.getItem("cookieConsent")).toBe("true");
    expect(localStorage.getItem(STORAGE_SCHEMA_KEY)).toBe("1");
  });

  it("clears non-preserved data when the schema is bumped", () => {
    localStorage.setItem(STORAGE_SCHEMA_KEY, "1");
    localStorage.setItem("selectedItemIds", "[1,2]");
    localStorage.setItem("gameMode", "pve");

    expect(ensureStorageSchema(localStorage, 2, PRESERVED)).toBe("reset");
    expect(localStorage.getItem("selectedItemIds")).toBeNull();
    expect(localStorage.getItem("gameMode")).toBe("pve");
    expect(localStorage.getItem(STORAGE_SCHEMA_KEY)).toBe("2");
  });
});
