import { Database } from "bun:sqlite";

interface Migration {
  version: number;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          data TEXT,
          timestamp TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS changes (
          id TEXT,
          changes TEXT,
          timestamp TEXT
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY
        )
      `);
    },
  },
  {
    version: 2,
    up: (db: Database) => {
      // Create a new table with the primary key constraint
      db.run(`
        CREATE TABLE changes_new (
          id TEXT,
          changes TEXT,
          timestamp TEXT,
          type TEXT,
          PRIMARY KEY (id, timestamp)
        )
      `);

      // Copy data from the old table to the new table
      db.run(`
        INSERT INTO changes_new (id, changes, timestamp, type)
          SELECT id, changes, timestamp, "changed"
          FROM changes
      `);

      // Drop the old table and rename the new table
      db.run(`DROP TABLE changes`);
      db.run(`ALTER TABLE changes_new RENAME TO changes`);
    },
    // Add more migrations here
  },
];

export default migrations;
