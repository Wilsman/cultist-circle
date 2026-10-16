import type { TraderLevels } from "@/components/ui/trader-level-selector";

// Avatars for trader vendors, keyed by tarkov.dev normalizedName
export const TRADER_AVATARS: Record<keyof TraderLevels, string> = {
  prapor: "https://assets.tarkov.dev/54cb50c76803fa8b248b4571.webp",
  therapist: "https://assets.tarkov.dev/54cb57776803fa99248b456e.webp",
  skier: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
  peacekeeper: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
  mechanic: "https://assets.tarkov.dev/5a7c2eca46aef81a7ca2145d.webp",
  ragman: "https://assets.tarkov.dev/5ac3b934156ae10c4430e83c.webp",
  jaeger: "https://assets.tarkov.dev/5c0647fdd443bc2504c2d371.webp",
};

export function getTraderAvatar(normalizedName: string): string | undefined {
  return TRADER_AVATARS[normalizedName as keyof TraderLevels];
}
