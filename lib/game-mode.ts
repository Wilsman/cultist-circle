export const GAME_MODES = ["pvp", "pve", "season"] as const;

export type GameMode = (typeof GAME_MODES)[number];
export type TarkovJsonGameMode = "regular" | "pve" | "pvp-season";
export type TarkovGraphqlGameMode = Exclude<TarkovJsonGameMode, "pvp-season">;

export const GAME_MODE_STORAGE_KEY = "gameMode";
export const LEGACY_PVE_STORAGE_KEY = "isPVE";

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  pvp: "PVP",
  pve: "PVE",
  season: "Season",
};

const JSON_GAME_MODES: Record<GameMode, TarkovJsonGameMode> = {
  pvp: "regular",
  pve: "pve",
  season: "pvp-season",
};

export function isGameMode(value: string | null): value is GameMode {
  return GAME_MODES.includes(value as GameMode);
}

export function getStoredGameMode(storage: Pick<Storage, "getItem">): GameMode {
  const storedMode = storage.getItem(GAME_MODE_STORAGE_KEY);
  if (isGameMode(storedMode)) return storedMode;

  return storage.getItem(LEGACY_PVE_STORAGE_KEY) === "true" ? "pve" : "pvp";
}

export function toTarkovJsonGameMode(mode: GameMode): TarkovJsonGameMode {
  return JSON_GAME_MODES[mode];
}

export function fromTarkovJsonGameMode(mode: TarkovJsonGameMode): GameMode {
  if (mode === "pve") return "pve";
  if (mode === "pvp-season") return "season";
  return "pvp";
}
