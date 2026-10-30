import { describe, expect, test } from "vitest";
import { detectBrowserLanguage } from "@/contexts/language-context";

describe("detectBrowserLanguage", () => {
  test("maps a regional browser language to the supported base language", () => {
    expect(detectBrowserLanguage(["pt-BR", "en-US"])).toBe("pt");
    expect(detectBrowserLanguage(["ru-RU"])).toBe("ru");
  });

  test("skips unsupported languages and uses the next preference", () => {
    expect(detectBrowserLanguage(["nl-NL", "de-DE"])).toBe("de");
  });

  test("returns null when no browser language is supported", () => {
    expect(detectBrowserLanguage(["nl-NL", "sv"])).toBeNull();
    expect(detectBrowserLanguage([])).toBeNull();
  });
});
