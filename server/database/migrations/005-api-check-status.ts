import type { DatabaseSync } from "sqlite";

export const version = 5;

export function up(db: DatabaseSync) {
  // Create column to store last API check result status
  db.exec(`
    ALTER TABLE last_api_check
      ADD last_status TEXT
  `);
}
