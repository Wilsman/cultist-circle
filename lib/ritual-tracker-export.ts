import { z } from "zod";
import { mergeRituals } from "@/lib/ritual-tracker-db";
import type { RitualRecord, TrackerBackup } from "@/types/ritual-tracker";
import { RITUAL_TRACKER_SCHEMA_VERSION } from "@/types/ritual-tracker";

const trackedItemSchema = z.object({
  key: z.string().min(1),
  itemId: z.string().nullable(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  iconLink: z.string().optional(),
  quantity: z.number().int().positive(),
  basePrice: z.number().nonnegative().nullable(),
  lastLowPrice: z.number().nonnegative().nullable(),
  avg24hPrice: z.number().nonnegative().nullable(),
  traderSellPrice: z.number().nonnegative().nullable(),
  inputPrice: z.number().nonnegative().nullable(),
  isManual: z.boolean(),
});

const ritualSchema = z.object({
  schemaVersion: z.literal(RITUAL_TRACKER_SCHEMA_VERSION),
  id: z.string().min(1),
  mode: z.enum(["pvp", "pve", "season"]),
  status: z.enum(["active", "completed", "cancelled"]),
  startedAt: z.number().int().nonnegative(),
  endsAt: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  completedAt: z.number().int().nonnegative().nullable(),
  cancelledAt: z.number().int().nonnegative().nullable(),
  notificationSentAt: z.number().int().nonnegative().nullable(),
  sacredBonus: z.number().nonnegative(),
  inputPriceSource: z.enum(["lastLowPrice", "avg24hPrice", "trader", "manual"]),
  sacrifices: z.array(trackedItemSchema).min(1),
  rewards: z.array(trackedItemSchema),
  totals: z.object({
    baseValue: z.number().nonnegative(),
    inputCost: z.number().nonnegative().nullable(),
    rewardFleaValue: z.number().nonnegative().nullable(),
    rewardTraderValue: z.number().nonnegative().nullable(),
  }),
  notes: z.string(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

const trackerBackupSchema = z.object({
  format: z.literal("cultist-circle-ritual-tracker"),
  version: z.literal(RITUAL_TRACKER_SCHEMA_VERSION),
  exportedAt: z.string(),
  rituals: z.array(ritualSchema),
});

export function createTrackerBackup(rituals: RitualRecord[]): TrackerBackup {
  return {
    format: "cultist-circle-ritual-tracker",
    version: RITUAL_TRACKER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    rituals,
  };
}

export function parseTrackerBackup(value: unknown): TrackerBackup {
  return trackerBackupSchema.parse(value) as TrackerBackup;
}

export async function importTrackerBackup(value: unknown): Promise<number> {
  const backup = parseTrackerBackup(value);
  await mergeRituals(backup.rituals);
  return backup.rituals.length;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadTrackerJson(rituals: RitualRecord[]): void {
  const backup = createTrackerBackup(rituals);
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    `cultist-circle-rituals-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function createTrackerCsv(rituals: RitualRecord[]): string {
  const headers = [
    "ID",
    "Mode",
    "Status",
    "Started",
    "Completed",
    "Duration Minutes",
    "Sacrifices",
    "Rewards",
    "Base Value",
    "Input Cost",
    "Reward Flea Value",
    "Reward Trader Value",
    "Sacred Bonus",
    "Notes",
  ];
  const rows = rituals.map((ritual) => [
    ritual.id,
    ritual.mode,
    ritual.status,
    new Date(ritual.startedAt).toISOString(),
    ritual.completedAt ? new Date(ritual.completedAt).toISOString() : "",
    ritual.durationMinutes,
    ritual.sacrifices
      .map((item) => `${item.quantity}x ${item.name}`)
      .join("; "),
    ritual.rewards.map((item) => `${item.quantity}x ${item.name}`).join("; "),
    ritual.totals.baseValue,
    ritual.totals.inputCost,
    ritual.totals.rewardFleaValue,
    ritual.totals.rewardTraderValue,
    ritual.sacredBonus,
    ritual.notes,
  ]);
  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

export function downloadTrackerCsv(rituals: RitualRecord[]): void {
  downloadBlob(
    new Blob([createTrackerCsv(rituals)], { type: "text/csv;charset=utf-8" }),
    `cultist-circle-rituals-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

function toIcsDate(timestamp: number): string {
  return new Date(timestamp)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export function createRitualCalendar(ritual: RitualRecord): string {
  const summary = `Cultist Circle ${ritual.mode.toUpperCase()} ritual ready`;
  const description = ritual.sacrifices
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cultist Circle//Ritual Tracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${ritual.id}@cultistcircle.com`,
    `DTSTAMP:${toIcsDate(Date.now())}`,
    `DTSTART:${toIcsDate(ritual.endsAt)}`,
    `DTEND:${toIcsDate(ritual.endsAt + 15 * 60_000)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    "DESCRIPTION:Cultist Circle ritual is ready",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadRitualCalendar(ritual: RitualRecord): void {
  downloadBlob(
    new Blob([createRitualCalendar(ritual)], {
      type: "text/calendar;charset=utf-8",
    }),
    `cultist-circle-${ritual.mode}-${new Date(ritual.endsAt)
      .toISOString()
      .slice(0, 10)}.ics`,
  );
}
