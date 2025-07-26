import type { DatabaseSync } from "sqlite";

export const version = 4;

export function up(db: DatabaseSync) {
  // Create table to store last API check timestamp
  db.exec(`
    CREATE TABLE IF NOT EXISTS last_api_check (
      id INTEGER PRIMARY KEY,
      last_check TEXT NOT NULL
    )
  `);
}
