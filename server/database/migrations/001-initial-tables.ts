import type { DatabaseSync } from "sqlite";

export const version = 1;

export function up(db: DatabaseSync) {
  // Create core tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      data TEXT,
      timestamp TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS changes (
      id TEXT,
      changes TEXT,
      timestamp TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY
    )
  `);
}
