import { describe, expect, it } from "vitest";

import {
  advanceKonamiBuffer,
  isEditableTarget,
  KONAMI_SEQUENCE,
} from "@/lib/konami-code";

describe("Konami code helpers", () => {
  it("matches the complete sequence case-insensitively", () => {
    let buffer: string[] = [];
    let matched = false;

    [...KONAMI_SEQUENCE.slice(0, -2), "B", "A"].forEach((key) => {
      const result = advanceKonamiBuffer(buffer, key);
      buffer = result.buffer;
      matched = result.matched;
    });

    expect(matched).toBe(true);
    expect(buffer).toEqual([]);
  });

  it("recovers from wrong and overlapping input", () => {
    let buffer: string[] = [];
    let matched = false;
    const keys = ["x", "ArrowUp", ...KONAMI_SEQUENCE];

    keys.forEach((key) => {
      const result = advanceKonamiBuffer(buffer, key);
      buffer = result.buffer;
      matched ||= result.matched;
    });

    expect(matched).toBe(true);
  });

  it("recognizes editable targets", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.contentEditable = "true";

    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
  });
});
