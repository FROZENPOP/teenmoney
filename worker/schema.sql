CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  class_code    TEXT,
  study_group   TEXT NOT NULL CHECK (study_group IN ('play','read')),
  quiz_before   TEXT NOT NULL,   -- JSON array
  quiz_after    TEXT NOT NULL,   -- JSON array
  ending        TEXT,
  final_cash    INTEGER,
  final_savings INTEGER,
  final_mood    INTEGER,
  choices       TEXT,            -- JSON array
  locks         TEXT             -- JSON array
);
