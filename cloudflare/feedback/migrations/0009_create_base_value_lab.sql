-- Base Value Lab: items whose true base value is being measured, and the
-- cultist circle tests that measure them. Subjects come from the owner's
-- sync script; tests come from the owner or from the hidden contribute page.
CREATE TABLE base_value_subjects (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('pvp', 'pve')),
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE base_value_tests (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('pvp', 'pve')),
  -- The test in the lab's LabTest shape (entries, fillers, timer, ...).
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  source TEXT NOT NULL CHECK (source IN ('owner', 'contributor')),
  contributor TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX base_value_tests_created_at ON base_value_tests (created_at);
