import type { DatabaseSync } from "sqlite";

export const version = 2;

export function up(db: DatabaseSync) {
  // Create a new table with the primary key constraint
  db.exec(`
    CREATE TABLE changes_new (
      id TEXT,
      changes TEXT,
      timestamp TEXT,
      type TEXT,
      PRIMARY KEY (id, timestamp)
    )
  `);

  // Copy data from the old table to the new table
  db.exec(`
    INSERT INTO changes_new (id, changes, timestamp, type)
      SELECT id, changes, timestamp, 'changed'
      FROM changes
  `);

  // Drop the old table and rename the new table
  db.exec(`DROP TABLE changes`);
  db.exec(`ALTER TABLE changes_new RENAME TO changes`);
}
