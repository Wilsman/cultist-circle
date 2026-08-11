import Dexie, { type Table } from "dexie";
import type { GameMode } from "@/lib/game-mode";
import type { RitualRecord } from "@/types/ritual-tracker";

const DATABASE_NAME = "cultist-circle-ritual-tracker";

class RitualTrackerDatabase extends Dexie {
  rituals!: Table<RitualRecord, string>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      rituals:
        "id, mode, status, startedAt, endsAt, completedAt, [mode+status]",
    });
  }
}

export const ritualTrackerDb = new RitualTrackerDatabase();

export class ActiveRitualExistsError extends Error {
  constructor(public readonly ritual: RitualRecord) {
    super(`An active ${ritual.mode} ritual already exists.`);
    this.name = "ActiveRitualExistsError";
  }
}

export async function startRitual(record: RitualRecord): Promise<void> {
  await ritualTrackerDb.transaction("rw", ritualTrackerDb.rituals, async () => {
    const active = await ritualTrackerDb.rituals
      .where("[mode+status]")
      .equals([record.mode, "active"])
      .first();
    if (active) throw new ActiveRitualExistsError(active);
    await ritualTrackerDb.rituals.add(record);
  });
}

export async function getRitual(id: string): Promise<RitualRecord | undefined> {
  return ritualTrackerDb.rituals.get(id);
}

export async function getActiveRituals(): Promise<RitualRecord[]> {
  return ritualTrackerDb.rituals
    .where("status")
    .equals("active")
    .sortBy("endsAt");
}

export async function getActiveRitualForMode(
  mode: GameMode,
): Promise<RitualRecord | undefined> {
  return ritualTrackerDb.rituals
    .where("[mode+status]")
    .equals([mode, "active"])
    .first();
}

export async function listRituals(): Promise<RitualRecord[]> {
  const records = await ritualTrackerDb.rituals.toArray();
  return records.sort((a, b) => b.startedAt - a.startedAt);
}

export async function updateRitual(
  id: string,
  updates: Partial<RitualRecord>,
): Promise<void> {
  await ritualTrackerDb.rituals.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteRitual(id: string): Promise<void> {
  await ritualTrackerDb.rituals.delete(id);
}

export async function mergeRituals(records: RitualRecord[]): Promise<void> {
  await ritualTrackerDb.transaction("rw", ritualTrackerDb.rituals, async () => {
    for (const record of records) {
      if (record.status === "active") {
        const existing = await ritualTrackerDb.rituals
          .where("[mode+status]")
          .equals([record.mode, "active"])
          .first();
        if (existing && existing.id !== record.id) {
          throw new ActiveRitualExistsError(existing);
        }
      }
    }
    await ritualTrackerDb.rituals.bulkPut(records);
  });
}

export async function clearRitualHistory(): Promise<void> {
  await ritualTrackerDb.rituals.clear();
}

export async function deleteTrackerDatabaseForTests(): Promise<void> {
  ritualTrackerDb.close();
  await Dexie.delete(DATABASE_NAME);
  ritualTrackerDb.open();
}
