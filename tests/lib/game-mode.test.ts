import { describe, expect, test } from "vitest";
import {
  fromTarkovJsonGameMode,
  getStoredGameMode,
  toTarkovJsonGameMode,
} from "@/lib/game-mode";

function storage(values: Record<string, string>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

describe("game mode", () => {
  test("maps UI modes to their JSON endpoints", () => {
    expect(toTarkovJsonGameMode("pvp")).toBe("regular");
    expect(toTarkovJsonGameMode("pve")).toBe("pve");
    expect(toTarkovJsonGameMode("season")).toBe("pvp-season");
    expect(fromTarkovJsonGameMode("pvp-season")).toBe("season");
  });

  test("restores valid persisted modes", () => {
    expect(getStoredGameMode(storage({ gameMode: "season" }))).toBe("season");
    expect(getStoredGameMode(storage({ gameMode: "pve" }))).toBe("pve");
  });

  test("migrates the legacy PVE boolean and defaults invalid values to PVP", () => {
    expect(getStoredGameMode(storage({ isPVE: "true" }))).toBe("pve");
    expect(
      getStoredGameMode(storage({ gameMode: "invalid", isPVE: "false" })),
    ).toBe("pvp");
  });
});
