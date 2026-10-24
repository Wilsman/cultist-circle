export const STORAGE_SCHEMA_KEY = "storageSchemaVersion";

// Before STORAGE_SCHEMA_VERSION existed, any change to the display version
// ("appVersion" in localStorage) wiped storage. Visitors already on the last
// of those versions have current data and are migrated without a wipe.
export const LEGACY_APP_VERSION_KEY = "appVersion";
const LAST_LEGACY_APP_VERSION = "2.1.2";

export type StorageSchemaResult = "current" | "migrated" | "reset";

/**
 * Makes sure localStorage matches the current storage schema. Returns
 * "reset" when it cleared stale data, in which case the caller should reload.
 */
export function ensureStorageSchema(
  storage: Storage,
  schemaVersion: number,
  preservedKeys: ReadonlySet<string>,
): StorageSchemaResult {
  const current = String(schemaVersion);
  const stored = storage.getItem(STORAGE_SCHEMA_KEY);
  if (stored === current) return "current";

  const legacyVersion = storage.getItem(LEGACY_APP_VERSION_KEY);
  const isFreshOrLegacyCurrent =
    stored === null &&
    (legacyVersion === null || legacyVersion === LAST_LEGACY_APP_VERSION);

  if (isFreshOrLegacyCurrent) {
    storage.setItem(STORAGE_SCHEMA_KEY, current);
    storage.removeItem(LEGACY_APP_VERSION_KEY);
    return "migrated";
  }

  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
  for (const key of keys) {
    if (key !== null && !preservedKeys.has(key)) storage.removeItem(key);
  }
  storage.setItem(STORAGE_SCHEMA_KEY, current);
  return "reset";
}
